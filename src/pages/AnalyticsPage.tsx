import * as React from 'react'
import { Link } from 'react-router-dom'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useTasks } from '@/hooks/useTasks'
import { useQualifyingActivity } from '@/hooks/useQualifyingActivity'
import { getLocalDateKeyFromTimestamp, getQualifyingActivityDates } from '@/lib/activity'
import { buildAnalyticsPdf } from '@/lib/analyticsPdf'
import { StudyCalendar } from '@/components/analytics/StudyCalendar'
import { getDateFromCalendarKey, getLocalDateKeyForCalendar, shiftCalendarMonth } from '@/lib/studyCalendar'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import { Button } from '@/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/ui/card'
import { Badge } from '@/ui/badge'
import { useToast } from '@/ui/toast'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts'
import {
  Trophy,
  Download,
  Lock,
  Clock,
  CheckCircle2,
  Calendar,
  Zap,
  AlertTriangle,
  TrendingUp,
  BrainCircuit,
} from 'lucide-react'

function formatSecondsHhMm(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return '0h 0m'
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  return `${hours}h ${minutes}m`
}

export function AnalyticsPage() {
  const { toast } = useToast()
  const { isPremium } = useSubscriptionStore()
  const premium = isPremium()
  const { tasks } = useTasks()
  const { activities } = useQualifyingActivity()
  const [selectedDate, setSelectedDate] = React.useState(() => {
    return getLocalDateKeyForCalendar(new Date())
  })
  const [calendarMonth, setCalendarMonth] = React.useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1, 12, 0, 0, 0)
  })

  const {
    dailyData,
    weeklyData,
    quizScores,
    warningStats,
    currentStreak,
    longestStreak,
    recordDays,
    totalSecondsAllTime,
    completedSessionsCount,
    avgSessionSeconds,
    bestDayThisWeek,
    sessions,
    quizHistory,
    loading,
  } = useAnalytics()

  const selectedSessions = React.useMemo(
    () => sessions.filter((session) => getLocalDateKeyFromTimestamp(session.started_at) === selectedDate),
    [sessions, selectedDate]
  )
  const selectedQualifyingSessions = React.useMemo(
    () => selectedSessions.filter((session) => (session.actual_duration_s || 0) > 0),
    [selectedSessions]
  )
  const selectedTasks = React.useMemo(() => tasks.filter((task) => task.deadline === selectedDate), [tasks, selectedDate])
  const selectedQuizzes = React.useMemo(
    () => quizHistory.filter((quiz) => getLocalDateKeyFromTimestamp(quiz.taken_at) === selectedDate),
    [quizHistory, selectedDate]
  )
  const selectedActivities = React.useMemo(
    () => activities.filter((activity) => activity.activity_date === selectedDate),
    [activities, selectedDate]
  )
  const qualifyingActivityDates = React.useMemo(
    () => getQualifyingActivityDates(
      activities,
      sessions
        .filter((session) => (session.actual_duration_s || 0) > 0)
        .map((session) => getLocalDateKeyFromTimestamp(session.started_at)),
      quizHistory.map((quiz) => getLocalDateKeyFromTimestamp(quiz.taken_at)),
    ),
    [activities, quizHistory, sessions]
  )
  const streakThroughSelectedDate = React.useMemo(() => {
    const dates = new Set<string>([
      ...activities.map((activity) => activity.activity_date),
      ...sessions.filter((session) => (session.actual_duration_s || 0) > 0).map((session) => getLocalDateKeyFromTimestamp(session.started_at)),
    ])
    let count = 0
    const cursor = new Date(`${selectedDate}T12:00:00`)
    while (dates.has(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`)) {
      count += 1
      cursor.setDate(cursor.getDate() - 1)
    }
    return count
  }, [activities, selectedDate, sessions])

  // Filter daily data for free tier (last 7 days only)
  const displayedDailyData = React.useMemo(() => {
    if (premium) return dailyData
    return dailyData.slice(-7)
  }, [dailyData, premium])

  // Total study time: 7 days for free, all-time for premium
  const displayedTotalStudyTime = React.useMemo(() => {
    if (premium) {
      return formatSecondsHhMm(totalSecondsAllTime)
    }
    const last7DaysSecs = dailyData.slice(-7).reduce((acc, d) => acc + d.totalSeconds, 0)
    return formatSecondsHhMm(last7DaysSecs)
  }, [dailyData, premium, totalSecondsAllTime])

  // Export selected-date report (Premium Feature)
  const handleExportData = () => {
    if (!premium) {
      toast({
        title: 'Premium Required',
        description: 'Exporting your study data history is available exclusively on SyncStudy Premium.',
        type: 'info',
      })
      return
    }

    try {
      const pdfBlob = buildAnalyticsPdf({
        date: selectedDate,
        sessions: selectedSessions,
        tasks: selectedTasks,
        quizzes: selectedQuizzes,
        activityCount: selectedActivities.length,
        activityTypes: selectedActivities.map((activity) => activity.activity_type.replace('_', ' ')),
        streakDaysThroughDate: streakThroughSelectedDate,
        dailyData,
      })
      const url = URL.createObjectURL(pdfBlob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `syncstudy-analytics-${selectedDate}.pdf`
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      URL.revokeObjectURL(url)

      toast({
        title: 'Analytics PDF downloaded',
        description: `The report for ${selectedDate} was downloaded.`,
        type: 'success',
      })
    } catch {
      toast({
        title: 'Export Failed',
        description: 'Could not export data. Please try again.',
        type: 'error',
      })
    }
  }

  const handleCalendarDateSelect = (date: string) => {
    setSelectedDate(date)
    const selectedMonth = getDateFromCalendarKey(date)
    setCalendarMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1, 12, 0, 0, 0))
  }

  const handleCalendarToday = () => {
    const today = new Date()
    setSelectedDate(getLocalDateKeyForCalendar(today))
    setCalendarMonth(new Date(today.getFullYear(), today.getMonth(), 1, 12, 0, 0, 0))
  }

  const selectedDateLabel = getDateFromCalendarKey(selectedDate).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  const selectedStudySeconds = selectedQualifyingSessions.reduce(
    (total, session) => total + (session.actual_duration_s || 0),
    0,
  )

  return (
    <div className="page-shell">
    <div className="page-container space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="section-kicker mb-2">Your study signals</p>
          <h1 className="page-heading flex items-center gap-3">
            <span className="rounded-2xl bg-[#eeedff] p-2.5 text-indigo-700 shadow-sm dark:bg-indigo-950/60 dark:text-indigo-300"><TrendingUp className="h-6 w-6" /></span>
            Analytics &amp; Progress
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            See how consistently you study, where your time goes, and how your practice is building momentum.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Current Streak Badge */}
          <Badge className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800 px-3 py-1.5 text-xs gap-1.5 font-semibold">
            <img src="/streak-flame.svg" alt="" className="w-4 h-4 object-contain" />
            <span>{currentStreak} Day Streak</span>
          </Badge>

          {/* Longest Streak Badge */}
          <Badge className="bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-400 border border-purple-300 dark:border-purple-800 px-3 py-1.5 text-xs gap-1.5 font-semibold">
            <Trophy className="w-4 h-4 text-purple-500" />
            <span>Record: {longestStreak} Days</span>
          </Badge>

          {/* Distinct qualifying activity days */}
          <Badge className="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-800 px-3 py-1.5 text-xs gap-1.5 font-semibold">
            <Calendar className="w-4 h-4 text-indigo-500" />
            <span>Record Days: {recordDays}</span>
          </Badge>

          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Report date
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="h-9 rounded-xl border border-input bg-card px-2 text-foreground"
            />
          </label>

          {/* Export Data Button */}
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1.5"
            onClick={handleExportData}
          >
            {premium ? (
              <Download className="w-3.5 h-3.5" />
            ) : (
              <Lock className="w-3.5 h-3.5 text-amber-500" />
            )}
            Download Analytics
          </Button>
        </div>
      </div>

      {/* Free Tier Notice Banner */}
      {!premium && (
        <div className="rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/60 dark:bg-indigo-950/30 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-600 text-white shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-foreground">
                Free Tier View: Showing 7 Days History
              </p>
              <p className="text-muted-foreground">
                Upgrade to Premium or redeem code UNLOCKALL to access full study history and PDF analytics reports.
              </p>
            </div>
          </div>
          <Link to="/premium" className="shrink-0">
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
              Upgrade to Premium
            </Button>
          </Link>
        </div>
      )}

      {/* Key Stats Row (4 Cards) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="surface-panel border-l-4 border-l-indigo-400">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {premium ? 'Total Time (All Time)' : 'Total Time (7 Days)'}
            </CardTitle>
            <span className="rounded-lg bg-[#eeedff] p-2 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"><Clock className="h-4 w-4" /></span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
              {loading ? '...' : displayedTotalStudyTime}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Recorded deep work</p>
          </CardContent>
        </Card>

        <Card className="surface-panel">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Sessions Completed
            </CardTitle>
            <span className="rounded-lg bg-[#ddf5ea] p-2 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"><CheckCircle2 className="h-4 w-4" /></span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
              {loading ? '...' : completedSessionsCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Focus intervals finished</p>
          </CardContent>
        </Card>

        <Card className="surface-panel">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Avg. Session Length
            </CardTitle>
            <span className="rounded-lg bg-[#e8f1ff] p-2 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300"><Calendar className="h-4 w-4" /></span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
              {loading ? '...' : `${Math.round(avgSessionSeconds / 60)} min`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Per study session</p>
          </CardContent>
        </Card>

        <Card className="surface-panel border-l-4 border-l-amber-400">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Best Day This Week
            </CardTitle>
            <span className="rounded-lg bg-[#fff8ec] p-2 dark:bg-amber-950/50"><img src="/streak-flame.svg" alt="" className="h-4 w-4 object-contain" /></span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {bestDayThisWeek.label}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {bestDayThisWeek.minutes} minutes logged
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts: Daily Study Time & Planned vs Actual */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Daily Study Time Chart */}
        <Card className="surface-panel">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Daily Focus Time</CardTitle>
                <CardDescription className="text-xs">
                  {premium ? 'Study minutes logged per day (last 14 days)' : 'Study minutes logged (last 7 days)'}
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs">
                Minutes
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={displayedDailyData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: any) => [`${value} min`, 'Focused']}
                    contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Bar dataKey="minutes" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Planned vs Actual Comparison */}
        <Card className="surface-panel">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Planned vs. Actual Study</CardTitle>
                <CardDescription className="text-xs">
                  Goal adherence over the last 7 days
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs">
                Comparison
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData.slice(-7)}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: any, name: any) => [
                      `${value} min`,
                      name === 'minutes' ? 'Actual' : 'Planned',
                    ]}
                    contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Legend
                    formatter={(value) => (value === 'minutes' ? 'Actual Focus' : 'Planned Target')}
                    wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                  />
                  <Bar dataKey="plannedMinutes" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="minutes" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Charts: Weekly Trend Line Chart & Quiz Mastery */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Weekly Trend */}
        <Card className="surface-panel">
          <CardHeader>
            <CardTitle className="text-base">Weekly Study Hours Trend</CardTitle>
            <CardDescription className="text-xs">
              Aggregate study volume across the last 8 weeks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(val: any) => [`${val} hrs`, 'Total Study']}
                    contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="hours"
                    stroke="#8b5cf6"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Quiz Scores Mastery Trend */}
        <Card className="surface-panel">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Quiz Score Performance</CardTitle>
                <CardDescription className="text-xs">
                  Percentage scores on generated practice quizzes
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                Practice Quizzes
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-60 w-full">
              {quizScores.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-2">
                  <BrainCircuit className="w-8 h-8 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">No quiz scores recorded yet.</p>
                  <Link to="/quiz">
                    <Button size="sm" variant="outline" className="text-xs">
                      Take a Quiz
                    </Button>
                  </Link>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={quizScores}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(val: any, _name: any, item: any) => [
                        `${val}% (${item.payload.subject})`,
                        'Score',
                      ]}
                      contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="percentage"
                      stroke="#f59e0b"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Study Calendar */}
      <Card className="surface-panel overflow-hidden">
        <CardHeader className="border-b border-border/70 bg-gradient-to-r from-[#f8f7ff] to-white dark:from-indigo-950/30 dark:to-card">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-[#eeedff] p-2 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"><Calendar className="h-4 w-4" /></span>
              <CardTitle className="text-lg">Study Calendar</CardTitle>
              {!premium && (
                <Badge variant="secondary" className="gap-1 text-[10px]">
                  <Lock className="w-3 h-3 text-amber-500" />
                  Premium History
                </Badge>
              )}
            </div>
            <CardDescription className="mt-1 text-xs">
              Track your study days, maintain your streak, and review your daily progress.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="relative p-4 sm:p-5">
          <div className={!premium ? 'blur-sm select-none pointer-events-none' : ''}>
            <StudyCalendar
              month={calendarMonth}
              selectedDate={selectedDate}
              activityDates={qualifyingActivityDates}
              loading={loading}
              onSelectDate={handleCalendarDateSelect}
              onPreviousMonth={() => setCalendarMonth((month) => shiftCalendarMonth(month, -1))}
              onNextMonth={() => setCalendarMonth((month) => shiftCalendarMonth(month, 1))}
              onToday={handleCalendarToday}
            />

            <div className="mt-6 border-t border-border/70 pt-5">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-sm font-semibold text-foreground">Activity for {selectedDateLabel}</h3>
                <span className="text-xs text-muted-foreground">Recorded activity only</span>
              </div>

              {selectedQualifyingSessions.length > 0 ? (
                <div className="mt-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border bg-muted/20 p-3">
                      <p className="text-lg font-bold text-foreground">{formatSecondsHhMm(selectedStudySeconds)}</p>
                      <p className="text-[11px] text-muted-foreground">Qualifying study time</p>
                    </div>
                    <div className="rounded-xl border bg-muted/20 p-3">
                      <p className="text-lg font-bold text-foreground">{selectedQualifyingSessions.length}</p>
                      <p className="text-[11px] text-muted-foreground">Study sessions</p>
                    </div>
                    <div className="col-span-2 rounded-xl border bg-muted/20 p-3 sm:col-span-1">
                      <p className="text-lg font-bold text-foreground">{selectedQuizzes.length}</p>
                      <p className="text-[11px] text-muted-foreground">Quiz attempts</p>
                    </div>
                  </div>
                  <div className="divide-y rounded-xl border">
                    {selectedQualifyingSessions.map((session) => (
                      <div key={session.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-xs">
                        <span className="font-medium text-foreground">{session.subject?.name || 'General Study'}</span>
                        <span className="font-mono text-muted-foreground">{formatSecondsHhMm(session.actual_duration_s)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : qualifyingActivityDates.has(selectedDate) ? (
                <p className="mt-3 rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
                  Qualifying activity was recorded for this date, but no completed study-session details are available.
                </p>
              ) : (
                <p className="mt-3 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                  No recorded study activity for this date.
                </p>
              )}
            </div>
          </div>

          {/* Premium Lock Overlay for Free Tier */}
          {!premium && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-[2px] p-6 text-center z-10">
              <div className="p-3 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mb-2">
                <Lock className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-foreground">
                Upgrade to View Full Study Calendar
              </h4>
              <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-3">
                Visualize your long-term study consistency and build an unbreakable study routine.
              </p>
              <Link to="/premium">
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
                  Unlock Study Calendar
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Warning Stats & Distraction Trends */}
      <Card className="surface-panel">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Distraction Frequency & Posture Shifts
              </CardTitle>
              <CardDescription className="text-xs">
                Warnings logged by computer vision monitor over the last 14 days
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={warningStats}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(val: any) => [`${val} warnings`, 'Distractions']}
                  contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="warnings" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Recent Sessions Table (Last 20) */}
      <Card className="surface-panel">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Focus Sessions Record</CardTitle>
            <CardDescription className="text-xs">
              Audit log of completed study intervals
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs">
            {sessions.length} recorded
          </Badge>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-xs italic">
              No sessions found in study records.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 text-muted-foreground font-semibold">
                  <tr>
                    <th className="p-2.5 rounded-l-md">Subject</th>
                    <th className="p-2.5">Date & Time</th>
                    <th className="p-2.5">Duration</th>
                    <th className="p-2.5">Target</th>
                    <th className="p-2.5">Warnings</th>
                    <th className="p-2.5 rounded-r-md">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sessions.slice(0, 20).map((s) => (
                    <tr key={s.id} className="hover:bg-muted/20">
                      <td className="p-2.5 font-medium flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: s.subject?.color || '#6366f1' }}
                        />
                        <span>{s.subject?.name || 'General Study'}</span>
                      </td>
                      <td className="p-2.5 text-muted-foreground">
                        {new Date(s.started_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        at{' '}
                        {new Date(s.started_at).toLocaleTimeString(undefined, {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="p-2.5 font-mono font-medium">
                        {formatSecondsHhMm(s.actual_duration_s)}
                      </td>
                      <td className="p-2.5 font-mono text-muted-foreground">
                        {formatSecondsHhMm(s.planned_duration_s)}
                      </td>
                      <td className="p-2.5">
                        {s.warning_count > 0 ? (
                          <span className="text-amber-600 font-medium">
                            {s.warning_count} ⚠
                          </span>
                        ) : (
                          <span className="text-emerald-600">0</span>
                        )}
                      </td>
                      <td className="p-2.5 text-muted-foreground max-w-xs truncate">
                        {s.notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </div>
  )
}
