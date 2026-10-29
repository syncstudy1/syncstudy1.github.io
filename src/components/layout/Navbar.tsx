import * as React from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { useAuthStore } from "@/stores/authStore"
import { useSubscriptionStore } from "@/stores/subscriptionStore"
import { useStudySessions } from "@/hooks/useStudySessions"
import { useQualifyingActivity } from "@/hooks/useQualifyingActivity"
import { useQuizSessions } from "@/hooks/useQuizSessions"
import { getLocalDateKeyFromTimestamp, calculateStreakStats, getQualifyingActivityDates } from "@/lib/activity"
import { ThemeToggle } from "@/components/layout/ThemeToggle"
import { Logo } from "@/components/brand/Logo"
import { SparkleIcon } from "@/components/brand/SparkleIcon"
import { Button } from "@/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/ui/avatar"
import { LayoutDashboard, Timer, CalendarDays, FileQuestion, BarChart3, LogOut, Crown, Menu, X, LogIn, Search, ArrowUpRight } from "lucide-react"

export function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, profile, signOut } = useAuthStore()
  const { sessions, loading: sessionsLoading } = useStudySessions()
  const { activities } = useQualifyingActivity()
  const { quizHistory } = useQuizSessions()
  const { isPremium, getRemainingDays } = useSubscriptionStore()
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const currentStreak = React.useMemo(() => {
    const sessionDates = sessions.filter((session) => (session.actual_duration_s || 0) > 0).map((session) => getLocalDateKeyFromTimestamp(session.started_at))
    const quizDates = quizHistory.map((quiz) => getLocalDateKeyFromTimestamp(quiz.taken_at))
    return calculateStreakStats(getQualifyingActivityDates(activities, sessionDates, quizDates)).currentStreak
  }, [activities, quizHistory, sessions])
  const navLinks = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Study Room", path: "/study", icon: Timer },
    { name: "Study Planner", path: "/planner", icon: CalendarDays },
    { name: "Practice Quiz", path: "/quiz", icon: FileQuestion },
    { name: "Analytics", path: "/analytics", icon: BarChart3 },
  ]
  const handleSignOut = async () => { await signOut(); setMobileMenuOpen(false); navigate("/login", { replace: true }) }

  if (!user) return <header className="public-header sticky top-0 z-40 flex h-[76px] items-center justify-between border-b border-white/50 bg-white/30 px-5 backdrop-blur-xl sm:px-8"><Link to="/" className="transition-transform hover:scale-[1.02]"><Logo variant="lockup" className="h-14 w-[155px]" /></Link><div className="flex items-center gap-3"><ThemeToggle /><Link to="/login"><Button className="rounded-full bg-[#8B5CF6] px-5 text-white shadow-lg shadow-violet-500/20"><LogIn className="mr-2 h-4 w-4" />Sign in</Button></Link></div></header>

  return <>
    <aside className="app-sidebar" aria-label="Primary navigation">
      <Link to="/" className="mb-8 block px-2"><Logo variant="lockup" className="h-[72px] w-full" dark /></Link>
      <nav className="space-y-2">{navLinks.map(({ name, path, icon: Icon }) => { const active = location.pathname === path; return <Link key={path} to={path} className={`sidebar-link ${active ? "sidebar-link-active" : ""}`}><Icon className="h-[19px] w-[19px]" /><span>{name}</span></Link> })}</nav>
      <Link to="/study" className="sidebar-promo mt-auto"><SparkleIcon size={22} /><span>Small steps,<br /><strong>big progress.</strong></span><ArrowUpRight className="ml-auto h-4 w-4" /></Link>
      <div className="mt-5 flex items-center justify-between rounded-2xl bg-white/[.06] px-3 py-3 text-xs text-white/70"><span>Light</span><ThemeToggle /><span>Dark</span></div>
    </aside>
    <header className="app-topbar"><div className="search-pill"><Search className="h-4 w-4" /><span>Search tasks, subjects, quizzes, notes...</span><kbd>⌘ K</kbd></div><div className="flex items-center gap-3">{!isPremium() && <Link to="/premium" className="hidden items-center gap-2 rounded-full border border-amber-300/50 bg-amber-50/80 px-3 py-2 text-xs font-bold text-amber-800 sm:flex"><SparkleIcon size={15} />Upgrade</Link>}{isPremium() && <Link to="/premium" className="hidden items-center gap-1 rounded-full bg-amber-100/80 px-3 py-2 text-xs font-bold text-amber-800 sm:flex"><Crown className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />{getRemainingDays()}d left</Link>}<button type="button" onClick={() => navigate("/analytics")} className="streak-pill" aria-label={`View your ${sessionsLoading ? "current" : currentStreak}-day study streak`}><span>🔥</span><strong>{sessionsLoading ? "..." : currentStreak}</strong><span className="hidden sm:inline">day streak</span></button><Avatar className="h-9 w-9 border-2 border-white/80"><AvatarImage src={profile?.avatar_url || undefined} /><AvatarFallback className="bg-violet-100 text-violet-700">{(profile?.full_name || user.email || "S").slice(0, 2).toUpperCase()}</AvatarFallback></Avatar><span className="hidden text-sm font-semibold text-foreground lg:inline">Hi, {(profile?.full_name || "Scholar").split(" ")[0]}</span><Button variant="ghost" size="sm" className="hidden h-9 w-9 p-0 text-muted-foreground sm:inline-flex" onClick={handleSignOut} aria-label="Sign out"><LogOut className="h-4 w-4" /></Button><button className="mobile-menu-button" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle navigation menu">{mobileMenuOpen ? <X /> : <Menu />}</button></div></header>
    {mobileMenuOpen && <div className="mobile-nav-panel">{navLinks.map(({ name, path, icon: Icon }) => <Link key={path} to={path} onClick={() => setMobileMenuOpen(false)} className="sidebar-link"><Icon className="h-5 w-5" />{name}</Link>)}<button className="sidebar-link text-rose-300" onClick={handleSignOut}><LogOut className="h-5 w-5" />Sign out</button></div>}
  </>
}
