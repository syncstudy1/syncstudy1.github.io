import * as React from "react"
import { Link } from "react-router-dom"
import { useAnalytics } from "@/hooks/useAnalytics"
import { useTasks } from "@/hooks/useTasks"
import { useQualifyingActivity } from "@/hooks/useQualifyingActivity"
import { getLocalDateKeyFromTimestamp } from "@/lib/activity"
import { buildAnalyticsPdf } from "@/lib/analyticsPdf"
import { useSubscriptionStore } from "@/stores/subscriptionStore"
import { Button } from "@/ui/button"
import { Badge } from "@/ui/badge"
import { useToast } from "@/ui/toast"
import { buildHeatmapWeeks, getHeatmapMonthLabel } from "@/lib/heatmap"
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
} from "recharts"
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
  BarChart3,
  Flame,
  CalendarDays,
  Sparkles,
} from "lucide-react"

function formatSecondsHhMm(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return "0h 0m"
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  return `${hours}h ${minutes}m`
}

function getHeatmapColor(minutes: number): string {
  if (!minutes || minutes === 0) return "bg-muted/40 border-border/40"
  if (minutes <= 30) return "bg-purple-200 border-purple-300 dark:bg-purple-950/60 dark:border-purple-800"
  if (minutes <= 60) return "bg-purple-400 border-purple-500 dark:bg-purple-800/80 dark:border-purple-600"
  if (minutes <= 120) return "bg-[#7651E8] border-[#6842D8] dark:bg-[#7651E8] dark:border-[#8E6DF0]"
  return "bg-purple-900 border-purple-950 text-white dark:bg-purple-400 dark:border-purple-300"
}

function formatHeatmapDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function AnalyticsPage() {
  const { toast } = useToast()
  const { isPremium } = useSubscriptionStore()
  const premium = isPremium()
  const { tasks } = useTasks()
  const { activities } = useQualifyingActivity()
  const [selectedDate, setSelectedDate] = React.useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
  })

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
    quizHistory,
    loading,
  } = useAnalytics()

  const selectedSessions = React.useMemo(
    () => sessions.filter((session) => getLocalDateKeyFromTimestamp(session.started_at) === selectedDate),
    [sessions, selectedDate]
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

  const streakThroughSelectedDate = React.useMemo(() => {
    const targetDate = new Date(`${selectedDate}T00:00:00`)
    if (Number.isNaN(targetDate.getTime())) return 0
    let count = 0
    let cursor = new Date(targetDate)

    const activityDates = new Set<string>()
    activities.forEach((activity) => activityDates.add(activity.activity_date))
    sessions
      .filter((session) => (session.actual_duration_s || 0) > 0)
      .forEach((session) => activityDates.add(getLocalDateKeyFromTimestamp(session.started_at)))
    quizHistory.forEach((quiz) => activityDates.add(getLocalDateKeyFromTimestamp(quiz.taken_at)))

    while (true) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`
      if (!activityDates.has(key)) break
      count++
      cursor.setDate(cursor.getDate() - 1)
    }
    return count
  }, [activities, quizHistory, selectedDate, sessions])

  const displayedDailyData = React.useMemo(() => {
    if (premium) return dailyData
    return dailyData.slice(-7)
  }, [dailyData, premium])

  const displayedTotalStudyTime = React.useMemo(() => {
    if (premium) return formatSecondsHhMm(totalSecondsAllTime)
    const sevenDaySeconds = displayedDailyData.reduce((acc, curr) => acc + curr.totalSeconds, 0)
    return formatSecondsHhMm(sevenDaySeconds)
  }, [displayedDailyData, premium, totalSecondsAllTime])

  const calendarWeeks = React.useMemo(() => buildHeatmapWeeks(calendarData), [calendarData])

  const heatmapGridStyle = React.useMemo(() => {
    return {
      gridTemplateColumns: `repeat(${calendarWeeks.length}, minmax(11px, 1fr))`,
    }
  }, [calendarWeeks.length])

  const handleExportData = () => {
    if (!premium) {
      toast({
        title: "SyncStudy Premium Feature",
        description: "PDF report export is available exclusively for Premium members.",
        type: "info",
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
        activityTypes: selectedActivities.map((activity) => activity.activity_type),
        streakDaysThroughDate: streakThroughSelectedDate,
        dailyData,
      })

      const downloadUrl = URL.createObjectURL(pdfBlob)
      const downloadLink = document.createElement("a")
      downloadLink.href = downloadUrl
      downloadLink.download = `syncstudy-analytics-${selectedDate}.pdf`
      document.body.appendChild(downloadLink)
      downloadLink.click()
      downloadLink.remove()
      URL.revokeObjectURL(downloadUrl)

      toast({
        title: "PDF Report Downloaded",
        description: `Exported analytics for ${selectedDate}.`,
        type: "success",
      })
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Could not generate PDF. Please try again.",
        type: "error",
      })
    }
  }

  return (
    <div className="page-shell">
      <div className="page-container space-y-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-2xl bg-primary/10 text-primary">
                <BarChart3 className="h-6 w-6" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-display">
                Analytics & Insights
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Visualize your focus habits, quiz performance, streaks, and subject distribution.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-9 px-3 rounded-xl bg-card border border-border text-xs font-semibold"
            />
            <Button
              onClick={handleExportData}
              variant="outline"
              size="sm"
              className="rounded-xl gap-2 text-xs font-semibold border-border/80 bg-card hover:bg-muted"
            >
              {premium ? <Download className="w-3.5 h-3.5 text-primary" /> : <Lock className="w-3.5 h-3.5 text-amber-500" />}
              <span>Download PDF Report</span>
            </Button>
          </div>
        </div>

        {/* Free Tier Notice Banner */}
        {!premium && (
          <div className="flex items-center justify-between p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs">
            <div className="flex items-center gap-2.5">
              <Sparkles className="h-4 w-4 text-amber-500 flex-shrink-0" />
              <span className="text-foreground">
                You are viewing the 7-day study window. Upgrade to Premium for 90-day history and complete PDF exports.
              </span>
            </div>
            <Link to="/premium">
              <Button size="sm" className="h-7 text-[11px] bg-amber-500 hover:bg-amber-600 text-white rounded-lg">
                Upgrade
              </Button>
            </Link>
          </div>
        )}

        {/* Key Stats Row (4 Metric Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="metric-card bg-card border-border/60">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total Focus Time
              </span>
              <Clock className="h-4 w-4 text-purple-500" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-foreground tabular-nums">
              {loading ? "..." : displayedTotalStudyTime}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {premium ? "All-time logged study" : "Past 7-day active focus"}
            </p>
          </div>

          <div className="metric-card bg-card border-border/60">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Sessions Completed
              </span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-foreground tabular-nums">
              {loading ? "..." : completedSessionsCount}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">Verified Pomodoro cycles</p>
          </div>

          <div className="metric-card bg-card border-border/60">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Avg. Session Length
              </span>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-foreground tabular-nums">
              {loading ? "..." : `${Math.round(avgSessionSeconds / 60)}m`}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">Average per study block</p>
          </div>

          <div className="metric-card bg-card border-border/60">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Current Streak
              </span>
              <Flame className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-foreground tabular-nums">
              {loading ? "..." : currentStreak} {currentStreak === 1 ? "Day" : "Days"}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">Longest: {longestStreak} days</p>
          </div>
        </div>

        {/* Charts Grid 1: Daily Focus & Planned vs Actual */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Focus Time Bar Chart */}
          <div className="surface-panel p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-foreground">Daily Focus Time</h2>
                <p className="text-xs text-muted-foreground">Study minutes logged per day</p>
              </div>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={displayedDailyData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="dateLabel" fontSize={11} tickLine={false} />
                  <YAxis fontSize={11} tickLine={false} unit="m" />
                  <Tooltip />
                  <Bar dataKey="minutes" fill="#7651E8" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Planned vs Actual Study Bar Chart */}
          <div className="surface-panel p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-foreground">Planned vs Actual Focus</h2>
                <p className="text-xs text-muted-foreground">Comparison of goal vs actual minutes</p>
              </div>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={displayedDailyData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="dateLabel" fontSize={11} tickLine={false} />
                  <YAxis fontSize={11} tickLine={false} unit="m" />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="plannedMinutes" name="Target" fill="#FFD8C2" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="minutes" name="Actual" fill="#7651E8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Charts Grid 2: Weekly Trend & Quiz Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weekly Study Hours Trend Line Chart */}
          <div className="surface-panel p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-foreground">Weekly Study Trend</h2>
                <p className="text-xs text-muted-foreground">Cumulative hours studied per week</p>
              </div>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="week" fontSize={11} tickLine={false} />
                  <YAxis fontSize={11} tickLine={false} unit="h" />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="hours"
                    stroke="#7651E8"
                    strokeWidth={3}
                    dot={{ fill: "#7651E8", r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quiz Score Performance */}
          <div className="surface-panel p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-foreground">Quiz Scores</h2>
                <p className="text-xs text-muted-foreground">Historical test percentages over time</p>
              </div>
            </div>
            {quizScores.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-muted-foreground text-xs">
                <BrainCircuit className="h-8 w-8 mb-2 opacity-50" />
                <p>No practice quiz records available.</p>
                <Link to="/quiz" className="text-primary hover:underline font-semibold mt-1">
                  Take a quiz
                </Link>
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={quizScores}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="date" fontSize={11} tickLine={false} />
                    <YAxis fontSize={11} tickLine={false} unit="%" domain={[0, 100]} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="percentage"
                      stroke="#E9A23B"
                      strokeWidth={3}
                      dot={{ fill: "#E9A23B", r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* 90-Day Streak Activity Heatmap */}
        <div className="surface-panel p-6 sm:p-8 space-y-4 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span>90-Day Study Activity Heatmap</span>
              </h2>
              <p className="text-xs text-muted-foreground">Consistency is the single biggest predictor of mastery</p>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span>Less</span>
              <span className="h-2.5 w-2.5 rounded bg-muted/40" />
              <span className="h-2.5 w-2.5 rounded bg-purple-200 dark:bg-purple-950" />
              <span className="h-2.5 w-2.5 rounded bg-purple-400 dark:bg-purple-800" />
              <span className="h-2.5 w-2.5 rounded bg-[#7651E8]" />
              <span>More</span>
            </div>
          </div>

          {/* Heatmap Grid */}
          <div className="overflow-x-auto pb-2">
            <div className="min-w-[620px]">
              <div className="grid gap-1.5" style={heatmapGridStyle}>
                {calendarWeeks.map((week, wIdx) => (
                  <div key={wIdx} className="grid grid-rows-7 gap-1.5">
                    {week.map((d, dIdx) => (
                      <div
                        key={dIdx}
                        className={`h-3 w-3 rounded-sm border ${
                          d ? getHeatmapColor(d.minutes) : "opacity-0"
                        }`}
                        title={d ? `${formatHeatmapDate(d.date)}: ${d.minutes} minutes` : ""}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Premium Lock Overlay for Free Tier */}
          {!premium && (
            <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-10">
              <Lock className="h-8 w-8 text-amber-500 mb-2" />
              <h3 className="text-base font-bold text-foreground">Full 90-Day Heatmap is a Premium Feature</h3>
              <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
                Track long-term learning consistency and visual streaks across months of study.
              </p>
              <Link to="/premium">
                <Button size="sm" className="bg-[#7651E8] hover:bg-[#6842D8] text-white rounded-xl">
                  Unlock with Premium
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Sessions Record Table */}
        <div className="surface-panel p-5 sm:p-6 space-y-4">
          <h2 className="text-base font-bold text-foreground">Recent Study Records</h2>
          {sessions.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">No study records logged yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border/80 text-muted-foreground uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Subject</th>
                    <th className="py-2.5 px-3">Date & Time</th>
                    <th className="py-2.5 px-3">Duration</th>
                    <th className="py-2.5 px-3">Target</th>
                    <th className="py-2.5 px-3">Distractions</th>
                    <th className="py-2.5 px-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-medium">
                  {sessions.slice(0, 15).map((s) => (
                    <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-foreground">
                        {s.subject?.name || "Independent"}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground">
                        {new Date(s.started_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                      </td>
                      <td className="py-2.5 px-3 text-primary font-bold tabular-nums">
                        {formatSecondsHhMm(s.actual_duration_s || 0)}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground tabular-nums">
                        {formatSecondsHhMm(s.planned_duration_s || 0)}
                      </td>
                      <td className="py-2.5 px-3">
                        {s.warning_count && s.warning_count > 0 ? (
                          <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
                            {s.warning_count}
                          </Badge>
                        ) : (
                          <span className="text-emerald-500 font-semibold">0</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground max-w-xs truncate">
                        {s.notes || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
