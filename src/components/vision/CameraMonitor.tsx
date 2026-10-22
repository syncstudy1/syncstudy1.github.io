import * as React from 'react'
import { useFaceMonitor, type FaceMonitorStatus } from '@/hooks/useFaceMonitor'
import { Button } from '@/ui/button'
import { Progress } from '@/ui/progress'
import { Badge } from '@/ui/badge'
import { CameraOff, AlertTriangle, Lock, RefreshCw, Eye } from 'lucide-react'
import { Link } from 'react-router-dom'

export interface CameraMonitorProps {
  onWarning: () => void
  isSessionRunning: boolean
  isPremium: boolean
  sessionElapsedSeconds: number
  FREE_CAMERA_LIMIT_SECONDS?: number
  onMonitoringReady?: (isReady: boolean, reason?: string) => void
}

function getStatusLabel(status: FaceMonitorStatus, progress: number): string {
  switch (status) {
    case 'idle': return 'Camera inactive'
    case 'requesting_permission': return 'Requesting camera access...'
    case 'camera_stream_acquired': return 'Camera connected, preparing preview...'
    case 'starting_video_playback': return 'Starting video stream...'
    case 'loading_library': return 'Loading focus monitoring...'
    case 'loading_wasm': return 'Loading WASM runtime...'
    case 'loading_model': return 'Loading posture monitoring...'
    case 'calibrating': return `Calibrating baseline pose... (${progress}%)`
    case 'monitoring': return 'Focus monitoring active'
    case 'camera_permission_denied': return 'Camera permission denied'
    case 'no_camera_available': return 'No camera detected'
    case 'camera_in_use': return 'Camera is in use by another app'
    case 'video_playback_failed': return 'Video preview playback failed'
    case 'model_loading_failed': return 'Focus monitoring could not be loaded'
    case 'monitoring_stopped': return 'Vision monitor stopped'
    case 'error': return 'Vision monitor error'
    default: return 'Standby'
  }
}

const DEFAULT_FACE_OPTIONS = { yawThreshold: 25, gracePeriodMs: 10_000, absentGracePeriodMs: 5_000 }

