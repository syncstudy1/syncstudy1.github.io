import { useState, useRef, useCallback, useEffect } from 'react'

export type TimerStatus = 'idle' | 'running' | 'paused' | 'stopped'

export interface UseStudyTimerReturn {
  elapsed: number
  plannedDuration: number
  status: TimerStatus
  warningCount: number
  autoPaused: boolean
  isHeld: boolean
  holdReason: string | null
  start: (plannedDurationSeconds: number) => void
  pause: () => void
  resume: () => void
  stop: () => number
  reset: () => void
  addWarning: () => void
  clearAutoPause: () => void
  holdTimer: (reason: string) => void
  releaseTimerHold: () => void
}

export function useStudyTimer(): UseStudyTimerReturn {
  const [elapsed, setElapsed] = useState<number>(0)
  const [plannedDuration, setPlannedDuration] = useState<number>(1500) // default 25 min
  const [status, setStatus] = useState<TimerStatus>('idle')
  const [warningCount, setWarningCount] = useState<number>(0)
  const [autoPaused, setAutoPaused] = useState<boolean>(false)
  const [isHeld, setIsHeld] = useState<boolean>(false)
  const [holdReason, setHoldReason] = useState<string | null>(null)

  const timerRef = useRef<number | null>(null)
  const elapsedRef = useRef<number>(0)
  const statusRef = useRef<TimerStatus>('idle')
  const isHeldRef = useRef<boolean>(false)

  // Keep refs in sync with state for stable interval closure
  useEffect(() => {
    elapsedRef.current = elapsed
  }, [elapsed])

  useEffect(() => {
    statusRef.current = status
  }, [status])

  useEffect(() => {
    isHeldRef.current = isHeld
  }, [isHeld])

  const clearTimerInterval = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      clearTimerInterval()
    }
  }, [clearTimerInterval])

  const start = useCallback((plannedDurationSeconds: number) => {
    clearTimerInterval()
    setElapsed(0)
    elapsedRef.current = 0
    setPlannedDuration(plannedDurationSeconds > 0 ? plannedDurationSeconds : 1500)
    setWarningCount(0)
    setAutoPaused(false)
    setIsHeld(false)
    setHoldReason(null)
    isHeldRef.current = false
    setStatus('running')

    timerRef.current = window.setInterval(() => {
      // If timer is on hold (e.g. camera calibrating / waiting for vision), do not accumulate study seconds
      if (isHeldRef.current) {
        return
      }
      setElapsed((prev) => {
        const next = prev + 1
        elapsedRef.current = next
        return next
      })
    }, 1000)
  }, [clearTimerInterval])

  const pause = useCallback(() => {
    clearTimerInterval()
    setStatus('paused')
  }, [clearTimerInterval])

  const resume = useCallback(() => {
    if (statusRef.current === 'paused') {
      clearTimerInterval()
      setStatus('running')
      setAutoPaused(false)
      timerRef.current = window.setInterval(() => {
        if (isHeldRef.current) {
          return
        }
        setElapsed((prev) => {
          const next = prev + 1
          elapsedRef.current = next
          return next
        })
      }, 1000)
    }
  }, [clearTimerInterval])

  const stop = useCallback(() => {
    clearTimerInterval()
    setStatus('stopped')
    setIsHeld(false)
    setHoldReason(null)
    isHeldRef.current = false
    return elapsedRef.current
  }, [clearTimerInterval])

  const reset = useCallback(() => {
    clearTimerInterval()
    setElapsed(0)
    elapsedRef.current = 0
    setStatus('idle')
    setWarningCount(0)
    setAutoPaused(false)
    setIsHeld(false)
    setHoldReason(null)
    isHeldRef.current = false
  }, [clearTimerInterval])

  const addWarning = useCallback(() => {
    setWarningCount((prev) => {
      const next = prev + 1
      if (next >= 3) {
        clearTimerInterval()
        setStatus('paused')
        setAutoPaused(true)
      }
      return next
    })
  }, [clearTimerInterval])

  const clearAutoPause = useCallback(() => {
    setAutoPaused(false)
  }, [])

  const holdTimer = useCallback((reason: string) => {
    setIsHeld((prev) => (prev ? prev : true))
    setHoldReason((prev) => (prev === reason ? prev : reason))
    isHeldRef.current = true
  }, [])

  const releaseTimerHold = useCallback(() => {
    setIsHeld((prev) => (!prev ? prev : false))
    setHoldReason((prev) => (prev === null ? prev : null))
    isHeldRef.current = false
  }, [])

  return {
    elapsed,
    plannedDuration,
    status,
    warningCount,
    autoPaused,
    isHeld,
    holdReason,
    start,
    pause,
    resume,
    stop,
    reset,
    addWarning,
    clearAutoPause,
    holdTimer,
    releaseTimerHold,
  }
}
