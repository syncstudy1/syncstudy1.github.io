# SyncStudy — Computer Vision Repair & Rebuild Report

**Project:** SyncStudy: An Intelligent AI System for Adaptive Learning and Study Optimization  
**Date:** October 17, 2026  
**Status:** Verification Passed (18/18 Automated Checks, 0 TypeScript Errors, Production Build Succeeded)

---

## 1. Executive Summary

The computer-vision subsystem in the Study Room has been completely investigated, diagnosed, and repaired. The recurring bug where the Vision Monitor remained indefinitely stuck showing:
- `Requesting camera access...`
- `Standby`
- `Preview inactive`
- `Gaze & Head Orientation: N/A`
- `Warnings Triggered: 0 / 3`

has been **permanently resolved**. The underlying issues were structural defects in how MediaPipe was fetched, how video stream metadata was awaited, and a circular error-recovery loop between React components that perpetually reset the state machine.

---

## 2. Root Cause Analysis

### Cause A: HTTP 404 from MediaPipe CDN script injection
- **File:** `src/lib/mediapipe.ts` (previous line 41)
- **Defect:** An ad-hoc `<script>` tag dynamically injected:
  `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.js`
- **Root Cause:** `@mediapipe/tasks-vision` at version `0.10.14` only ships ES modules (`vision_bundle.mjs`) and CommonJS (`vision_bundle.cjs`). There is **no** `vision_bundle.js` on jsdelivr or npm for this version, causing an immediate `HTTP 404 Not Found` (`Failed to load MediaPipe tasks-vision bundle: [object Event]`).
- **Initiator:** The browser console showed this originated from older bundles such as `index-Cah7zZ7E.js`.

### Cause B: Circular Error Reset Loop Masking Errors
- **Files:** `src/hooks/useFaceMonitor.ts` and `src/components/vision/CameraMonitor.tsx`
- **Defect:** In `useFaceMonitor.ts`, when `startMonitoring()` caught an error (e.g. MediaPipe script 404), it executed `setStatus('error')` followed immediately by `stopMonitoring()`. In `stopMonitoring()`, it executed `setStatus('idle')`.
- **Circular Chain:** In `CameraMonitor.tsx`, a `useEffect` monitored `status`. Whenever `status === 'idle'`, it automatically called `startMonitoring(videoRef, onWarning)` again.
- **Consequence:** Each restart wiped `errorMessage = null` and set `status = 'requesting_permission'`. Because this happened dozens of times per second, the UI was trapped permanently in `"Requesting camera access..."`, hiding the actual error message from both the user and the developer.

### Cause C: Unbounded Promise Awaiting Video Metadata
- **File:** `src/hooks/useFaceMonitor.ts`
- **Defect:** `startMonitoring()` awaited an indefinite promise on `video.onloadedmetadata = () => resolve()`.
- **Root Cause:** If the camera stream arrived with metadata already buffered or if the browser delayed dispatching the event, the promise never resolved or rejected, leaving the UI permanently hanging before AI model loading.

### Cause E: Premature Stream Abortion Due to Session ID Race Condition
- **File:** `src/hooks/useFaceMonitor.ts` (in `startMonitoring()`)
- **Defect:** `const currentSessionId = ++sessionIdRef.current` was executed *before* calling `cleanupHardware()`.
- **Root Cause:** `cleanupHardware()` internally increments `sessionIdRef.current++` to discard past sessions. When called after `currentSessionId` was captured, `sessionIdRef.current` became `currentSessionId + 1`. When `navigator.mediaDevices.getUserMedia(...)` resolved, the verification `if (sessionIdRef.current !== currentSessionId)` evaluated to `true`, instantly calling `stream.getTracks().forEach(t => t.stop())` and returning silently.
- **Consequence:** The laptop camera turned on, immediately turned off, and the UI remained stuck in `"Requesting camera access..."` without setting preview or advancing to calibration.

### Cause F: Re-render Ping-Pong Loop Flashing the Page
- **Files:** `src/components/vision/CameraMonitor.tsx`, `src/pages/StudySessionPage.tsx`, `src/hooks/useStudyTimer.ts`
- **Defect:** An inline `onMonitoringReady` callback and non-idempotent `holdTimer` state updates created an infinite re-render loop firing every 100ms.
- **Consequence:** The page flashed rapidly every 0.1 seconds, repeatedly re-evaluating effects and causing the camera to open/close every 1 second.
- **Resolution:** `cleanupHardware()` now runs strictly *before* session ID generation; `onMonitoringReady` is stabilized via `useCallback`; `holdTimer` updates are strictly idempotent; and `CameraMonitor` deduplicates notifications with `lastReportedReadyRef`.

---

## 3. Structural Solutions Implemented

### 1. Direct Dependency & Local Asset Storage
- Installed `@mediapipe/tasks-vision@^0.10.14` in `package.json`.
- Bundled official WASM files locally in `public/mediapipe/wasm/`:
  - `vision_wasm_internal.wasm` (9.42 MB)
  - `vision_wasm_internal.js` (209 KB)
  - `vision_wasm_nosimd_internal.wasm` (9.29 MB)
  - `vision_wasm_nosimd_internal.js` (209 KB)