export function CameraMonitor({ onWarning, isSessionRunning, isPremium, sessionElapsedSeconds, FREE_CAMERA_LIMIT_SECONDS = 600, onMonitoringReady }: CameraMonitorProps) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null)
  const lastReportedReadyRef = React.useRef<{ isReady: boolean; reason?: string } | null>(null)
  const { status, calibrationProgress, isDistracted, isFaceAbsent, errorMessage, startMonitoring, stopMonitoring, resetToIdle } = useFaceMonitor(DEFAULT_FACE_OPTIONS)
  const isFreeLimitReached = !isPremium && sessionElapsedSeconds >= FREE_CAMERA_LIMIT_SECONDS

  React.useEffect(() => {
    const isReady = status === 'monitoring'
    const reason = isSessionRunning && !isReady ? getStatusLabel(status, calibrationProgress) : undefined
    if (!lastReportedReadyRef.current || lastReportedReadyRef.current.isReady !== isReady || lastReportedReadyRef.current.reason !== reason) {
      lastReportedReadyRef.current = { isReady, reason }
      onMonitoringReady?.(isReady, reason)
    }
  }, [calibrationProgress, isSessionRunning, onMonitoringReady, status])

  React.useEffect(() => {
    if (isFreeLimitReached) {
      if (status !== 'idle' && status !== 'monitoring_stopped') stopMonitoring()
      return
    }
    if (isSessionRunning && status === 'idle') startMonitoring(videoRef, onWarning)
    else if (!isSessionRunning && (status === 'monitoring' || status === 'calibrating')) stopMonitoring()
  }, [isFreeLimitReached, isSessionRunning, onWarning, startMonitoring, status, stopMonitoring])

  const handleRetry = React.useCallback(() => {
    resetToIdle()
    setTimeout(() => startMonitoring(videoRef, onWarning), 50)
  }, [onWarning, resetToIdle, startMonitoring])

  const isErrorState = ['error', 'camera_permission_denied', 'no_camera_available', 'camera_in_use', 'video_playback_failed', 'model_loading_failed'].includes(status)
  const isStreamingVideo = ['monitoring', 'calibrating', 'starting_video_playback', 'camera_stream_acquired'].includes(status)

  return (
    <div className="space-y-4">
      {isFreeLimitReached && <div className="space-y-2 rounded-xl border border-amber-300 bg-amber-50/80 p-4 text-center dark:border-amber-800 dark:bg-amber-950/40"><div className="inline-flex rounded-full bg-amber-100 p-2 text-amber-600 dark:bg-amber-900/60"><Lock className="h-5 w-5" /></div><h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200">Free Camera Monitoring Limit Reached (10 min)</h4><p className="mx-auto max-w-sm text-xs text-muted-foreground">Free tier allows up to 10 minutes of camera focus tracking per session. Upgrade to SyncStudy Premium for unlimited computer vision monitoring.</p><Link to="/premium"><Button size="sm" className="bg-amber-600 text-xs text-white hover:bg-amber-700">Upgrade to Premium</Button></Link></div>}

      {!isFreeLimitReached && <>
        <div className="flex items-center justify-between rounded-lg border bg-card p-3 text-xs"><div className="flex items-center gap-2.5"><div className={`h-2.5 w-2.5 rounded-full ${status === 'monitoring' ? 'animate-pulse bg-emerald-500' : isErrorState ? 'bg-rose-500' : 'bg-amber-500'}`} /><span className="font-medium text-foreground">{getStatusLabel(status, calibrationProgress)}</span></div><div className="flex items-center gap-2"><Badge variant="outline" className={`text-[10px] ${status === 'monitoring' ? (isFaceAbsent ? 'border-rose-500/50 text-rose-600' : 'border-emerald-500/50 text-emerald-600') : 'text-muted-foreground'}`}>{status === 'monitoring' ? (isFaceAbsent ? 'Face Absent' : 'Face Detected') : 'Standby'}</Badge>{isDistracted && <Badge variant="destructive" className="animate-bounce text-[10px]">Distracted!</Badge>}</div></div>

        {status === 'calibrating' && <div className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs dark:border-amber-800 dark:bg-amber-950/30"><div className="flex items-center justify-between font-medium text-amber-800 dark:text-amber-300"><span className="flex items-center gap-1.5"><Eye className="h-4 w-4" />Look straight at the screen to establish neutral pose...</span><span>{calibrationProgress}%</span></div><Progress value={calibrationProgress} className="h-2 bg-amber-200 dark:bg-amber-900" /></div>}

        {isErrorState && <div className="space-y-2 rounded-lg border border-rose-300 bg-rose-50 p-3.5 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"><div className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><div><p className="font-semibold">{status === 'camera_permission_denied' ? 'Camera Permission Blocked' : status === 'no_camera_available' ? 'No Camera Device Detected' : status === 'camera_in_use' ? 'Camera Busy or Locked' : status === 'video_playback_failed' ? 'Video Stream Failed' : 'Vision Monitor Encountered an Issue'}</p><p className="mt-0.5 text-muted-foreground">{errorMessage || 'Unable to complete camera initialization.'}</p></div></div><Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleRetry}><RefreshCw className="mr-1.5 h-3.5 w-3.5" />Retry Camera</Button></div>}

        <div className="w-full rounded-xl border bg-muted/20 p-3"><div className="relative flex aspect-video min-h-56 w-full items-center justify-center overflow-hidden rounded-lg border bg-black shadow-inner sm:min-h-72"><video ref={videoRef} autoPlay playsInline muted className={`h-full w-full object-cover transition-opacity duration-300 ${isStreamingVideo ? 'opacity-100' : 'opacity-0'}`} />{!isStreamingVideo && <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-2 text-center text-[10px] text-muted-foreground"><CameraOff className="mb-1 h-5 w-5" /><span>{isErrorState ? 'Camera unavailable' : status === 'requesting_permission' ? 'Awaiting permission' : 'Preview inactive'}</span></div>}</div></div>
      </>}
    </div>
  )
}
