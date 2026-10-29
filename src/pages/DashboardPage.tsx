import * as React from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuthStore } from "@/stores/authStore"
import { useStudySessions } from "@/hooks/useStudySessions"
import { useQualifyingActivity } from "@/hooks/useQualifyingActivity"
import { useTasks } from "@/hooks/useTasks"
import { useSubjects } from "@/hooks/useSubjects"
import { calculateStreakStats, getLocalDateKeyFromTimestamp } from "@/lib/activity"
import { Button } from "@/ui/button"
import { Badge } from "@/ui/badge"
import {
  Timer,
  Clock,
  CheckCircle2,
  Circle,
  Calendar,
  Sparkles,
  ArrowRight,
  BookOpen,
  BrainCircuit,
  Plus,
  Play,
  Flame,
  TrendingUp,
  Target,
  ChevronLeft,
  ChevronRight,
  ListTodo,
} from "lucide-react"

function formatDurationHhMm(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return "0m"
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuthStore()
  const { sessions, loading: sessionsLoading, todayTotalSeconds, weekTotalSeconds } = useStudySessions()
  const { activities } = useQualifyingActivity()
  const { tasks, loading: tasksLoading, updateTaskStatus, createTask } = useTasks()
  const { subjects, loading: subjectsLoading } = useSubjects()

  const [currentCalendarDate, setCurrentCalendarDate] = React.useState(new Date())
  const [quickTaskTitle, setQuickTaskTitle] = React.useState("")
  const [isAddingTask, setIsAddingTask] = React.useState(false)

  const userName = profile?.full_name?.split(" ")[0] || user?.user_metadata?.full_name?.split(" ")[0] || "Scholar"
  const greeting = getGreeting()

  // Streak calculation
  const currentStreak = React.useMemo(() => {
    const dates = new Set(activities.map((activity) => activity.activity_date))
    sessions
      .filter((session) => (session.actual_duration_s || 0) > 0)
      .forEach((session) => dates.add(getLocalDateKeyFromTimestamp(session.started_at)))
    return calculateStreakStats(dates).currentStreak
  }, [activities, sessions])

  // Completed tasks count
  const completedTasksCount = React.useMemo(() => {
    return tasks.filter((t) => t.status === "done").length
  }, [tasks])

  // Pending tasks
  const pendingTasks = React.useMemo(() => {
    return tasks.filter((t) => t.status !== "done").slice(0, 6)
  }, [tasks])

  // Recent sessions
  const recentSessions = React.useMemo(() => {
    return [...sessions]
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
      .slice(0, 5)
  }, [sessions])

  // Subject completion stats
  const subjectStats = React.useMemo(() => {
    return subjects.map((subj) => {
      const subjTasks = tasks.filter((t) => t.subject_id === subj.id)
      const doneCount = subjTasks.filter((t) => t.status === "done").length
      const totalCount = subjTasks.length
      const percent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0
      const subjSessions = sessions.filter((s) => s.subject_id === subj.id)
      const totalSecs = subjSessions.reduce((acc, s) => acc + (s.actual_duration_s || 0), 0)
      return {
        ...subj,
        totalTasks: totalCount,
        doneTasks: doneCount,
        percent,
        studyTimeFormatted: formatDurationHhMm(totalSecs),
      }
    })
  }, [subjects, tasks, sessions])

  // Quick task creation
  const handleCreateQuickTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickTaskTitle.trim()) return
    setIsAddingTask(true)
    try {
      await createTask({
        title: quickTaskTitle.trim(),
        subject_id: subjects[0]?.id,
      })
      setQuickTaskTitle("")
    } catch (err) {
      console.error("Failed to create task", err)
    } finally {
      setIsAddingTask(false)
    }
  }

  // Calendar dates computation
  const calendarDays = React.useMemo(() => {
    const year = currentCalendarDate.getFullYear()
    const month = currentCalendarDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startingDayIndex = (firstDay.getDay() + 6) % 7 // Monday start (0-6)
    const totalDays = lastDay.getDate()

    const activityDates = new Set(activities.map((a) => a.activity_date))
    sessions.forEach((s) => {
      if ((s.actual_duration_s || 0) > 0) {
        activityDates.add(getLocalDateKeyFromTimestamp(s.started_at))
      }
    })

    const days = []
    // Previous month padding
    for (let i = 0; i < startingDayIndex; i++) {
      days.push({ day: null, hasActivity: false, isToday: false })
    }
    // Days of month
    const today = new Date()
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
      const isToday =
        today.getFullYear() === year && today.getMonth() === month && today.getDate() === d
      days.push({
        day: d,
        hasActivity: activityDates.has(dateStr),
        isToday,
      })
    }
    return days
  }, [currentCalendarDate, activities, sessions])

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

  return (
    <div className="page-shell">
      <div className="page-container space-y-6 sm:space-y-8">
        {/* Welcome Section (from Reference Image C) */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#FFF6ED] via-[#F8F1FF] to-[#EDEAFF] dark:from-[#1F1B2E] dark:via-[#1B1827] dark:to-[#171523] p-6 sm:p-8 border border-purple-200/50 dark:border-purple-900/30 shadow-sm">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/70 dark:bg-white/10 backdrop-blur-md border border-purple-200/60 dark:border-purple-800/40 text-xs font-semibold text-primary">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>{greeting}, {userName}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground font-display">
                Make space for{" "}
                <span className="bg-gradient-to-r from-[#7651E8] via-[#A78BFA] to-[#FF9B7A] bg-clip-text text-transparent">
                  meaningful learning.
                </span>
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Plan your day. Protect your focus. Make every session count.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link to="/study">
                <Button className="h-11 px-5 rounded-xl gap-2.5 font-semibold bg-[#7651E8] hover:bg-[#6842D8] text-white shadow-lg shadow-purple-500/25 transition-all hover:scale-[1.02]">
                  <Play className="w-4 h-4 fill-white" />
                  <span>Start Study Room</span>
                </Button>
              </Link>
              <Link to="/planner">
                <Button variant="outline" className="h-11 px-5 rounded-xl gap-2 bg-card/80 backdrop-blur border-border/80 hover:bg-card">
                  <BrainCircuit className="w-4 h-4 text-primary" />
                  <span>AI Planner</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Abstract ambient decorative backdrop */}
          <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-30 dark:opacity-10 pointer-events-none bg-gradient-to-l from-[#FFD8C2] to-transparent rounded-r-3xl" />
        </div>

        {/* Key Study Metrics (4 Cards from Reference Image C) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Today's Study Time */}
          <div className="metric-card bg-card border-border/60">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                <Clock className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                <TrendingUp className="h-3 w-3" />
                <span>Today</span>
              </span>
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Focus Time
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tabular-nums tracking-tight">
              {sessionsLoading ? "..." : formatDurationHhMm(todayTotalSeconds)}
            </h2>
            <p className="text-[11px] text-muted-foreground mt-2">
              {weekTotalSeconds > 0 ? `${formatDurationHhMm(weekTotalSeconds)} this week` : "Start a session to log hours"}
            </p>
          </div>

          {/* 2. Tasks Completed */}
          <div className="metric-card bg-card border-border/60">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-primary">
                {pendingTasks.length} pending
              </span>
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Tasks Completed
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tabular-nums tracking-tight">
              {tasksLoading ? "..." : completedTasksCount}
            </h2>
            <p className="text-[11px] text-muted-foreground mt-2">
              Across all linked subjects
            </p>
          </div>

          {/* 3. Focus Streak */}
          <div className="metric-card bg-card border-border/60">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Flame className="h-5 w-5" />
              </div>
              <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700 dark:text-amber-300">
                Active
              </Badge>
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Current Streak
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tabular-nums tracking-tight">
              {sessionsLoading ? "..." : currentStreak} {currentStreak === 1 ? "Day" : "Days"}
            </h2>
            <p className="text-[11px] text-muted-foreground mt-2">
              {currentStreak > 0 ? "Momentum is on your side!" : "Log a session today to start"}
            </p>
          </div>

          {/* 4. Active Subjects */}
          <div className="metric-card bg-card border-border/60">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <BookOpen className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                {subjects.length} Total
              </span>
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Study Subjects
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tabular-nums tracking-tight">
              {subjectsLoading ? "..." : subjects.length}
            </h2>
            <p className="text-[11px] text-muted-foreground mt-2">
              Organized with custom goals
            </p>
          </div>
        </div>

        {/* Main Dashboard Layout: Schedule / Recent (Left 2 cols) & Tasks / Calendar / Timer (Right 1 col) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Left Column (2 cols on large screen) */}
          <div className="lg:col-span-2 space-y-6 sm:space-y-8">
            {/* Today at a Glance / Schedule Panel (from Reference Image C) */}
            <div className="surface-panel p-5 sm:p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-border/60 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-foreground">
                      Today at a glance
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Your completed and upcoming study activities
                    </p>
                  </div>
                </div>
                <Link to="/study">
                  <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-primary hover:text-primary">
                    <span>Open Room</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>

              {/* Sessions Timeline */}
              {recentSessions.length === 0 ? (
                <div className="text-center py-10 px-4 rounded-2xl bg-muted/40 border border-dashed border-border">
                  <Timer className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-60" />
                  <p className="text-sm font-semibold text-foreground">No sessions recorded yet today</p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                    Ready to build your focus? Choose your study buddy and start a 25-minute Pomodoro session.
                  </p>
                  <Link to="/study">
                    <Button size="sm" className="bg-primary text-primary-foreground gap-1.5">
                      <Play className="h-3.5 w-3.5 fill-current" />
                      <span>Start Your First Session</span>
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentSessions.map((s, idx) => {
                    const subj = subjects.find((sub) => sub.id === s.subject_id)
                    const date = new Date(s.started_at)
                    const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    const durationStr = formatDurationHhMm(s.actual_duration_s || 0)

                    return (
                      <div
                        key={s.id || idx}
                        className="flex items-center justify-between p-3.5 rounded-xl border border-border/60 bg-card hover:bg-muted/40 transition-colors gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="h-3 w-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: subj?.color || "#A78BFA" }}
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">
                              {subj?.name || "Independent Study"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {timeStr} • {durationStr} logged
                              {s.warning_count && s.warning_count > 0 ? ` • ${s.warning_count} distractions` : ""}
                            </p>
                          </div>
                        </div>

                        <Badge
                          variant="outline"
                          className="text-[11px] font-medium border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 flex-shrink-0"
                        >
                          Completed
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Subject Pulse / Learning Progress (from Reference Image C) */}
            <div className="surface-panel p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-orange-500/10 text-orange-600 flex items-center justify-center">
                    <Target className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-foreground">Subject Pulse</h2>
                    <p className="text-xs text-muted-foreground">Progress across your active study subjects</p>
                  </div>
                </div>
                <Link to="/study" className="text-xs text-primary hover:underline font-medium">
                  Manage Subjects
                </Link>
              </div>

              {subjectStats.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  Loading subjects or no subjects created yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {subjectStats.slice(0, 4).map((subj) => (
                    <div key={subj.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="flex items-center gap-2 text-foreground">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: subj.color || "#7651E8" }}
                          />
                          {subj.name}
                        </span>
                        <span className="text-muted-foreground">
                          {subj.percent}% ({subj.doneTasks}/{subj.totalTasks} tasks) • {subj.studyTimeFormatted}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.max(subj.percent, 8)}%`,
                            backgroundColor: subj.color || "#7651E8",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Tasks, Calendar & Focus Timer Preview (from Reference Image C) */}
          <div className="space-y-6">
            {/* Today's Tasks Card (from Reference Image C) */}
            <div className="surface-panel p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div>
                  <h2 className="text-base font-bold text-foreground">Today's Tasks</h2>
                  <p className="text-xs text-muted-foreground">
                    {pendingTasks.length} tasks remaining • Stay consistent!
                  </p>
                </div>
              </div>

              {/* Quick Add Task Form */}
              <form onSubmit={handleCreateQuickTask} className="flex gap-2">
                <input
                  type="text"
                  value={quickTaskTitle}
                  onChange={(e) => setQuickTaskTitle(e.target.value)}
                  placeholder="Add a new task..."
                  disabled={isAddingTask}
                  className="flex-1 h-9 px-3 rounded-xl bg-muted/50 border border-border/80 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={isAddingTask || !quickTaskTitle.trim()}
                  className="h-9 px-3 rounded-xl bg-primary text-primary-foreground text-xs gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add</span>
                </Button>
              </form>

              {/* Task list */}
              {pendingTasks.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-1 opacity-80" />
                  <p className="text-xs font-semibold text-foreground">All caught up!</p>
                  <p className="text-[11px] text-muted-foreground">No pending tasks for today.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingTasks.map((t) => {
                    const subj = subjects.find((s) => s.id === t.subject_id)
                    return (
                      <div
                        key={t.id}
                        className="flex items-start gap-2.5 p-2.5 rounded-xl border border-border/60 bg-card hover:bg-muted/40 transition-colors group"
                      >
                        <button
                          type="button"
                          onClick={() => updateTaskStatus(t.id, "done")}
                          className="mt-0.5 text-muted-foreground hover:text-emerald-500 transition-colors flex-shrink-0"
                          title="Mark complete"
                        >
                          <Circle className="h-4 w-4" />
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                            {t.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {subj && (
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
                                style={{
                                  backgroundColor: `${subj.color}20`,
                                  color: subj.color,
                                }}
                              >
                                {subj.name}
                              </span>
                            )}
                            {t.deadline && (
                              <span className="text-[10px] text-muted-foreground">
                                Due {t.deadline}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Interactive Calendar Widget (from Reference Image C) */}
            <div className="surface-panel p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <span className="text-sm font-bold text-foreground">
                  {monthNames[currentCalendarDate.getMonth()]} {currentCalendarDate.getFullYear()}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentCalendarDate(
                        new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() - 1, 1)
                      )
                    }
                    className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentCalendarDate(new Date())}
                    className="px-2 py-0.5 text-[10px] font-semibold rounded bg-muted hover:bg-muted/80"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentCalendarDate(
                        new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 1)
                      )
                    }
                    className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Day header */}
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-muted-foreground">
                <span>MO</span>
                <span>TU</span>
                <span>WE</span>
                <span>TH</span>
                <span>FR</span>
                <span>SA</span>
                <span>SU</span>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {calendarDays.map((item, idx) => (
                  <div
                    key={idx}
                    className={`h-7 w-7 mx-auto rounded-full flex flex-col items-center justify-center text-xs relative ${
                      item.isToday
                        ? "bg-primary text-white font-bold shadow-sm"
                        : item.hasActivity
                        ? "font-semibold text-foreground bg-purple-500/10 text-primary"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {item.day || ""}
                    {item.hasActivity && !item.isToday && (
                      <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-primary" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Focus Timer Mini Card & Quote (from Reference Image C) */}
            <div className="surface-panel p-5 text-center space-y-4 bg-gradient-to-br from-card via-card to-[#FFF6ED]/30 dark:to-[#221A33]/30">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Target className="h-4 w-4 text-primary" />
                  Focus Timer
                </span>
                <span className="text-primary font-bold">25 min</span>
              </div>

              {/* Circular preview */}
              <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    className="stroke-muted"
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    className="stroke-primary"
                    strokeWidth="8"
                    strokeDasharray="251.2"
                    strokeDashoffset="62.8"
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-extrabold text-foreground tabular-nums">25:00</span>
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Focus</span>
                </div>
              </div>

              <Link to="/study" className="block w-full">
                <Button className="w-full bg-[#7651E8] hover:bg-[#6842D8] text-white rounded-xl gap-2 h-9 text-xs font-semibold shadow-sm">
                  <Play className="h-3.5 w-3.5 fill-white" />
                  <span>Launch Study Room</span>
                </Button>
              </Link>

              {/* Motivational Quote pill */}
              <p className="text-[11px] text-muted-foreground italic bg-muted/40 p-2.5 rounded-xl border border-border/50">
                &ldquo;Discipline today builds the life you want tomorrow.&rdquo;
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
