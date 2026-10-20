import type { StudySession } from '@/types/database'

export function calculateCurrentStreak(sessions: StudySession[]): number {
  if (sessions.length === 0) return 0

  const qualifyingDates = new Set(
    sessions
      .filter((session) => (session.actual_duration_s || 0) >= 300)
      .map((session) => new Date(session.started_at).toISOString().split('T')[0])
  )

  let streak = 0
  const checkDate = new Date()
  const today = checkDate.toISOString().split('T')[0]

  if (!qualifyingDates.has(today)) {
    checkDate.setDate(checkDate.getDate() - 1)
  }

  while (qualifyingDates.has(checkDate.toISOString().split('T')[0])) {
    streak += 1
    checkDate.setDate(checkDate.getDate() - 1)
  }

  return streak
}
