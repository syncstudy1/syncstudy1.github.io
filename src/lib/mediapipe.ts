import { FilesetResolver, FaceLandmarker, type FaceLandmarkerResult } from '@mediapipe/tasks-vision'

export interface HeadAngles {
  yaw: number   // left (-) / right (+) in degrees
  pitch: number // up (-) / down (+) in degrees
}

export type { FaceLandmarkerResult, FaceLandmarker }

// Local static assets served by Vite / Netlify with CDN fallback
const LOCAL_WASM_PATH = '/mediapipe/wasm'
const CDN_WASM_PATH = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'

const LOCAL_MODEL_PATH = '/mediapipe/models/face_landmarker.task'
const CDN_MODEL_PATH = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'

let cachedLandmarker: FaceLandmarker | null = null
let loadingPromise: Promise<FaceLandmarker> | null = null

export type VisionLoadingStage = 'loading_library' | 'loading_wasm' | 'loading_model'

/**
 * Loads and initializes the face landmark monitor.
 * - Imports the official @mediapipe/tasks-vision package directly.
 * - Resolves WASM from local assets first, with fallback to pinned CDN.
 * - Resolves model from local assets first, with fallback to Google Cloud Storage.
 * - Attempts GPU delegate first; falls back gracefully to CPU delegate if GPU is unavailable.
 * - Reuses the cached singleton instance to prevent duplicate resource downloads.
 */
export async function loadFaceLandmarker(
  onProgress?: (stage: VisionLoadingStage) => void
): Promise<FaceLandmarker> {
  if (cachedLandmarker) {
    return cachedLandmarker
  }

  if (loadingPromise) {
    return loadingPromise
  }

  loadingPromise = (async () => {
    onProgress?.('loading_wasm')
    console.log('[SyncStudy Vision] Initializing focus monitor...')

    let wasmFileset: Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>

    // Try local WASM path first
    try {
      wasmFileset = await FilesetResolver.forVisionTasks(LOCAL_WASM_PATH)
      console.log('[SyncStudy Vision] Loaded WASM fileset from local path.')
    } catch (localWasmErr) {
      console.warn('[SyncStudy Vision] Local WASM path failed, attempting CDN fallback:', localWasmErr)
      try {
        wasmFileset = await FilesetResolver.forVisionTasks(CDN_WASM_PATH)
        console.log('[SyncStudy Vision] Loaded WASM fileset from CDN.')
      } catch (cdnWasmErr) {
        console.error('[SyncStudy Vision] Failed to load WASM fileset from both local and CDN:', cdnWasmErr)
        throw new Error(
          `Failed to load the focus monitoring runtime. Please check your internet connection and try again.`
        )
      }
    }

    onProgress?.('loading_model')
    console.log('[SyncStudy Vision] Loading FaceLandmarker model asset...')

    // Attempt GPU first, then CPU fallback
    const modelPathsToTry = [LOCAL_MODEL_PATH, CDN_MODEL_PATH]
    let lastError: unknown = null

    for (const modelAssetPath of modelPathsToTry) {
      // 1. Try GPU delegate
      try {
        console.log(`[SyncStudy Vision] Attempting GPU initialization with: ${modelAssetPath}`)
        const landmarker = await FaceLandmarker.createFromOptions(wasmFileset, {
          baseOptions: {
            modelAssetPath,
            delegate: 'GPU',
          },
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true,
          runningMode: 'VIDEO',
          numFaces: 1,
        })

        console.log('[SyncStudy Vision] FaceLandmarker initialized with GPU delegate.')
        cachedLandmarker = landmarker
        return landmarker
      } catch (gpuErr) {
        console.warn(`[SyncStudy Vision] GPU delegate failed for ${modelAssetPath}, trying CPU fallback:`, gpuErr)
        lastError = gpuErr
      }

      // 2. Try CPU delegate
      try {
        console.log(`[SyncStudy Vision] Attempting CPU initialization with: ${modelAssetPath}`)
        const landmarker = await FaceLandmarker.createFromOptions(wasmFileset, {
          baseOptions: {
            modelAssetPath,
            delegate: 'CPU',
          },
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true,
          runningMode: 'VIDEO',
          numFaces: 1,
        })

        console.log('[SyncStudy Vision] FaceLandmarker initialized with CPU delegate.')
        cachedLandmarker = landmarker
        return landmarker
      } catch (cpuErr) {
        console.warn(`[SyncStudy Vision] CPU delegate also failed for ${modelAssetPath}:`, cpuErr)
        lastError = cpuErr
      }
    }

    // Both paths failed
    cachedLandmarker = null
    const errMessage =
      lastError instanceof Error ? lastError.message : String(lastError || 'Unknown model loading failure')
    throw new Error(`Focus monitoring could not be initialized: ${errMessage}`)
  })().finally(() => {
    loadingPromise = null
  })

  return loadingPromise
}

