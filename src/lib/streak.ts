import type { StudySession } from '@/types/database'
import { calculateStreakStats, getLocalDateKeyFromTimestamp } from '@/lib/activity'

export function calculateCurrentStreak(sessions: StudySession[]): number {
  if (sessions.length === 0) return 0

  const qualifyingDates = new Set(
    sessions
      .filter((session) => (session.actual_duration_s || 0) >= 300)
      .map((session) => getLocalDateKeyFromTimestamp(session.started_at))
  )
  return calculateStreakStats(qualifyingDates).currentStreak
}
