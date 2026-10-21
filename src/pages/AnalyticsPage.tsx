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
  if (!minutes || minutes === 0) return 'bg-muted/40 border-border/40'
  if (minutes <= 30) return 'bg-emerald-200 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-800'
  if (minutes <= 60) return 'bg-emerald-400 dark:bg-emerald-800 border-emerald-500 dark:border-emerald-700'
  if (minutes <= 120) return 'bg-emerald-500 dark:bg-emerald-600 border-emerald-600 dark:border-emerald-500'
  return 'bg-emerald-600 dark:bg-emerald-400 border-emerald-700 dark:border-emerald-300'
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

  // Format Heatmap calendar into columns of 7 days (13 weeks)
  const calendarWeeks = React.useMemo(() => {
    const weeks: (typeof calendarData)[] = []
    for (let i = 0; i < calendarData.length; i += 7) {
      weeks.push(calendarData.slice(i, i + 7))
    }
    return weeks
  }, [calendarData])

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8 sm:py-10 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white">
            <span className="rounded-xl bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300"><TrendingUp className="h-6 w-6" /></span>
            Analytics & Progress
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track daily study output, streak momentum, focus retention, and quiz achievements.
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {premium ? 'Total Time (All Time)' : 'Total Time (7 Days)'}
            </CardTitle>
            <Clock className="w-4 h-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
              {loading ? '...' : displayedTotalStudyTime}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Recorded deep work</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Sessions Completed
            </CardTitle>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
              {loading ? '...' : completedSessionsCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Focus intervals finished</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Avg. Session Length
            </CardTitle>
            <Calendar className="w-4 h-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
              {loading ? '...' : `${Math.round(avgSessionSeconds / 60)} min`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Per study session</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Best Day This Week
            </CardTitle>
            <img src="/streak-flame.svg" alt="" className="w-4 h-4 object-contain" />
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Daily Study Time Chart */}
        <Card className="shadow-sm">
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
        <Card className="shadow-sm">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Weekly Trend */}
        <Card className="shadow-sm">
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
        <Card className="shadow-sm">
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
      <Card className="shadow-sm overflow-hidden relative">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Streak Calendar (90 Days)</CardTitle>
              {!premium && (
                <Badge variant="secondary" className="gap-1 text-[10px]">
                  <Lock className="w-3 h-3 text-amber-500" />
                  Premium Only
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs">
              Daily habit consistency heatmap over the past quarter
            </CardDescription>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Less</span>
            <div className="w-3 h-3 rounded-sm bg-muted/40 border border-border/40" />
            <div className="w-3 h-3 rounded-sm bg-emerald-200 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-800" />
            <div className="w-3 h-3 rounded-sm bg-emerald-400 dark:bg-emerald-800 border border-emerald-500 dark:border-emerald-700" />
            <div className="w-3 h-3 rounded-sm bg-emerald-500 dark:bg-emerald-600 border border-emerald-600 dark:border-emerald-500" />
            <div className="w-3 h-3 rounded-sm bg-emerald-600 dark:bg-emerald-400 border border-emerald-700 dark:border-emerald-300" />
            <span>More</span>
          </div>
        </CardHeader>
        <CardContent className="relative">
          <div
            className={`overflow-x-auto pb-2 ${
              !premium ? 'blur-sm select-none pointer-events-none' : ''
            }`}
          >
            <div className="inline-flex gap-1.5 min-w-max p-1">
              {calendarWeeks.map((week, wIdx) => (
                <div key={wIdx} className="flex flex-col gap-1.5">
                  {week.map((day) => (
                    <div
                      key={day.date}
                      className={`w-3.5 h-3.5 rounded-sm border ${getHeatmapColor(day.minutes)}`}
                      title={`${day.date}: ${day.minutes} min`}
                    />
                  ))}
                </div>
              ))}
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
      <Card className="shadow-sm">
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
      <Card className="shadow-sm">
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
  )
}
