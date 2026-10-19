import * as React from 'react'
import { useFaceMonitor, type FaceMonitorStatus } from '@/hooks/useFaceMonitor'
import { Button } from '@/ui/button'
import { Switch } from '@/ui/switch'
import { Progress } from '@/ui/progress'
import { Badge } from '@/ui/badge'
import {
  Camera,
  CameraOff,
  AlertTriangle,
  RotateCcw,
  Sliders,
  Sparkles,
  Lock,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Eye,
  CheckCircle2,
} from 'lucide-react'
import { Link } from 'react-router-dom'

export interface CameraMonitorProps {
  onWarning: () => void
  isSessionRunning: boolean
  isPremium: boolean
  sessionElapsedSeconds: number
  FREE_CAMERA_LIMIT_SECONDS?: number // default 600 (10 min)
  onMonitoringReady?: (isReady: boolean, reason?: string) => void
}

function getStatusLabel(status: FaceMonitorStatus, progress: number): string {
  switch (status) {
    case 'idle':
      return 'Camera inactive'
    case 'requesting_permission':
      return 'Requesting camera access...'
    case 'camera_stream_acquired':
      return 'Camera connected, preparing preview...'
    case 'starting_video_playback':
      return 'Starting video stream...'
    case 'loading_library':
      return 'Loading MediaPipe vision library...'
    case 'loading_wasm':
      return 'Loading WASM runtime...'
    case 'loading_model':
      return 'Loading AI posture models...'
    case 'calibrating':
      return `Calibrating baseline pose... (${progress}%)`
    case 'monitoring':
      return 'Focus monitoring active'
    case 'camera_permission_denied':
      return 'Camera permission denied'
    case 'no_camera_available':
      return 'No camera detected'
    case 'camera_in_use':
      return 'Camera is in use by another app'
    case 'video_playback_failed':
      return 'Video preview playback failed'
    case 'model_loading_failed':
      return 'AI vision model loading failed'
    case 'monitoring_stopped':
      return 'Vision monitor stopped'
    case 'simulation_mode':
      return 'Simulation mode active'
    case 'error':
      return 'Vision monitor error'
    default:
      return 'Standby'
  }
}

const DEFAULT_FACE_OPTIONS = {
  yawThreshold: 25,
  pitchThreshold: 20,
  gracePeriodMs: 3000,
  absentGracePeriodMs: 5000,
}