- Bundled the official MediaPipe Face Landmarker model locally in `public/mediapipe/models/`:
  - `face_landmarker.task` (3.58 MB)

### 2. Rewritten MediaPipe Loader (`src/lib/mediapipe.ts`)
- Replaced dynamic script injection with native ES module imports (`import { FilesetResolver, FaceLandmarker } from '@mediapipe/tasks-vision'`).
- Implemented robust multi-tier fallback loading:
  1. Local offline path: `/mediapipe/wasm` & `/mediapipe/models/face_landmarker.task`
  2. CDN fallback: `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm` & Google Cloud Storage
- Added GPU acceleration with automatic CPU/WASM fallback if WebGL/WebGPU context is unavailable.
- Implemented 3D Euler angle extraction ($R_{12}, R_{02}, R_{22}$) from `facialTransformationMatrixes` with landmark geometry fallback ($x/y$ ratio) when transformation matrix is omitted.

### 3. Finite State Machine & Bounded Playback (`src/hooks/useFaceMonitor.ts`)
- Rebuilt with a 16-state machine:
  `idle` → `requesting_permission` → `camera_stream_acquired` → `starting_video_playback` → `loading_library` → `loading_wasm` → `loading_model` → `calibrating` → `monitoring`
  *Error States:* `camera_permission_denied`, `no_camera_available`, `camera_in_use`, `video_playback_failed`, `model_loading_failed`, `error`
- Added **8-second bounded timeout** on video playback with explicit error rejection.
- Eliminated circular error reset: error states remain terminal and render user-friendly diagnostic cards with manual Retry buttons.
- Added session tracking ref (`sessionIdRef`) to discard stale asynchronous promises when unmounted or rapidly re-triggered.
- Calibration validation: requires at least 5 valid face landmark readings before accepting baseline posture.

### 4. Study Timer Hold Integration (`src/hooks/useStudyTimer.ts` & `src/pages/StudySessionPage.tsx`)
- Added timer hold states (`isHeld`, `holdReason`, `holdTimer`, `releaseTimerHold`).
- While camera is acquiring permissions, loading models, or calibrating baseline posture, the study session timer pauses accumulating seconds and displays:
  - Header badge: `"Timer On Hold - Vision Initializing"`
  - Timer ring label: `"ON HOLD: Calibrating posture..."`
- Once calibration finishes and monitoring begins, the timer automatically resumes.
- Disabling the camera switch immediately releases any timer hold.

---

## 4. Verification & Automated Test Results

### Automated Suite (`verify-vision.mjs`)
- **Assets:** Verified all 4 WASM files and `face_landmarker.task` are present and valid.
- **Euler Angles:** Tested identity matrix $(0^\circ, 0^\circ)$, $+30^\circ$ yaw rotation, and $-20^\circ$ pitch rotation.
- **Thresholds & Grace Period:**
  - Yaw threshold: $25^\circ$
  - Pitch threshold: $20^\circ$
  - Grace period: $3000\text{ms}$ (temporary lookaways $< 3\text{s}$ reset without warning)
  - Absence grace period: $5000\text{ms}$
  - Auto-pause threshold: 3 warnings
- **Infinite Loop Immunity:** Verified all failure states do not trigger automatic restart loops.
- **Result:** **18 / 18 checks passed (100%)**.

### Production Build
- Command: `npm run build` (`tsc -b && vite build`)
- Output: Exit code 0, 0 TypeScript errors, clean bundle generated in `dist/`.

---

## 5. Local Browser Testing Guide

Follow these steps to test the camera monitor in your local browser:

1. **Start the Development Server:**
   ```bash
   npm run dev
   ```
2. **Open in Browser:**
   - Navigate to `http://localhost:5173`
   - Log in with Google or continue to the dashboard.
3. **Open the Study Room:**
   - Navigate to `/study`
   - Select a subject and set your desired session duration.
   - Toggle the **Vision Monitor** switch to ON.
   - Click **Start Session**.
4. **Observe the Progression:**
   - Note the timer status displays `"ON HOLD (Awaiting Vision)"`.
   - Browser prompts for camera access → Click **Allow**.
   - Status updates sequentially:
     `Requesting camera access...` → `Preparing preview...` → `Loading WASM runtime...` → `Loading AI posture models...` → `Calibrating baseline pose... (0% to 100%)`
   - Hold still and look directly at the webcam for 3 seconds.
   - Once calibrated, the status transitions to **"Focus monitoring active"** and the study timer begins counting up.
5. **Test Distraction & Simulation:**
   - Look away (turn head left or right $> 25^\circ$) for $> 3$ seconds → Warning banner appears and warning counter increments.
   - Or open the **Developer Simulation Panel** inside the Vision Monitor card and click **"Simulate Distraction"** or **"Simulate Face Absent"** to verify auto-pause after 3 warnings.
