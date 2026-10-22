import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { StudySession, Subject } from '@/types/database'
import { getLocalDateKeyFromTimestamp, recordQualifyingActivity } from '@/lib/activity'

export interface SaveSessionInput {
  subject_id?: string | null
  started_at: string
  ended_at: string
  planned_duration_s: number
  actual_duration_s: number
  warning_count: number
  auto_paused: boolean
  notes?: string | null
  subject?: Subject
}

export function useStudySessions() {
  const [sessions, setSessions] = useState<StudySession[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const { user } = useAuthStore()

  const loadSessions = useCallback(async () => {
    if (!user || !isSupabaseConfigured) {
      setSessions([])
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('study_sessions')
        .select('*, subject:subjects(*)')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })

      if (error) throw error

      setSessions((data as StudySession[]) || [])
    } catch (err) {
      console.error('Failed to load study sessions:', err)
      setSessions([])
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadSessions()
    const refresh = () => loadSessions()
    window.addEventListener('syncstudy:activity-recorded', refresh)
    return () => window.removeEventListener('syncstudy:activity-recorded', refresh)
  }, [loadSessions])

  const saveSession = async (data: SaveSessionInput): Promise<StudySession> => {
    if (!user || !isSupabaseConfigured) {
      throw new Error('You must be signed in to save study sessions.')
    }

    const { data: created, error } = await supabase
      .from('study_sessions')
      .insert({
        user_id: user.id,
        subject_id: data.subject_id || null,
        started_at: data.started_at,
        ended_at: data.ended_at,
        planned_duration_s: data.planned_duration_s,
        actual_duration_s: data.actual_duration_s,
        warning_count: data.warning_count,
        auto_paused: data.auto_paused,
        notes: data.notes || null,
      })
      .select('*, subject:subjects(*)')
      .single()

    if (error) throw error

    const sessionData = created as StudySession
    setSessions((prev) => [sessionData, ...prev])
    if (sessionData.actual_duration_s > 0) {
      try {
        await recordQualifyingActivity(
          'study_session',
          getLocalDateKeyFromTimestamp(sessionData.started_at)
        )
      } catch (activityError) {
        console.error('Session saved, but activity-day recording failed:', activityError)
        window.dispatchEvent(new CustomEvent('syncstudy:activity-recorded'))
      }
    }
    return sessionData
  }

  // Today total seconds
  const todayTotalSeconds = useMemo(() => {
    const todayStr = new Date().toDateString()
    return sessions
      .filter((s) => new Date(s.started_at).toDateString() === todayStr)
      .reduce((sum, s) => sum + (s.actual_duration_s || 0), 0)
  }, [sessions])

  // Week total seconds (last 7 days)
  const weekTotalSeconds = useMemo(() => {
    const weekAgo = Date.now() - 7 * 86400000
    return sessions
      .filter((s) => new Date(s.started_at).getTime() >= weekAgo)
      .reduce((sum, s) => sum + (s.actual_duration_s || 0), 0)
  }, [sessions])

  return {
    sessions,
    loading,
    refreshSessions: loadSessions,
    saveSession,
    todayTotalSeconds,
    weekTotalSeconds,
  }
}
