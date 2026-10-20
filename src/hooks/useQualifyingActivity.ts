import { useCallback, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import {
  getLocalDateKeyFromTimestamp,
  type QualifyingActivity,
  type QualifyingActivityType,
} from '@/lib/activity'

export function useQualifyingActivity() {
  const { user } = useAuthStore()
  const [activities, setActivities] = useState<QualifyingActivity[]>([])
  const [loading, setLoading] = useState(true)

  const loadActivities = useCallback(async () => {
    if (!user || !isSupabaseConfigured) {
      setActivities([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const [{ data: recorded, error: activityError }, { data: plans, error: planError }] =
        await Promise.all([
          supabase
            .from('study_activity_days')
            .select('activity_date, activity_type')
            .eq('user_id', user.id),
          supabase
            .from('study_plans')
            .select('generated_at')
            .eq('user_id', user.id),
        ])

      if (activityError) throw activityError
      if (planError) throw planError

      const merged = new Map<string, QualifyingActivity>()
      for (const activity of (recorded || []) as QualifyingActivity[]) {
        merged.set(`${activity.activity_date}:${activity.activity_type}`, activity)
      }
      for (const plan of plans || []) {
        const activity = {
          activity_date: getLocalDateKeyFromTimestamp(plan.generated_at),
          activity_type: 'study_plan' as QualifyingActivityType,
        }
        merged.set(`${activity.activity_date}:${activity.activity_type}`, activity)
      }

      setActivities([...merged.values()])
    } catch (error) {
      console.error('Failed to load qualifying activity:', error)
      setActivities([])
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadActivities()
    const refresh = () => {
      loadActivities()
    }
    window.addEventListener('syncstudy:activity-recorded', refresh)
    return () => window.removeEventListener('syncstudy:activity-recorded', refresh)
  }, [loadActivities])

  return { activities, loading, refreshActivities: loadActivities }
}
