import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import {
  calculateStreakStats,
  getDateKeyDaysAgo,
  getLocalDateKey,
} from '@/lib/activityStats'

export { calculateStreakStats, getDateKeyDaysAgo, getLocalDateKey }

export type QualifyingActivityType = 'study_session' | 'study_plan' | 'quiz'

export interface QualifyingActivity {
  activity_date: string
  activity_type: QualifyingActivityType
}

export function getLocalDateKeyFromTimestamp(timestamp: string): string {
  return getLocalDateKey(new Date(timestamp))
}

export async function recordQualifyingActivity(
  activityType: QualifyingActivityType,
  activityDate: string = getLocalDateKey()
): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured; qualifying activity could not be recorded.')
  }

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) {
    throw userError || new Error('You must be signed in to record qualifying activity.')
  }

  const { error } = await supabase
    .from('study_activity_days')
    .upsert(
      {
        user_id: userData.user.id,
        activity_date: activityDate,
        activity_type: activityType,
      },
      { onConflict: 'user_id,activity_date,activity_type', ignoreDuplicates: true }
    )

  if (error) {
    console.error('Failed to record qualifying activity:', error)
    throw error
  }

  window.dispatchEvent(new CustomEvent('syncstudy:activity-recorded'))
}