export function CameraMonitor({
  onWarning,
  isSessionRunning,
  isPremium,
  sessionElapsedSeconds,
  FREE_CAMERA_LIMIT_SECONDS = 600,
  onMonitoringReady,
}: CameraMonitorProps) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null)
  const [showConfig, setShowConfig] = React.useState<boolean>(false)
  const lastReportedReadyRef = React.useRef<{ isReady: boolean; reason?: string } | null>(null)

  const {
    status,
    calibrationProgress,
    baseline,
    currentAngles,
    warnings,
    isDistracted,
    isFaceAbsent,
    errorMessage,
    isSimulationMode,
    yawThreshold,
    pitchThreshold,
    gracePeriodMs,
    setYawThreshold,
    setPitchThreshold,
    setGracePeriodMs,
    setSimulationMode,
    startMonitoring,
    stopMonitoring,
    resetToIdle,
    triggerSimulatedDistraction,
    triggerSimulatedFaceAbsent,
  } = useFaceMonitor(DEFAULT_FACE_OPTIONS)

  // Check free tier limit
  const isFreeLimitReached = !isPremium && sessionElapsedSeconds >= FREE_CAMERA_LIMIT_SECONDS

  // Notify parent component whether monitoring is actively protecting the session
  React.useEffect(() => {
    let currentReady = false
    let currentReason: string | undefined

    if (isSimulationMode || status === 'monitoring') {
      currentReady = true
    } else if (isSessionRunning) {
      currentReady = false
      currentReason = getStatusLabel(status, calibrationProgress)
    } else {
      currentReady = false
    }

    if (
      !lastReportedReadyRef.current ||
      lastReportedReadyRef.current.isReady !== currentReady ||
      lastReportedReadyRef.current.reason !== currentReason
    ) {
      lastReportedReadyRef.current = { isReady: currentReady, reason: currentReason }
      onMonitoringReady?.(currentReady, currentReason)
    }
  }, [calibrationProgress, isSessionRunning, isSimulationMode, onMonitoringReady, status])

  // Start or stop monitoring based on session running state
  React.useEffect(() => {
    if (isFreeLimitReached) {
      if (status !== 'idle' && status !== 'monitoring_stopped') {
        stopMonitoring()
      }
      return
    }

    // Only start automatically from 'idle' state when session starts
    if (isSessionRunning && status === 'idle') {
      startMonitoring(videoRef, onWarning)
    } else if (!isSessionRunning && (status === 'monitoring' || status === 'calibrating')) {
      stopMonitoring()
    }
  }, [isFreeLimitReached, isSessionRunning, onWarning, startMonitoring, status, stopMonitoring])

  // Explicit Retry handler
  const handleRetry = React.useCallback(() => {
    resetToIdle()
    // Small timeout to allow state to settle before initiating fresh camera acquisition
    setTimeout(() => {
      startMonitoring(videoRef, onWarning)
    }, 50)
  }, [onWarning, resetToIdle, startMonitoring])

  const isErrorState =
    status === 'error' ||
    status === 'camera_permission_denied' ||
    status === 'no_camera_available' ||
    status === 'camera_in_use' ||
    status === 'video_playback_failed' ||
    status === 'model_loading_failed'

  const isStreamingVideo =
    status === 'monitoring' ||
    status === 'calibrating' ||
    status === 'starting_video_playback' ||
    status === 'camera_stream_acquired'

  return (
    <div className="space-y-4">
      {/* Free Tier Limit Gate Notice */}
      {isFreeLimitReached && (
        <div className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/40 p-4 text-center space-y-2 animate-in fade-in">
          <div className="inline-flex p-2 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-600">
            <Lock className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            Free Camera Monitoring Limit Reached (10 min)
          </h4>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Free tier allows up to 10 minutes of camera focus tracking per session. Upgrade to SyncStudy Premium for unlimited computer vision monitoring.
          </p>
          <div className="pt-1">
            <Link to="/premium">
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white text-xs">
                Upgrade to Premium
              </Button>
            </Link>
          </div>
        </div>
      )}

      {!isFreeLimitReached && (
        <>
          {/* Status & Indicators Bar */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-card text-xs">
            <div className="flex items-center gap-2.5">
              {status === 'monitoring' ? (
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              ) : status === 'calibrating' ||
                status === 'requesting_permission' ||
                status === 'camera_stream_acquired' ||
                status === 'starting_video_playback' ||
                status === 'loading_library' ||
                status === 'loading_wasm' ||
                status === 'loading_model' ? (
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
              ) : isErrorState ? (
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              ) : (
                <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/50" />
              )}
              <span className="font-medium text-foreground">
                {getStatusLabel(status, calibrationProgress)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Face Presence Pill */}
              <Badge
                variant="outline"
                className={`text-[10px] py-0 px-2 ${
                  status === 'monitoring'
                    ? isFaceAbsent
                      ? 'border-rose-500/50 text-rose-600 bg-rose-50 dark:bg-rose-950/40'
                      : 'border-emerald-500/50 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40'
                    : 'text-muted-foreground'
                }`}
              >
                {status === 'monitoring'
                  ? isFaceAbsent
                    ? 'Face Absent'
                    : 'Face Detected'
                  : 'Standby'}
              </Badge>

              {/* Distraction Pill */}
              {isDistracted && (
                <Badge variant="destructive" className="text-[10px] py-0 px-2 animate-bounce">
                  Distracted!
                </Badge>
              )}
            </div>
          </div>

          {/* Calibration Progress Bar Prompt */}
          {status === 'calibrating' && (
            <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-xs space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between font-medium text-amber-800 dark:text-amber-300">
                <span className="flex items-center gap-1.5">
                  <Eye className="w-4 h-4" />
                  Look straight at the screen to establish neutral pose...
                </span>
                <span>{calibrationProgress}%</span>
              </div>
              <Progress value={calibrationProgress} className="h-2 bg-amber-200 dark:bg-amber-900" />
            </div>
          )}

          {/* Actionable Error Card */}
          {isErrorState && (
            <div className="p-3.5 rounded-lg border border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-xs text-rose-700 dark:text-rose-300 space-y-2 animate-in fade-in">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-rose-800 dark:text-rose-200">
                    {status === 'camera_permission_denied'
                      ? 'Camera Permission Blocked'
                      : status === 'no_camera_available'
                      ? 'No Camera Device Detected'
                      : status === 'camera_in_use'
                      ? 'Camera Busy or Locked'
                      : status === 'video_playback_failed'
                      ? 'Video Stream Failed'
                      : 'Vision Monitor Encountered an Issue'}
                  </p>
                  <p className="text-muted-foreground mt-0.5">
                    {errorMessage || 'Unable to complete camera initialization.'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-rose-300 hover:bg-rose-100 dark:border-rose-800 dark:hover:bg-rose-900/40"
                  onClick={handleRetry}
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Retry Camera
                </Button>
              </div>
            </div>
          )}

          {/* Video Preview and Live Telemetry */}
          <div className="flex flex-col sm:flex-row items-center gap-4 p-3 rounded-xl border bg-muted/20">
            {/* 160x120 Live Camera View */}
            <div className="relative w-40 h-28 bg-black rounded-lg overflow-hidden border shadow-inner shrink-0 flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover transform -scale-x-100 transition-opacity duration-300 ${
                  isStreamingVideo ? 'opacity-100' : 'opacity-0'
                }`}
              />
              {!isStreamingVideo && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-muted-foreground p-2 text-center text-[10px]">
                  <CameraOff className="w-5 h-5 mb-1" />
                  <span>
                    {isErrorState
                      ? 'Camera unavailable'
                      : status === 'requesting_permission'
                      ? 'Awaiting permission'
                      : 'Preview inactive'}
                  </span>
                </div>
              )}
            </div>

            {/* Live Angles Telemetry */}
            <div className="flex-1 w-full space-y-2 text-xs">
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Gaze & Head Orientation:</span>
                <span className="font-mono text-foreground font-semibold">
                  {currentAngles
                    ? `Yaw ${currentAngles.yaw > 0 ? '+' : ''}${currentAngles.yaw}°  Pitch ${
                        currentAngles.pitch > 0 ? '+' : ''
                      }${currentAngles.pitch}°`
                    : 'N/A'}
                </span>
              </div>

              {baseline ? (
                <div className="flex justify-between items-center text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    Baseline Calibrated:
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px]">
                      Yaw {baseline.yaw}° Pitch {baseline.pitch}°
                    </span>
                    {status === 'monitoring' && (
                      <button
                        type="button"
                        onClick={handleRetry}
                        title="Recalibrate neutral posture"
                        className="text-[10px] text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 underline cursor-pointer"
                      >
                        Recalibrate
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Baseline Calibration:</span>
                  <span className="font-mono text-[11px] text-muted-foreground">Pending</span>
                </div>
              )}

              <div className="flex justify-between items-center text-muted-foreground">
                <span>Distraction Tolerance:</span>
                <span>
                  &gt;{yawThreshold}° Yaw / &gt;{pitchThreshold}° Pitch for {gracePeriodMs / 1000}s
                </span>
              </div>
            </div>
          </div>

          {/* Simulation Mode Panel */}
          <div className="p-3 rounded-lg border bg-card space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span className="text-xs font-semibold">Simulation Mode</span>
              </div>
              <Switch
                checked={isSimulationMode}
                onCheckedChange={setSimulationMode}
                id="sim-mode-toggle"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Allows you to test posture warnings and timer auto-pausing without a physical camera.
            </p>

            {isSimulationMode && (
              <div className="flex gap-2 pt-2 animate-in fade-in">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs flex-1"
                  onClick={triggerSimulatedDistraction}
                >
                  Simulate Distraction
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs flex-1"
                  onClick={triggerSimulatedFaceAbsent}
                >
                  Simulate Face Absent
                </Button>
              </div>
            )}
          </div>

          {/* Collapsible Sensitivity Sliders Panel */}
          <div className="border rounded-lg p-3 bg-card text-xs">
            <button
              type="button"
              className="w-full flex items-center justify-between text-muted-foreground hover:text-foreground cursor-pointer"
              onClick={() => setShowConfig(!showConfig)}
            >
              <span className="flex items-center gap-1.5 font-medium">
                <Sliders className="w-3.5 h-3.5 text-indigo-500" />
                Threshold Sensitivity Settings
              </span>
              {showConfig ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showConfig && (
              <div className="space-y-4 pt-3 mt-2 border-t animate-in fade-in">
                <div className="space-y-1">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Yaw Angle Threshold:</span>
                    <span className="font-semibold text-foreground">{yawThreshold}°</span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="45"
                    step="1"
                    value={yawThreshold}
                    onChange={(e) => setYawThreshold(parseInt(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>15° (Strict)</span>
                    <span>45° (Relaxed)</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Pitch Angle Threshold:</span>
                    <span className="font-semibold text-foreground">{pitchThreshold}°</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="35"
                    step="1"
                    value={pitchThreshold}
                    onChange={(e) => setPitchThreshold(parseInt(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>10° (Strict)</span>
                    <span>35° (Relaxed)</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Grace Period Duration:</span>
                    <span className="font-semibold text-foreground">{gracePeriodMs / 1000}s</span>
                  </div>
                  <input
                    type="range"
                    min="1000"
                    max="5000"
                    step="500"
                    value={gracePeriodMs}
                    onChange={(e) => setGracePeriodMs(parseInt(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>1s (Quick)</span>
                    <span>5s (Tolerant)</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