/**
 * Releases cached FaceLandmarker instance when necessary.
 */
export function releaseFaceLandmarker(): void {
  if (cachedLandmarker) {
    try {
      cachedLandmarker.close()
    } catch (e) {
      console.warn('[SyncStudy Vision] Error closing FaceLandmarker:', e)
    }
    cachedLandmarker = null
  }
  loadingPromise = null
}

/**
 * Extracts yaw and pitch (in degrees) from FaceLandmarkerResult.
 *
 * Coordinates:
 * - Yaw: looking right (+) / looking left (-)
 * - Pitch: looking down (+) / looking up (-)
 *
 * Returns null if no face is detected in the frame.
 */
export function extractHeadAngles(result: FaceLandmarkerResult): HeadAngles | null {
  if (!result) return null

  const hasLandmarks = !!(result.faceLandmarks && result.faceLandmarks.length > 0)
  const hasMatrix = !!(
    result.facialTransformationMatrixes &&
    result.facialTransformationMatrixes.length > 0 &&
    result.facialTransformationMatrixes[0]
  )

  if (!hasLandmarks && !hasMatrix) {
    return null
  }

  // 1. Primary Method: 4x4 Transformation Matrix
  if (hasMatrix) {
    const rawMatrix = result.facialTransformationMatrixes![0]
    const matrixData: number[] = Array.isArray(rawMatrix)
      ? rawMatrix
      : (rawMatrix as any).data
      ? Array.from((rawMatrix as any).data)
      : []

    if (matrixData.length >= 12) {
      // Column-major 4x4 matrix from the face landmark monitor:
      // [m0, m4, m8,  m12]
      // [m1, m5, m9,  m13]
      // [m2, m6, m10, m14]
      // [m3, m7, m11, m15]
      const r02 = matrixData[8]  // m8
      const r12 = matrixData[9]  // m9
      const r22 = matrixData[10] // m10

      // Pitch (X-rotation)
      const pitchRad = Math.asin(Math.max(-1, Math.min(1, -r12)))
      // Yaw (Y-rotation)
      const yawRad = Math.atan2(r02, r22)

      const pitchDeg = Math.round((pitchRad * 180) / Math.PI)
      const yawDeg = Math.round((yawRad * 180) / Math.PI)

      if (!isNaN(pitchDeg) && !isNaN(yawDeg)) {
        return {
          yaw: Math.max(-90, Math.min(90, yawDeg)),
          pitch: Math.max(-90, Math.min(90, pitchDeg)),
        }
      }
    }
  }

  // 2. Secondary / Fallback Method: Facial Landmark Geometry
  if (hasLandmarks && result.faceLandmarks![0]) {
    const landmarks = result.faceLandmarks![0]
    if (landmarks.length >= 264) {
      const noseTip = landmarks[1]
      const leftEye = landmarks[33]
      const rightEye = landmarks[263]
      const chin = landmarks[152]
      const forehead = landmarks[10]

      const eyeCenterX = (leftEye.x + rightEye.x) / 2
      const eyeCenterY = (leftEye.y + rightEye.y) / 2
      const eyeDist = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y)

      if (eyeDist > 0.01) {
        // Yaw: nose deviation horizontally from eye center
        const yawOffset = (noseTip.x - eyeCenterX) / eyeDist
        const yawDeg = Math.round(yawOffset * 90)

        // Pitch: vertical offset of nose between forehead and chin
        const faceHeight = Math.hypot(chin.x - forehead.x, chin.y - forehead.y)
        const noseToEyeY = noseTip.y - eyeCenterY
        const pitchOffset = (noseToEyeY / (faceHeight || 0.1)) - 0.35
        const pitchDeg = Math.round(pitchOffset * 100)

        return {
          yaw: Math.max(-90, Math.min(90, yawDeg)),
          pitch: Math.max(-90, Math.min(90, pitchDeg)),
        }
      }
    }
  }

  return null
}
