import * as React from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useStudySessions } from '@/hooks/useStudySessions'
import { useTasks } from '@/hooks/useTasks'
import { useSubjects } from '@/hooks/useSubjects'
import { calculateCurrentStreak } from '@/lib/streak'
import { Button } from '@/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/ui/card'
import { Badge } from '@/ui/badge'
import {
  Timer,
  Clock,
  Flame,
  CheckCircle2,
  Calendar,
  Sparkles,
  ArrowRight,
  BookOpen,
  BrainCircuit,
  AlertTriangle,
  PlusCircle,
} from 'lucide-react'

function formatDurationHhMm(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return '0m'
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function DashboardPage() {
  const { user, profile } = useAuthStore()
  const { sessions, loading: sessionsLoading, todayTotalSeconds, weekTotalSeconds } = useStudySessions()
  const { tasks, loading: tasksLoading, updateTaskStatus } = useTasks()
  const { subjects } = useSubjects()

  const userName = profile?.full_name || user?.user_metadata?.full_name || 'Scholar'
  const greeting = getGreeting()

  const currentStreak = React.useMemo(() => calculateCurrentStreak(sessions), [sessions])

  // Pending tasks
  const pendingTasks = React.useMemo(() => {
    return tasks
      .filter((t) => t.status !== 'done')
      .slice(0, 5)
  }, [tasks])

  const pendingCount = tasks.filter((t) => t.status !== 'done').length

  // Recent 5 sessions
  const recentSessions = React.useMemo(() => {
    return [...sessions]
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
      .slice(0, 5)
  }, [sessions])

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-950 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-1">
          <Badge className="bg-white/10 hover:bg-white/20 text-indigo-200 border-none mb-2 backdrop-blur-sm">
            Ready to learn
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {greeting}, {userName}! 👋
          </h1>
          <p className="text-sm text-indigo-200/90 max-w-xl">
            Track your focus, follow your personalized study schedule, and test your knowledge with adaptive AI quizzes.
          </p>
        </div>
        <div className="relative z-10 flex flex-wrap items-center gap-3">
          <Link to="/study">
            <Button className="bg-white text-indigo-900 hover:bg-indigo-50 font-semibold shadow-md gap-2">
              <Timer className="w-4 h-4" />
              Start Study Session
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's study time */}
        <Card className="border-indigo-100 dark:border-indigo-950 shadow-sm hover:shadow transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Today's Focus
            </CardTitle>
            <Clock className="w-4 h-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
              {sessionsLoading ? '...' : formatDurationHhMm(todayTotalSeconds)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Logged study today</p>
          </CardContent>
        </Card>

        {/* This week's total */}
        <Card className="border-indigo-100 dark:border-indigo-950 shadow-sm hover:shadow transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              This Week
            </CardTitle>
            <Calendar className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
              {sessionsLoading ? '...' : formatDurationHhMm(weekTotalSeconds)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Last 7 rolling days</p>
          </CardContent>
        </Card>

        {/* Current streak */}
        <Card className="border-indigo-100 dark:border-indigo-950 shadow-sm hover:shadow transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Current Streak
            </CardTitle>
            <Flame className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-foreground flex items-center gap-1.5">
              <span>{sessionsLoading ? '...' : currentStreak}</span>
              <span className="text-sm font-normal text-muted-foreground">days</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">≥5 min/day to maintain</p>
          </CardContent>
        </Card>

        {/* Pending tasks count */}
        <Card className="border-indigo-100 dark:border-indigo-950 shadow-sm hover:shadow transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Pending Tasks
            </CardTitle>
            <CheckCircle2 className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
              {tasksLoading ? '...' : pendingCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Assignments in queue</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/study" className="group">
          <div className="p-5 rounded-xl border bg-card hover:border-indigo-300 dark:hover:border-indigo-700 transition-all shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform">
                <Timer className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground">Study Room</h4>
                <p className="text-xs text-muted-foreground">Focus timer with webcam posture tracking</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link to="/planner" className="group">
          <div className="p-5 rounded-xl border bg-card hover:border-indigo-300 dark:hover:border-indigo-700 transition-all shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 group-hover:scale-105 transition-transform">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground">AI Study Planner</h4>
                <p className="text-xs text-muted-foreground">Generate tailored 7-day study timetables</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link to="/quiz" className="group">
          <div className="p-5 rounded-xl border bg-card hover:border-indigo-300 dark:hover:border-indigo-700 transition-all shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground">AI Quiz Generator</h4>
                <p className="text-xs text-muted-foreground">Adaptive practice questions & instant scoring</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>

      {/* Main Two-Column Section: Recent Sessions & Pending Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Sessions Table */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-lg">Recent Focus Sessions</CardTitle>
              <CardDescription className="text-xs">Your last 5 recorded sessions</CardDescription>
            </div>
            <Link to="/analytics">
              <Button variant="ghost" size="sm" className="text-xs text-indigo-600 hover:text-indigo-700">
                View All
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {sessionsLoading ? (
              <div className="space-y-3 py-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-muted/40 animate-pulse rounded-lg" />
                ))}
              </div>
            ) : recentSessions.length === 0 ? (
              <div className="text-center py-12 space-y-3 border border-dashed rounded-xl">
                <Clock className="w-8 h-8 text-muted-foreground mx-auto" />
                <p className="text-sm font-medium">No sessions recorded yet</p>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  Start your first focus session to track your study streaks and warnings.
                </p>
                <Link to="/study">
                  <Button size="sm" className="mt-2 text-xs">
                    Start Session
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentSessions.map((session) => {
                  const sub =
                    session.subject || subjects.find((s) => s.id === session.subject_id)
                  const dateStr = new Date(session.started_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })
                  const timeStr = new Date(session.started_at).toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                  })

                  return (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: sub?.color || '#6366f1' }}
                        />
                        <div>
                          <p className="font-semibold text-xs sm:text-sm">
                            {sub?.name || 'General Study'}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {dateStr} at {timeStr}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-right">
                        <div>
                          <p className="font-mono font-medium text-xs sm:text-sm">
                            {formatDurationHhMm(session.actual_duration_s)}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            of {formatDurationHhMm(session.planned_duration_s)}
                          </p>
                        </div>

                        {session.warning_count > 0 ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] py-0.5 border-amber-500/40 text-amber-600 gap-1"
                          >
                            <AlertTriangle className="w-3 h-3" />
                            {session.warning_count}
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[10px] py-0.5 border-emerald-500/40 text-emerald-600"
                          >
                            0 warnings
                          </Badge>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Tasks List */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-lg">Tasks in Progress</CardTitle>
              <CardDescription className="text-xs">Upcoming deadlines and assignments</CardDescription>
            </div>
            <Link to="/study">
              <Button variant="ghost" size="sm" className="text-xs text-indigo-600 hover:text-indigo-700">
                <PlusCircle className="w-3.5 h-3.5 mr-1" />
                Add Task
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {tasksLoading ? (
              <div className="space-y-3 py-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-muted/40 animate-pulse rounded-lg" />
                ))}
              </div>
            ) : pendingTasks.length === 0 ? (
              <div className="text-center py-12 space-y-3 border border-dashed rounded-xl">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="text-sm font-medium">All caught up!</p>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  You have no pending tasks. Add a new assignment in the Study Room to plan ahead.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingTasks.map((t) => {
                  const sub = subjects.find((s) => s.id === t.subject_id)
                  return (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-3 rounded-lg border text-sm gap-2"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          type="button"
                          onClick={() => updateTaskStatus(t.id, 'done')}
                          className="w-4 h-4 rounded-full border border-muted-foreground/60 hover:border-emerald-500 hover:bg-emerald-50 shrink-0 transition-colors"
                          title="Mark completed"
                        />
                        <div className="min-w-0 truncate">
                          <p className="font-medium text-xs sm:text-sm truncate">{t.title}</p>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            {sub && (
                              <span
                                className="font-semibold"
                                style={{ color: sub.color }}
                              >
                                {sub.name}
                              </span>
                            )}
                            <span>Due: {t.deadline}</span>
                          </div>
                        </div>
                      </div>

                      <Badge
                        variant={t.status === 'in_progress' ? 'default' : 'secondary'}
                        className="text-[10px] shrink-0 capitalize"
                      >
                        {t.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
