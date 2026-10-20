import { useState, useRef, useCallback, useEffect } from 'react'
import type { RefObject } from 'react'
import {
  loadFaceLandmarker,
  extractHeadAngles,
  type HeadAngles,
  type FaceLandmarker,
  type VisionLoadingStage,
} from '@/lib/mediapipe'

export type FaceMonitorStatus =
  | 'idle'
  | 'requesting_permission'
  | 'camera_stream_acquired'
  | 'starting_video_playback'
  | 'loading_library'
  | 'loading_wasm'
  | 'loading_model'
  | 'calibrating'
  | 'monitoring'
  | 'camera_permission_denied'
  | 'no_camera_available'
  | 'camera_in_use'
  | 'video_playback_failed'
  | 'model_loading_failed'
  | 'monitoring_stopped'
  | 'simulation_mode'
  | 'error'

export interface FaceMonitorOptions {
  yawThreshold?: number
  pitchThreshold?: number
  gracePeriodMs?: number
  absentGracePeriodMs?: number
  maxWarnings?: number
}

export function useFaceMonitor(options: FaceMonitorOptions = {}) {
  const [yawThreshold, setYawThreshold] = useState<number>(options.yawThreshold ?? 25)
  const [pitchThreshold, setPitchThreshold] = useState<number>(options.pitchThreshold ?? 20)
  const [gracePeriodMs, setGracePeriodMs] = useState<number>(options.gracePeriodMs ?? 3000)
  const absentGracePeriodMs = options.absentGracePeriodMs ?? 5000

  const [status, setStatus] = useState<FaceMonitorStatus>('idle')
  const [calibrationProgress, setCalibrationProgress] = useState<number>(0)
  const [baseline, setBaseline] = useState<HeadAngles | null>(null)
  const [currentAngles, setCurrentAngles] = useState<HeadAngles | null>(null)
  const [warnings, setWarnings] = useState<number>(0)
  const [isDistracted, setIsDistracted] = useState<boolean>(false)
  const [isFaceAbsent, setIsFaceAbsent] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSimulationMode, setIsSimulationMode] = useState<boolean>(false)

  // Stream & video refs
  const streamRef = useRef<MediaStream | null>(null)
  const landmarkerRef = useRef<FaceLandmarker | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const videoElementRef = useRef<HTMLVideoElement | null>(null)
  const onWarningCallbackRef = useRef<(() => void) | null>(null)

  // Operational refs
  const baselineRef = useRef<HeadAngles | null>(null)
  const distractionStartRef = useRef<number | null>(null)
  const absentStartRef = useRef<number | null>(null)
  const warningCooldownRef = useRef<boolean>(false)
  const isRunningRef = useRef<boolean>(false)
  const sessionIdRef = useRef<number>(0)

  // Keep baseline ref in sync with state
  useEffect(() => {
    baselineRef.current = baseline
  }, [baseline])

  /**
   * Internal hardware release helper.
   * Stops camera stream tracks, animation frames, and detaches video element.
   * Does NOT alter the status state, allowing callers to set specific error/stop states.
   */
  const cleanupHardware = useCallback(() => {
    sessionIdRef.current++
    isRunningRef.current = false

    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }

    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => {
          track.stop()
        })
      } catch (e) {
        console.warn('[SyncStudy Vision] Error stopping tracks:', e)
      }
      streamRef.current = null
    }

    if (videoElementRef.current) {
      videoElementRef.current.srcObject = null
    }

    distractionStartRef.current = null
    absentStartRef.current = null
    warningCooldownRef.current = false
  }, [])

  /**
   * Stops monitoring explicitly and sets status to 'monitoring_stopped'.
   */
  const stopMonitoring = useCallback(() => {
    cleanupHardware()
    setStatus('monitoring_stopped')
    setIsDistracted(false)
    setIsFaceAbsent(false)
  }, [cleanupHardware])

  /**
   * Resets status to idle.
   */
  const resetToIdle = useCallback(() => {
    cleanupHardware()
    setStatus('idle')
    setErrorMessage(null)
    setIsDistracted(false)
    setIsFaceAbsent(false)
    setCalibrationProgress(0)
  }, [cleanupHardware])

  /**
   * Runs the 3-second calibration loop to establish neutral head-pose baseline.
   */
  const runCalibration = useCallback(
    async (landmarker: FaceLandmarker, video: HTMLVideoElement, currentSessionId: number): Promise<HeadAngles> => {
      setStatus('calibrating')
      setCalibrationProgress(0)

      const samples: HeadAngles[] = []
      const calibrationDurationMs = 3000
      const startTime = performance.now()

      return new Promise<HeadAngles>((resolve, reject) => {
        const sampleStep = () => {
          // Abort if session cancelled or unmounted
          if (!isRunningRef.current || sessionIdRef.current !== currentSessionId) {
            return reject(new Error('Calibration cancelled.'))
          }

          const now = performance.now()
          const elapsed = now - startTime
          const progress = Math.min(100, Math.round((elapsed / calibrationDurationMs) * 100))
          setCalibrationProgress(progress)

          if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0) {
            try {
              const result = landmarker.detectForVideo(video, now)
              const angles = extractHeadAngles(result)
              if (angles) {
                samples.push(angles)
                setCurrentAngles(angles)
              }
            } catch (e) {
              console.warn('[SyncStudy Vision] Calibration frame detection error:', e)
            }
          }

          if (elapsed < calibrationDurationMs) {
            requestAnimationFrame(sampleStep)
          } else {
            // Require at least 5 valid face samples to confirm face was present during calibration
            if (samples.length < 5) {
              return reject(
                new Error(
                  'No face detected clearly during calibration. Please look directly at the webcam and retry.'
                )
              )
            }

            const avgYaw = samples.reduce((acc, s) => acc + s.yaw, 0) / samples.length
            const avgPitch = samples.reduce((acc, s) => acc + s.pitch, 0) / samples.length
            const finalBaseline: HeadAngles = {
              yaw: Math.round(avgYaw),
              pitch: Math.round(avgPitch),
            }

            setBaseline(finalBaseline)
            baselineRef.current = finalBaseline
            setCalibrationProgress(100)
            resolve(finalBaseline)
          }
        }

        requestAnimationFrame(sampleStep)
      })
    },
    []
  )

  /**
   * Main real-time detection loop.
   */
  const startMonitoringLoop = useCallback(
    (landmarker: FaceLandmarker, video: HTMLVideoElement, currentSessionId: number) => {
      setStatus('monitoring')
      setIsFaceAbsent(false)
      setIsDistracted(false)

      const loop = () => {
        if (!isRunningRef.current || sessionIdRef.current !== currentSessionId) return

        const now = performance.now()

        if (
          video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
          video.videoWidth > 0 &&
          !video.paused
        ) {
          try {
            const result = landmarker.detectForVideo(video, now)
            const angles = extractHeadAngles(result)

            if (!angles) {
              // ── Face Absent Detection ──
              setIsFaceAbsent(true)
              setIsDistracted(false)

              if (!absentStartRef.current) {
                absentStartRef.current = now
              } else if (
                now - absentStartRef.current >= absentGracePeriodMs &&
                !warningCooldownRef.current
              ) {
                warningCooldownRef.current = true
                setWarnings((w) => w + 1)
                onWarningCallbackRef.current?.()

                setTimeout(() => {
                  warningCooldownRef.current = false
                  absentStartRef.current = performance.now()
                }, 3000)
              }
            } else {
              // ── Face Present: Posture & Gaze Evaluation ──
              setIsFaceAbsent(false)
              absentStartRef.current = null
              setCurrentAngles(angles)

              const activeBaseline = baselineRef.current || { yaw: 0, pitch: 0 }
              const deltaYaw = Math.abs(angles.yaw - activeBaseline.yaw)
              const deltaPitch = Math.abs(angles.pitch - activeBaseline.pitch)

              const distracted = deltaYaw >= yawThreshold || deltaPitch >= pitchThreshold

              if (distracted) {
                setIsDistracted(true)
                if (!distractionStartRef.current) {
                  distractionStartRef.current = now
                } else if (
                  now - distractionStartRef.current >= gracePeriodMs &&
                  !warningCooldownRef.current
                ) {
                  warningCooldownRef.current = true
                  setWarnings((w) => w + 1)
                  onWarningCallbackRef.current?.()

                  setTimeout(() => {
                    warningCooldownRef.current = false
                    distractionStartRef.current = performance.now()
                  }, 3000)
                }
              } else {
                // Return to normal posture resets distraction grace timer
                setIsDistracted(false)
                distractionStartRef.current = null
              }
            }
          } catch (err) {
            console.warn('[SyncStudy Vision] Frame detection evaluation error:', err)
          }
        }

        animFrameRef.current = requestAnimationFrame(loop)
      }

      animFrameRef.current = requestAnimationFrame(loop)
    },
    [absentGracePeriodMs, gracePeriodMs, pitchThreshold, yawThreshold]
  )

  /**
   * Starts camera initialization, video playback, model loading, calibration, and detection.
   */
  const startMonitoring = useCallback(
    async (videoRef: RefObject<HTMLVideoElement | null>, onWarning: () => void) => {
      // Clean up previous camera resources and increment past session ID
      cleanupHardware()

      // Generate a new, unique session ID for THIS execution
      const currentSessionId = ++sessionIdRef.current
      isRunningRef.current = true
      onWarningCallbackRef.current = onWarning
      setErrorMessage(null)

      try {
        // 1. Insecure Context Verification
        if (
          typeof window !== 'undefined' &&
          !window.isSecureContext &&
          window.location.hostname !== 'localhost' &&
          window.location.hostname !== '127.0.0.1'
        ) {
          setStatus('error')
          setErrorMessage('Camera access requires HTTPS in production. Please access SyncStudy via secure HTTPS.')
          cleanupHardware()
          return
        }

        // 2. Browser MediaDevices Support Verification
        if (
          typeof navigator === 'undefined' ||
          !navigator.mediaDevices ||
          typeof navigator.mediaDevices.getUserMedia !== 'function'
        ) {
          setStatus('error')
          setErrorMessage('Webcam access is not supported by your current browser.')
          cleanupHardware()
          return
        }

        // 3. Request Camera Stream
        setStatus('requesting_permission')
        console.log('[SyncStudy Vision] Requesting camera stream permission...')

        let stream: MediaStream
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 640 },
              height: { ideal: 480 },
              facingMode: 'user',
            },
            audio: false,
          })
        } catch (mediaErr: any) {
          console.error('[SyncStudy Vision] getUserMedia error:', mediaErr)
          cleanupHardware()

          if (mediaErr.name === 'NotAllowedError' || mediaErr.name === 'PermissionDeniedError') {
            setStatus('camera_permission_denied')
            setErrorMessage('Camera access was denied. Please allow camera permissions in your browser address bar.')
          } else if (mediaErr.name === 'NotFoundError' || mediaErr.name === 'DevicesNotFoundError') {
            setStatus('no_camera_available')
            setErrorMessage('No camera device was detected on your system.')
          } else if (mediaErr.name === 'NotReadableError' || mediaErr.name === 'TrackStartError') {
            setStatus('camera_in_use')
            setErrorMessage('Your camera is currently in use by another application or locked by the system.')
          } else if (mediaErr.name === 'OverconstrainedError') {
            setStatus('error')
            setErrorMessage('The requested camera resolution is not supported by your hardware.')
          } else {
            setStatus('error')
            setErrorMessage(mediaErr.message || 'Failed to acquire camera stream.')
          }
          return
        }

        if (!isRunningRef.current || sessionIdRef.current !== currentSessionId) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }

        setStatus('camera_stream_acquired')
        streamRef.current = stream

        const videoTracks = stream.getVideoTracks()
        if (videoTracks.length === 0) {
          cleanupHardware()
          setStatus('no_camera_available')
          setErrorMessage('The camera stream contains no active video tracks.')
          return
        }

        // 4. Attach Stream to Video Element and Start Playback
        setStatus('starting_video_playback')
        const videoElement = videoRef.current
        if (!videoElement) {
          cleanupHardware()
          setStatus('error')
          setErrorMessage('Video preview element is not available in the DOM.')
          return
        }

        videoElementRef.current = videoElement
        videoElement.srcObject = stream
        videoElement.muted = true
        videoElement.playsInline = true

        // Bounded wait for video element playback (max 8s)
        try {
          await new Promise<void>((resolve, reject) => {
            let settled = false
            const timeoutTimer = setTimeout(() => {
              if (!settled) {
                settled = true
                cleanupEvents()
                if (videoElement.videoWidth > 0 && !videoElement.paused) {
                  resolve()
                } else {
                  reject(new Error('Timed out waiting for camera video playback to start.'))
                }
              }
            }, 8000)

            const checkAndResolve = () => {
              if (settled) return
              if (videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
                settled = true
                cleanupEvents()
                clearTimeout(timeoutTimer)
                resolve()
              }
            }

            const onPlaying = () => {
              checkAndResolve()
            }

            const onLoadedMetadata = () => {
              videoElement
                .play()
                .then(() => checkAndResolve())
                .catch((playErr) => {
                  if (!settled) {
                    settled = true
                    cleanupEvents()
                    clearTimeout(timeoutTimer)
                    reject(new Error(`Video play() failed: ${playErr.message}`))
                  }
                })
            }

            function cleanupEvents() {
              if (videoElement) {
                videoElement.removeEventListener('loadedmetadata', onLoadedMetadata)
                videoElement.removeEventListener('playing', onPlaying)
              }
            }

            videoElement.addEventListener('loadedmetadata', onLoadedMetadata)
            videoElement.addEventListener('playing', onPlaying)

            if (videoElement.readyState >= HTMLMediaElement.HAVE_METADATA) {
              onLoadedMetadata()
            }
          })
        } catch (videoPlayErr: any) {
          console.error('[SyncStudy Vision] Video playback error:', videoPlayErr)
          cleanupHardware()
          setStatus('video_playback_failed')
          setErrorMessage(videoPlayErr.message || 'Video stream playback could not be started.')
          return
        }

        if (!isRunningRef.current || sessionIdRef.current !== currentSessionId) {
          cleanupHardware()
          return
        }

        // 5. Load the face landmark monitor
        let landmarker: FaceLandmarker
        try {
          landmarker = await loadFaceLandmarker((stage: VisionLoadingStage) => {
            if (isRunningRef.current && sessionIdRef.current === currentSessionId) {
              setStatus(stage)
            }
          })
          landmarkerRef.current = landmarker
        } catch (modelErr: any) {
          console.error('[SyncStudy Vision] FaceLandmarker loading error:', modelErr)
          cleanupHardware()
          setStatus('model_loading_failed')
          setErrorMessage(modelErr.message || 'Focus monitoring could not be initialized.')
          return
        }

        if (!isRunningRef.current || sessionIdRef.current !== currentSessionId) {
          cleanupHardware()
          return
        }

        // 6. Run 3-second Neutral Posture Calibration
        try {
          await runCalibration(landmarker, videoElement, currentSessionId)
        } catch (calibErr: any) {
          console.warn('[SyncStudy Vision] Calibration error:', calibErr)
          setStatus('error')
          setErrorMessage(
            calibErr.message || 'Calibration could not establish a baseline pose. Please sit upright and retry.'
          )
          return
        }

        if (!isRunningRef.current || sessionIdRef.current !== currentSessionId) {
          cleanupHardware()
          return
        }

        // 7. Start Real-Time Monitoring Loop
        startMonitoringLoop(landmarker, videoElement, currentSessionId)
      } catch (generalErr: any) {
        console.error('[SyncStudy Vision] Unexpected initialization error:', generalErr)
        cleanupHardware()
        setStatus('error')
        setErrorMessage(generalErr.message || 'Unexpected error initializing Vision Monitor.')
      }
    },
    [cleanupHardware, runCalibration, startMonitoringLoop]
  )

  // Simulation mode triggers (for testing and demo without physical webcam)
  const triggerSimulatedDistraction = useCallback(() => {
    setIsDistracted(true)
    setCurrentAngles({ yaw: 35, pitch: -22 })
    setWarnings((w) => w + 1)
    onWarningCallbackRef.current?.()

    setTimeout(() => {
      setIsDistracted(false)
      setCurrentAngles(baselineRef.current || { yaw: 0, pitch: 0 })
    }, 2500)
  }, [])

  const triggerSimulatedFaceAbsent = useCallback(() => {
    setIsFaceAbsent(true)
    setWarnings((w) => w + 1)
    onWarningCallbackRef.current?.()

    setTimeout(() => {
      setIsFaceAbsent(false)
    }, 2500)
  }, [])

  const resetWarnings = useCallback(() => {
    setWarnings(0)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupHardware()
    }
  }, [cleanupHardware])

  return {
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
    setSimulationMode: setIsSimulationMode,
    startMonitoring,
    stopMonitoring,
    resetToIdle,
    triggerSimulatedDistraction,
    triggerSimulatedFaceAbsent,
    resetWarnings,
  }
}
