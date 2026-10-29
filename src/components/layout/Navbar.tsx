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
  LogOut,
  Crown,
  Menu,
  X,
  LogIn,
  Search,
  Bell,
  ChevronDown,
} from "lucide-react"

interface NavbarProps {
  collapsed?: boolean
}

export function Navbar({ collapsed = false }: NavbarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, profile, signOut } = useAuthStore()
  const { sessions, loading: sessionsLoading } = useStudySessions()
  const { activities } = useQualifyingActivity()
  const { quizHistory } = useQuizSessions()
  const { isPremium, getRemainingDays } = useSubscriptionStore()
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")

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
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Study Room", path: "/study", icon: Timer },
    { name: "Planner", path: "/planner", icon: CalendarDays },
    { name: "Practice Quiz", path: "/quiz", icon: FileQuestion },
    { name: "Analytics", path: "/analytics", icon: BarChart3 },
    { name: "Premium", path: "/premium", icon: Crown },
  ]

  const handleSignOut = async () => {
    await signOut()
    setMobileMenuOpen(false)
    navigate("/login", { replace: true })
  }

  // Handle quick search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    const q = searchQuery.toLowerCase()
    if (q.includes("study") || q.includes("room") || q.includes("timer")) {
      navigate("/study")
    } else if (q.includes("quiz") || q.includes("test")) {
      navigate("/quiz")
    } else if (q.includes("plan") || q.includes("calendar")) {
      navigate("/planner")
    } else if (q.includes("analytic") || q.includes("stats") || q.includes("chart")) {
      navigate("/analytics")
    } else {
      navigate("/dashboard")
    }
    setSearchQuery("")
  }

  const firstName = profile?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "Student"

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl transition-colors">
      <div className="flex h-16 sm:h-20 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left Section: Mobile Brand or Global Search */}
        <div className="flex items-center gap-4 flex-1 max-w-xl">
          {/* Mobile brand (shown when sidebar hidden) */}
          <Link to={user ? "/dashboard" : "/"} className="flex lg:hidden items-center gap-2.5">
            <img
              src="/syncstudy-logo-full.jpg"
              alt="SyncStudy"
              className="h-9 w-9 rounded-xl object-contain bg-white/5 p-1 border border-border"
            />
            <span className="font-bold text-base tracking-tight text-foreground">
              SyncStudy
            </span>
          </Link>

          {/* Desktop Search Bar (inspired by Reference Image C & D) */}
          {user && (
            <form onSubmit={handleSearchSubmit} className="hidden sm:flex items-center relative w-full max-w-md">
              <Search className="absolute left-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks, subjects, quizzes..."
                className="w-full h-10 pl-10 pr-12 rounded-xl bg-card border border-border/80 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all shadow-sm"
              />
              <kbd className="absolute right-3 hidden sm:inline-flex items-center gap-0.5 rounded border border-border/80 bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                ⌘ K
              </kbd>
            </form>
          )}
        </div>

        {/* Right Section: Streak, Notifications, Profile, Theme */}
        <div className="flex items-center gap-2 sm:gap-3.5">
          {user ? (
            <>
              {/* Premium Badge or Upgrade CTA */}
              {premiumActive ? (
                <Link to="/premium" className="hidden sm:inline-flex">
                  <Badge variant="premium" className="cursor-pointer gap-1.5 py-1.5 px-3 rounded-xl shadow-sm hover:opacity-90 transition-opacity">
                    <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span className="font-semibold text-xs tracking-wide">PRO</span>
                    {remainingDays > 0 && (
                      <span className="text-[10px] opacity-80 font-normal">({remainingDays}d)</span>
                    )}
                  </Badge>
                </Link>
              ) : (
                <Link to="/premium" className="hidden sm:inline-flex">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1.5 rounded-xl border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 shadow-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-xs font-semibold">Upgrade</span>
                  </Button>
                </Link>
              )}

              {/* Study Streak Pill */}
              <button
                type="button"
                onClick={() => navigate("/analytics")}
                className="flex items-center gap-1.5 rounded-xl border border-orange-300/80 bg-orange-50/80 px-2.5 sm:px-3 py-1.5 text-orange-950 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-orange-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:border-orange-500/30 dark:bg-orange-950/40 dark:text-orange-200"
                aria-label={`View your ${sessionsLoading ? "current" : currentStreak}-day study streak`}
                title="View study streak in Analytics"
              >
                <img src="/streak-flame.svg" alt="" className="h-4.5 w-4.5 object-contain" />
                <span className="text-xs font-bold tabular-nums">
                  {sessionsLoading ? "..." : currentStreak}
                </span>
                <span className="hidden md:inline text-[11px] font-semibold text-orange-800 dark:text-orange-300">
                  days
                </span>
              </button>

              {/* Notification Bell (from Reference C/D) */}
              <button
                type="button"
                onClick={() => navigate("/planner")}
                className="relative p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-card border border-transparent hover:border-border/60 transition-colors"
                title="Upcoming tasks & sessions"
              >
                <Bell className="h-4.5 w-4.5" />
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-background" />
              </button>

              {/* Theme Toggle (Mobile/Tablet or quick access) */}
              <div className="lg:hidden">
                <ThemeToggle />
              </div>

              {/* User Profile Pill (inspired by Reference Image C & D) */}
              <div className="flex items-center gap-2 pl-1 sm:pl-2">
                <Link
                  to="/analytics"
                  className="flex items-center gap-2.5 p-1 sm:px-2.5 sm:py-1.5 rounded-xl hover:bg-card border border-transparent hover:border-border/60 transition-colors group"
                >
                  <Avatar className="h-8 w-8 sm:h-9 sm:w-9 ring-1 ring-border/80">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs sm:text-sm">
                      {(profile?.full_name || user.email || "S").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:flex flex-col text-left">
                    <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-1">
                      Hi, {firstName}
                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    </span>
                    <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                      {user.email}
                    </span>
                  </div>
                </Link>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2.5">
              <ThemeToggle />
              <Link to="/login">
                <Button size="sm" className="h-9 px-4 rounded-xl font-medium bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm gap-1.5">
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </Button>
              </Link>
            </div>
          )}

          {/* Mobile Menu Toggle Button */}
          {user && (
            <button
              className="p-2 lg:hidden text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl border border-border/60 bg-card"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && user && (
        <div className="lg:hidden border-t border-border px-4 pt-3 pb-6 space-y-3 bg-card/95 backdrop-blur-xl animate-fade-in shadow-xl">
          <div className="flex items-center gap-3 py-2 px-1 border-b border-border/60 pb-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                {(profile?.full_name || user.email || "S").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold text-foreground">{profile?.full_name || "Student"}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            {navLinks.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                      : "text-foreground/80 hover:bg-muted/80"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </div>

          <div className="pt-3 border-t border-border/60 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false)
                navigate("/analytics")
              }}
              className="text-xs font-semibold text-orange-600 dark:text-orange-400 flex items-center gap-1.5"
            >
              <img src="/streak-flame.svg" alt="" className="h-4 w-4" />
              {currentStreak} day streak
            </button>
            <Button
              variant="ghost"
              size="sm"
              className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 gap-1.5 h-8 text-xs"
              onClick={handleSignOut}
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </Button>
          </div>
        </div>
      )}
    </header>
  )
}
