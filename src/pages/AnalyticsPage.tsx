import * as React from 'react'
import { Link } from 'react-router-dom'
import { useAnalytics } from '@/hooks/useAnalytics'
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
  ArrowRight,
  TrendingUp,
  BrainCircuit,
} from 'lucide-react'

function formatSecondsHhMm(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return '0h 0m'
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  return `${hours}h ${minutes}m`
}

function getHeatmapColor(minutes: number): string {
  if (!minutes || minutes === 0) return 'bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700'
  if (minutes <= 30) return 'bg-indigo-100 border-indigo-200 dark:bg-indigo-950 dark:border-indigo-900'
  if (minutes <= 60) return 'bg-indigo-300 border-indigo-400 dark:bg-indigo-800 dark:border-indigo-700'
  if (minutes <= 120) return 'bg-indigo-500 border-indigo-600 dark:bg-indigo-600 dark:border-indigo-500'
  return 'bg-indigo-700 border-indigo-800 dark:bg-indigo-400 dark:border-indigo-300'
}

function formatHeatmapDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function AnalyticsPage() {
  const { toast } = useToast()
  const { isPremium } = useSubscriptionStore()
  const premium = isPremium()

  const {
    dailyData,
    weeklyData,
    quizScores,
    warningStats,
    currentStreak,
    longestStreak,
    recordDays,
    calendarData,
    totalSecondsAllTime,
    completedSessionsCount,
    avgSessionSeconds,
    bestDayThisWeek,
    sessions,
    loading,
  } = useAnalytics()

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

  // Export Data Handler (Premium Feature)
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
      const exportPayload = {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        stats: {
          currentStreak,
          longestStreak,
          completedSessionsCount,
          totalStudySeconds: totalSecondsAllTime,
        },
        sessions: sessions.map((s) => ({
          id: s.id,
          subject: s.subject?.name || 'General',
          started_at: s.started_at,
          ended_at: s.ended_at,
          planned_duration_s: s.planned_duration_s,
          actual_duration_s: s.actual_duration_s,
          warnings: s.warning_count,
          notes: s.notes,
        })),
        quizzes: quizScores,
      }

      const jsonBlob = new Blob([JSON.stringify(exportPayload, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(jsonBlob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `syncstudy-analytics-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      URL.revokeObjectURL(url)

      toast({
        title: 'Data Exported!',
        description: 'Your study history was downloaded as JSON.',
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

  // Align the actual 90-day window to Monday-Sunday columns. Padding cells are
  // intentionally null so the grid never invents future activity dates.
  const calendarWeeks = React.useMemo(() => {
    if (calendarData.length === 0) return []
    const firstDate = new Date(`${calendarData[0].date}T12:00:00`)
    const leadingDays = (firstDate.getDay() + 6) % 7
    const weeks: Array<Array<(typeof calendarData)[number] | null>> = []

    calendarData.forEach((day, index) => {
      const position = leadingDays + index
      const weekIndex = Math.floor(position / 7)
      if (!weeks[weekIndex]) weeks[weekIndex] = Array(7).fill(null)
      weeks[weekIndex][position % 7] = day
    })
    return weeks
  }, [calendarData])

  const heatmapGridStyle = React.useMemo(
    () => ({ gridTemplateColumns: `3rem repeat(${calendarWeeks.length}, minmax(1rem, 1fr))` }),
    [calendarWeeks.length]
  )

  const getMonthLabel = (week: Array<(typeof calendarData)[number] | null>, weekIndex: number) => {
    const days = week.filter((day): day is (typeof calendarData)[number] => day !== null)
    if (days.length === 0) return ''
    const boundaryDay = days.find((day) => new Date(`${day.date}T12:00:00`).getDate() === 1)
    if (weekIndex === 0 || boundaryDay) {
      const date = boundaryDay || days[0]
      return new Date(`${date.date}T12:00:00`).toLocaleDateString(undefined, { month: 'short' })
    }
    return ''
  }

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
            Export Data
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
                Upgrade to Premium or redeem code UNLOCKALL to access full 90-day history, the streak heatmap, and CSV/JSON export.
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

      {/* Streak Calendar (Heatmap) - Premium Feature */}
      <Card className="surface-panel overflow-hidden">
        <CardHeader className="flex flex-col gap-4 border-b border-border/70 bg-gradient-to-r from-[#f8f7ff] to-white sm:flex-row sm:items-center sm:justify-between dark:from-indigo-950/30 dark:to-card">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-[#eeedff] p-2 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"><Calendar className="h-4 w-4" /></span>
              <CardTitle className="text-lg">Study Activity</CardTitle>
              {!premium && (
                <Badge variant="secondary" className="gap-1 text-[10px]">
                  <Lock className="w-3 h-3 text-amber-500" />
                  Premium Only
                </Badge>
              )}
            </div>
            <CardDescription className="mt-1 text-xs">
              Your recorded focus sessions and qualifying study activity across the last 90 days.
            </CardDescription>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-label="Activity intensity legend">
            <span>Less</span>
            {[0, 30, 60, 120, 121].map((level) => (
              <span key={level} className={`h-3.5 w-3.5 rounded-[4px] border ${getHeatmapColor(level)}`} />
            ))}
            <span>More</span>
          </div>
        </CardHeader>
        <CardContent className="relative">
          <div
            className={`overflow-x-auto pb-3 ${
              !premium ? 'blur-sm select-none pointer-events-none' : ''
            }`}
          >
            <div className="inline-flex min-w-max flex-col gap-2 p-1">
              <div className="grid gap-1.5 text-[10px] font-medium text-muted-foreground" style={heatmapGridStyle}>
                <span />
                {calendarWeeks.map((week, wIdx) => (
                  <span key={wIdx} className="text-center">
                    {getMonthLabel(week, wIdx)}
                  </span>
                ))}
              </div>
              <div className="grid gap-1.5" style={heatmapGridStyle}>
                <div className="grid grid-rows-7 gap-1.5 text-[10px] font-medium text-muted-foreground">
                  {['Mon', '', 'Wed', '', 'Fri', '', 'Sun'].map((label, index) => <span key={index}>{label}</span>)}
                </div>
                {calendarWeeks.map((week, wIdx) => (
                <div key={wIdx} className="grid grid-rows-7 gap-1.5">
                  {week.map((day, dayIndex) => day ? (
                    <div
                      key={day.date}
                      className={`h-4 w-4 rounded-[4px] border transition-transform hover:scale-125 hover:ring-2 hover:ring-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${getHeatmapColor(day.minutes)}`}
                      title={`${formatHeatmapDate(day.date)} — ${day.minutes} minutes, ${day.count} ${day.count === 1 ? 'activity' : 'activities'}`}
                      aria-label={`${formatHeatmapDate(day.date)}: ${day.minutes} minutes, ${day.count} ${day.count === 1 ? 'activity' : 'activities'}`}
                      tabIndex={0}
                    />
                  ) : (
                    <div key={`empty-${dayIndex}`} className="h-4 w-4" aria-hidden="true" />
                  ))}
                </div>
                ))}
              </div>
            </div>
          </div>

          {/* Premium Lock Overlay for Free Tier */}
          {!premium && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-[2px] p-6 text-center z-10">
              <div className="p-3 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mb-2">
                <Lock className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-foreground">
                Upgrade to View Full 90-Day Streak Heatmap
              </h4>
              <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-3">
                Visualize your long-term study consistency and build an unbreakable study routine.
              </p>
              <Link to="/premium">
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
                  Unlock Streak Heatmap
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
