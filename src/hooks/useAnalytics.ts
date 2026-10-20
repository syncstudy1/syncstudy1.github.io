import { useMemo } from 'react'
import { useStudySessions } from './useStudySessions'
import { useQuizSessions } from './useQuizSessions'
import { calculateCurrentStreak } from '@/lib/streak'

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

export function useAnalytics() {
  const { sessions, loading: sessionsLoading } = useStudySessions()
  const { quizHistory, loading: quizzesLoading } = useQuizSessions()

  const loading = sessionsLoading || quizzesLoading

  const {
    dailyData,
    weeklyData,
    quizScores,
    warningStats,
    currentStreak,
    longestStreak,
    calendarData,
    totalSecondsAllTime,
    completedSessionsCount,
    avgSessionSeconds,
    bestDayThisWeek,
  } = useMemo(() => {
    const oneDayMs = 86400000
    const now = new Date()

    // Map existing real sessions by date string (YYYY-MM-DD)
    const sessionMapByDate = new Map<
      string,
      { actual: number; planned: number; warnings: number; count: number }
    >()

    sessions.forEach((s) => {
      const d = new Date(s.started_at).toISOString().split('T')[0]
      const existing = sessionMapByDate.get(d) || {
        actual: 0,
        planned: 0,
        warnings: 0,
        count: 0,
      }
      existing.actual += s.actual_duration_s || 0
      existing.planned += s.planned_duration_s || 0
      existing.warnings += s.warning_count || 0
      existing.count += 1
      sessionMapByDate.set(d, existing)
    })

    // Calendar heatmap for the last 90 days
    const calendar: CalendarDayPoint[] = []
    const dates90: string[] = []

    for (let i = 89; i >= 0; i--) {
      const d = new Date(now.getTime() - i * oneDayMs)
      const dateStr = d.toISOString().split('T')[0]
      dates90.push(dateStr)

      const realData = sessionMapByDate.get(dateStr)
      if (realData) {
        calendar.push({
          date: dateStr,
          minutes: Math.round(realData.actual / 60),
          count: realData.count,
        })
      } else {
        calendar.push({
          date: dateStr,
          minutes: 0,
          count: 0,
        })
      }
    }

    // 1. Daily Data (last 14 days)
    const daily: DailyDataPoint[] = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getTime() - i * oneDayMs)
      const dateStr = d.toISOString().split('T')[0]
      const label = d.toLocaleDateString(undefined, { weekday: 'short', month: 'numeric', day: 'numeric' })
      const data = sessionMapByDate.get(dateStr) || { actual: 0, planned: 0, warnings: 0, count: 0 }
      daily.push({
        date: dateStr,
        dateLabel: label,
        totalSeconds: data.actual,
        plannedSeconds: data.planned,
        minutes: Math.round(data.actual / 60),
        plannedMinutes: Math.round(data.planned / 60),
      })
    }

    // 2. Weekly Data (last 8 weeks)
    const weekly: WeeklyDataPoint[] = []
    for (let w = 7; w >= 0; w--) {
      let weekSecs = 0
      const weekStart = new Date(now.getTime() - (w * 7 + 6) * oneDayMs)
      const weekEnd = new Date(now.getTime() - w * 7 * oneDayMs)
      const weekLabel = `W-${w === 0 ? 'Current' : `${w}w ago`}`

      for (let day = 0; day < 7; day++) {
        const cur = new Date(weekStart.getTime() + day * oneDayMs)
        const curStr = cur.toISOString().split('T')[0]
        const data = sessionMapByDate.get(curStr)
        if (data) {
          weekSecs += data.actual
        }
      }

      weekly.push({
        week: weekLabel,
        totalSeconds: weekSecs,
        hours: Number((weekSecs / 3600).toFixed(1)),
      })
    }

    // 3. Quiz Scores (from real quiz sessions)
    const quizzes: QuizScorePoint[] = (quizHistory || []).map((q) => ({
      date: new Date(q.taken_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      score: q.score,
      total: q.total,
      percentage: Math.round((q.score / (q.total || 1)) * 100),
      subject: q.subject,
      difficulty: q.difficulty || 'medium',
    }))

    // 4. Warning Stats (last 14 days)
    const warningsArr: WarningStatPoint[] = daily.map((d) => {
      const data = sessionMapByDate.get(d.date)
      return {
        date: d.dateLabel,
        warnings: data ? data.warnings : 0,
      }
    })

    // 5. Streaks: A day qualifies if actual >= 300 seconds (5 min)
    let longest = 0
    let tempStreak = 0

    // Compute longest across all 90 days in chronological order
    for (const dStr of dates90) {
      const item = sessionMapByDate.get(dStr)
      if (item && item.actual >= 300) {
        tempStreak += 1
        if (tempStreak > longest) longest = tempStreak
      } else {
        tempStreak = 0
      }
    }

    const current = calculateCurrentStreak(sessions)

    // 6. Aggregate Totals
    let totalSecs = 0
    sessions.forEach((s) => {
      totalSecs += s.actual_duration_s || 0
    })

    const totalCount = sessions.length
    const avgSecs = totalCount > 0 ? Math.round(totalSecs / totalCount) : 0

    // Best day this week (last 7 days)
    let bestDay = { label: 'None', minutes: 0 }
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * oneDayMs)
      const dStr = d.toISOString().split('T')[0]
      const data = sessionMapByDate.get(dStr)
      const mins = data ? Math.round(data.actual / 60) : 0
      if (mins > bestDay.minutes) {
        bestDay = {
          label: d.toLocaleDateString(undefined, { weekday: 'long' }),
          minutes: mins,
        }
      }
    }

    return {
      dailyData: daily,
      weeklyData: weekly,
      quizScores: quizzes,
      warningStats: warningsArr,
      currentStreak: current,
      longestStreak: Math.max(current, longest),
      calendarData: calendar,
      totalSecondsAllTime: totalSecs,
      completedSessionsCount: totalCount,
      avgSessionSeconds: avgSecs,
      bestDayThisWeek: bestDay,
    }
  }, [sessions, quizHistory])

  return {
    dailyData,
    weeklyData,
    quizScores,
    warningStats,
    currentStreak,
    longestStreak,
    calendarData,
    totalSecondsAllTime,
    completedSessionsCount,
    avgSessionSeconds,
    bestDayThisWeek,
    sessions,
    loading,
  }
}
