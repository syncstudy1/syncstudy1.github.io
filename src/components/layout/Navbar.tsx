import * as React from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { useAuthStore } from "@/stores/authStore"
import { useSubscriptionStore } from "@/stores/subscriptionStore"
import { useStudySessions } from "@/hooks/useStudySessions"
import { useQualifyingActivity } from "@/hooks/useQualifyingActivity"
import { useQuizSessions } from "@/hooks/useQuizSessions"
import { getLocalDateKeyFromTimestamp, calculateStreakStats, getQualifyingActivityDates } from "@/lib/activity"
import { ThemeToggle } from "@/components/layout/ThemeToggle"
import { Button } from "@/ui/button"
import { Badge } from "@/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/ui/avatar"
import {
  Sparkles,
  LayoutDashboard,
  Timer,
  CalendarDays,
  FileQuestion,
  BarChart3,
  BrainCircuit,
  LogOut,
  Crown,
  Menu,
  X,
  LogIn,
} from "lucide-react"

export function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, profile, signOut } = useAuthStore()
  const { sessions, loading: sessionsLoading } = useStudySessions()
  const { activities } = useQualifyingActivity()
  const { quizHistory } = useQuizSessions()
  const { isPremium, getRemainingDays } = useSubscriptionStore()
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)

  const premiumActive = isPremium()
  const remainingDays = getRemainingDays()
  const currentStreak = React.useMemo(() => {
    const sessionDates = sessions
      .filter((session) => (session.actual_duration_s || 0) > 0)
      .map((session) => getLocalDateKeyFromTimestamp(session.started_at))
    const quizDates = quizHistory.map((quiz) => getLocalDateKeyFromTimestamp(quiz.taken_at))
    const dates = getQualifyingActivityDates(activities, sessionDates, quizDates)
    return calculateStreakStats(dates).currentStreak
  }, [activities, quizHistory, sessions])

  const navLinks = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard, authRequired: true },
    { name: "Study Room", path: "/study", icon: Timer, authRequired: true },
    { name: "Study Planner", path: "/planner", icon: CalendarDays, authRequired: true },
    { name: "Practice Quiz", path: "/quiz", icon: FileQuestion, authRequired: true },
    { name: "Analytics", path: "/analytics", icon: BarChart3, authRequired: true },
    { name: "Learning Autopilot", path: "/autopilot", icon: BrainCircuit, authRequired: true },
  ]

  const handleSignOut = async () => {
    await signOut()
    setMobileMenuOpen(false)
    navigate("/login", { replace: true })
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/75 transition-colors">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2.5 group">
            <img src="/syncstudy-logo.svg" alt="SyncStudy" className="h-10 w-10 object-contain group-hover:scale-105 transition-transform" />
            <div className="flex flex-col">
              <span className="font-bold text-lg leading-tight tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                SyncStudy
              </span>
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                Intelligent Focus
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          {user && (
            <nav className="hidden md:flex items-center gap-1 rounded-xl border border-border/60 bg-card/70 p-1 shadow-sm">
              {navLinks.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-indigo-50 text-indigo-700 font-semibold shadow-sm dark:bg-indigo-950/60 dark:text-indigo-300"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/70"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </nav>
          )}
        </div>

        {/* Right Section: Theme Toggle, Premium Badge & Profile / Auth */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Working Dark / Light Mode Toggle Button */}
          <ThemeToggle />

          {/* Premium Badge & Profile Controls for Authenticated Users */}
          {user ? (
            <>
              {premiumActive ? (
                <Link to="/premium">
                  <Badge variant="premium" className="cursor-pointer gap-1.5 py-1 px-3 shadow-sm hover:opacity-90">
                    <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500 animate-pulse" />
                    <span className="font-semibold text-xs">PREMIUM</span>
                    {remainingDays > 0 && (
                      <span className="text-[10px] opacity-75 font-normal">({remainingDays}d)</span>
                    )}
                  </Badge>
                </Link>
              ) : (
                <Link to="/premium">
                  <Button variant="outline" size="sm" className="h-8 gap-1.5 border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-xs font-medium">Upgrade to Pro</span>
                  </Button>
                </Link>
              )}

              <button
                type="button"
                onClick={() => navigate("/analytics")}
                className="flex items-center gap-1.5 rounded-full border border-orange-300/70 bg-orange-50 px-2.5 py-1.5 text-orange-950 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-orange-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:border-orange-400/40 dark:bg-orange-950/50 dark:text-orange-100 dark:hover:bg-orange-900/60"
                aria-label={`View your ${sessionsLoading ? "current" : currentStreak}-day study streak`}
                title="View study streak"
              >
                <img src="/streak-flame.svg" alt="" className="h-5 w-5 object-contain" />
                <span className="text-xs font-extrabold tabular-nums">{sessionsLoading ? "..." : currentStreak}</span>
                <span className="hidden lg:inline text-[10px] font-bold uppercase tracking-wide">streak</span>
              </button>

              {/* User menu / Sign out */}
              <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-border">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-medium">
                    {(profile?.full_name || user.email || "S").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400"
                  onClick={handleSignOut}
                  title="Sign Out"
                  aria-label="Sign Out"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button size="sm" className="h-9 gap-1.5 font-medium bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </Button>
              </Link>
            </div>
          )}

          {/* Mobile menu button */}
          <button
            className="p-2 md:hidden text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t px-4 pt-2 pb-4 space-y-2 bg-background/95 backdrop-blur">
          {user ? (
            <>
              <div className="flex items-center gap-3 py-2 px-1 border-b mb-2">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    {(profile?.full_name || user.email || "S").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold">{profile?.full_name || "Student"}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>

              {navLinks.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium ${
                      isActive
                        ? "bg-secondary text-primary font-semibold"
                        : "text-muted-foreground hover:bg-secondary/50"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                )
              })}

              <div className="pt-2 border-t mt-2 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    navigate("/analytics")
                  }}
                  className="flex items-center gap-1.5 rounded-full border border-orange-300/70 bg-orange-50 px-2.5 py-1.5 text-xs font-bold text-orange-950 dark:border-orange-400/40 dark:bg-orange-950/50 dark:text-orange-100"
                  aria-label={`View your ${sessionsLoading ? "current" : currentStreak}-day study streak`}
                >
                  <img src="/streak-flame.svg" alt="" className="h-5 w-5 object-contain" />
                  {sessionsLoading ? "..." : currentStreak} day streak
                </button>
                <Link
                  to="/premium"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-xs text-amber-600 dark:text-amber-400 font-medium"
                >
                  {premiumActive ? "Manage Subscription" : "Upgrade to Pro"}
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-rose-600 dark:text-rose-400 gap-1"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign Out
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-2 pt-2">
              <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                  Sign In
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  )
}
