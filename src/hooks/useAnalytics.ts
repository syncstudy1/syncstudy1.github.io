import { useMemo } from 'react'
import { useStudySessions } from './useStudySessions'
import { useQuizSessions } from './useQuizSessions'
import { useQualifyingActivity } from './useQualifyingActivity'
import {
  calculateStreakStats,
  getDateKeyDaysAgo,
  getLocalDateKeyFromTimestamp,
} from '@/lib/activity'

export interface DailyDataPoint {
  date: string
  dateLabel: string
  totalSeconds: number
  plannedSeconds: number
  minutes: number
  plannedMinutes: number
}

export interface WeeklyDataPoint {
  week: string
  totalSeconds: number
  hours: number
}

export interface QuizScorePoint {
  date: string
  score: number
  total: number
  percentage: number
  subject: string
  difficulty: string
}

export interface WarningStatPoint {
  date: string
  warnings: number
}

export interface CalendarDayPoint {
  date: string
  minutes: number
  count: number
}

function dateFromKey(dateKey: string): Date {
  return new Date(`${dateKey}T12:00:00`)
}

export function useAnalytics() {
  const { sessions, loading: sessionsLoading } = useStudySessions()
  const { quizHistory, loading: quizzesLoading } = useQuizSessions()
  const { activities, loading: activitiesLoading } = useQualifyingActivity()

  const loading = sessionsLoading || quizzesLoading || activitiesLoading

  const result = useMemo(() => {
    const sessionMapByDate = new Map<
      string,
      { actual: number; planned: number; warnings: number; count: number }
    >()

    sessions.forEach((session) => {
      const date = getLocalDateKeyFromTimestamp(session.started_at)
      const existing = sessionMapByDate.get(date) || {
        actual: 0,
        planned: 0,
        warnings: 0,
        count: 0,
      }
      existing.actual += session.actual_duration_s || 0
      existing.planned += session.planned_duration_s || 0
      existing.warnings += session.warning_count || 0
      existing.count += 1
      sessionMapByDate.set(date, existing)
    })

    const activityDates = new Set(
      activities.map((activity) => activity.activity_date)
    )
    const activityCountByDate = new Map<string, number>()
    activities.forEach((activity) => {
      activityCountByDate.set(
        activity.activity_date,
        (activityCountByDate.get(activity.activity_date) || 0) + 1
      )
    })

    // Preserve historical qualifying activity from records created before migration 003.
    sessions.forEach((session) => {
      if ((session.actual_duration_s || 0) > 0) {
        const date = getLocalDateKeyFromTimestamp(session.started_at)
        activityDates.add(date)
        activityCountByDate.set(date, (activityCountByDate.get(date) || 0) + 1)
      }
    })
    quizHistory.forEach((quiz) => {
      const date = getLocalDateKeyFromTimestamp(quiz.taken_at)
      activityDates.add(date)
      activityCountByDate.set(date, (activityCountByDate.get(date) || 0) + 1)
    })

    const calendar: CalendarDayPoint[] = []
    for (let daysAgo = 89; daysAgo >= 0; daysAgo -= 1) {
      const date = getDateKeyDaysAgo(daysAgo)
      const sessionData = sessionMapByDate.get(date)
      const active = activityDates.has(date)
      calendar.push({
        date,
        minutes: active ? Math.max(1, Math.round((sessionData?.actual || 0) / 60)) : 0,
        count: active ? activityCountByDate.get(date) || 1 : 0,
      })
    }

    const daily: DailyDataPoint[] = []
    for (let daysAgo = 13; daysAgo >= 0; daysAgo -= 1) {
      const date = getDateKeyDaysAgo(daysAgo)
      const dateObject = dateFromKey(date)
      const data = sessionMapByDate.get(date) || {
        actual: 0,
        planned: 0,
        warnings: 0,
        count: 0,
      }
      daily.push({
        date,
        dateLabel: dateObject.toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'numeric',
          day: 'numeric',
        }),
        totalSeconds: data.actual,
        plannedSeconds: data.planned,
        minutes: Math.round(data.actual / 60),
        plannedMinutes: Math.round(data.planned / 60),
      })
    }

    const weekly: WeeklyDataPoint[] = []
    for (let weeksAgo = 7; weeksAgo >= 0; weeksAgo -= 1) {
      let weekSeconds = 0
      for (let day = weeksAgo * 7; day < weeksAgo * 7 + 7; day += 1) {
        weekSeconds += sessionMapByDate.get(getDateKeyDaysAgo(day))?.actual || 0
      }
      weekly.push({
        week: `W-${weeksAgo === 0 ? 'Current' : `${weeksAgo}w ago`}`,
        totalSeconds: weekSeconds,
        hours: Number((weekSeconds / 3600).toFixed(1)),
      })
    }

    const quizScores: QuizScorePoint[] = quizHistory.map((quiz) => ({
      date: dateFromKey(getLocalDateKeyFromTimestamp(quiz.taken_at)).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      }),
      score: quiz.score,
      total: quiz.total,
      percentage: Math.round((quiz.score / (quiz.total || 1)) * 100),
      subject: quiz.subject,
      difficulty: quiz.difficulty || 'medium',
    }))

    const warningStats = daily.map((day) => ({
      date: day.dateLabel,
      warnings: sessionMapByDate.get(day.date)?.warnings || 0,
    }))

    const streaks = calculateStreakStats(activityDates)
    const totalSecondsAllTime = sessions.reduce(
      (total, session) => total + (session.actual_duration_s || 0),
      0
    )
    const completedSessionsCount = sessions.length
    const avgSessionSeconds =
      completedSessionsCount > 0
        ? Math.round(totalSecondsAllTime / completedSessionsCount)
        : 0

    let bestDayThisWeek = { label: 'None', minutes: 0 }
    for (let daysAgo = 6; daysAgo >= 0; daysAgo -= 1) {
      const date = getDateKeyDaysAgo(daysAgo)
      const minutes = Math.round((sessionMapByDate.get(date)?.actual || 0) / 60)
      if (minutes > bestDayThisWeek.minutes) {
        bestDayThisWeek = {
          label: dateFromKey(date).toLocaleDateString(undefined, { weekday: 'long' }),
          minutes,
        }
      }
    }

    return {
      dailyData: daily,
      weeklyData: weekly,
      quizScores,
      warningStats,
      currentStreak: streaks.currentStreak,
      longestStreak: streaks.longestStreak,
      recordDays: streaks.recordDays,
      calendarData: calendar,
      totalSecondsAllTime,
      completedSessionsCount,
      avgSessionSeconds,
      bestDayThisWeek,
    }
  }, [activities, quizHistory, sessions])

  return { ...result, sessions, loading }
}
