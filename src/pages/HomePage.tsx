import * as React from "react"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/ui/card"
import { useAuthStore } from "@/stores/authStore"
import { SparkleIcon } from "@/components/brand/SparkleIcon"
import {
  Timer,
  Eye,
  CalendarCheck,
  BrainCircuit,
  BarChart,
  ShieldCheck,
  Zap,
  ArrowRight,
  LogIn,
} from "lucide-react"

export function HomePage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  React.useEffect(() => {
    // If OAuth redirect landed on root with token hash, redirect to dashboard
    if (window.location.hash && (window.location.hash.includes("access_token") || window.location.hash.includes("refresh_token"))) {
      navigate("/dashboard", { replace: true })
    }
  }, [navigate])

  return (
    <div className="page-shell flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border/70 bg-[#f5f7fb] py-14 sm:py-20 dark:bg-slate-950">
        <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-indigo-200/30 blur-3xl dark:bg-indigo-900/20" />
        <div className="container relative z-10 mx-auto grid max-w-6xl items-center gap-12 px-4 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16">
          <div>
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">Your personal study workspace</p>
          <h1 className="mb-6 max-w-2xl text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl dark:text-white">
            Study smarter. Stay focused.{" "}
            <span className="text-indigo-600 dark:text-indigo-400">See your progress.</span>
          </h1>
          <p className="mb-8 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-300">
            Plan your study sessions, stay focused with real-time monitoring, and track your progress as you work toward your goals.
          </p>
          <div className="flex flex-col items-start gap-4 sm:flex-row">
            {user ? (
              <Link to="/study">
                <Button size="lg" className="h-12 gap-2 px-7 text-base shadow-lg shadow-indigo-600/20">
                  <Timer className="w-5 h-5" />
                  Start Studying
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            ) : (
              <Link to="/login">
                <Button
                  size="lg"
                  className="h-12 gap-2 px-7 text-base shadow-lg shadow-indigo-600/20"
                >
                  <LogIn className="w-4 h-4 mr-1" />
                  Start Studying
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            )}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-medium text-slate-600 dark:text-slate-300">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" /> 100% Client-Side Video (No server storage)
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-500" /> Real-time head pitch & yaw detection
            </span>
            <span className="flex items-center gap-1.5">
              <img src="/streak-flame.svg" alt="" className="w-4 h-4 object-contain" /> Daily streak retention
            </span>
          </div>
          </div>

          <div className="relative mx-auto w-full max-w-lg">
            <div className="absolute -inset-5 rounded-[2rem] bg-indigo-200/35 blur-2xl dark:bg-indigo-900/25" />
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300"><Timer className="h-4 w-4" /></div>
                  <div><p className="text-sm font-bold text-slate-900 dark:text-white">Study Room</p><p className="text-[11px] text-slate-500">A focused study flow</p></div>
                </div>
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600"><span className="h-2 w-2 rounded-full bg-emerald-500" />Ready</span>
              </div>
              <div className="grid gap-5 p-5 sm:grid-cols-[1.05fr_0.95fr]">
                <div className="flex flex-col items-center justify-center rounded-xl bg-slate-50 p-5 dark:bg-slate-800/70">
                  <div className="relative flex h-36 w-36 items-center justify-center rounded-full border-[10px] border-indigo-100 dark:border-indigo-950">
                    <div className="absolute inset-0 rounded-full border-[10px] border-indigo-500 border-b-transparent border-l-transparent -rotate-45" />
                    <span className="font-mono text-2xl font-bold tracking-tight text-slate-900 dark:text-white">25:00</span>
                  </div>
                  <span className="mt-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Focus session</span>
                </div>
                <div className="space-y-3">
                  <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700"><p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Today’s plan</p><p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">Deep work, one block at a time.</p></div>
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/30"><div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300"><ShieldCheck className="h-4 w-4" />Optional focus monitor</div><p className="mt-1 text-[11px] leading-relaxed text-emerald-700/80 dark:text-emerald-300/80">Stay aware of focus during your study sessions.</p></div>
                  <div className="flex items-center gap-2 rounded-xl bg-indigo-50 p-3 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"><SparkleIcon size={16} />Plan, focus, reflect.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Cards Grid */}
      <section id="features" className="border-t border-border/70 bg-white py-16 sm:py-20 dark:bg-slate-950/40">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">Everything in one workspace</p>
            <h2 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl">Engineered for Academic Excellence</h2>
            <p className="text-muted-foreground">
              Every feature works together to build uninterrupted focus loops and structured knowledge retention.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            <Link to="/study" className="group block cursor-pointer rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Card className="h-full border-border/70 transition-all hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-900/5 dark:hover:border-indigo-800">
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                  <Eye className="w-6 h-6" />
                </div>
                <CardTitle className="text-lg">Computer Vision Guard</CardTitle>
                <CardDescription>
                  Real-time focus monitoring helps you stay present during each study session.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Sustained distraction triggers progressive warning alerts and auto-pauses the timer to preserve clean session data.
              </CardContent>
            </Card>
            </Link>

            <Link to="/planner" className="group block cursor-pointer rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Card className="h-full border-border/70 transition-all hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-900/5 dark:hover:border-indigo-800">
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                  <CalendarCheck className="w-6 h-6" />
                </div>
                <CardTitle className="text-lg">Study Planner</CardTitle>
                <CardDescription>
                  Create tailored study schedules based on your exams, task loads, and available daily hours.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Approve, revise, or regenerate schedules into structured cards with actionable time blocks.
              </CardContent>
            </Card>
            </Link>

            <Link to="/quiz" className="group block cursor-pointer rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Card className="h-full border-border/70 transition-all hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-900/5 dark:hover:border-indigo-800">
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                  <BrainCircuit className="w-6 h-6" />
                </div>
                <CardTitle className="text-lg">Practice Quiz</CardTitle>
                <CardDescription>
                  Generate adaptive diagnostic quizzes for any subject with Easy, Medium, or Hard difficulty settings.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Instant grading with in-depth question explanations and targeted revision suggestions.
              </CardContent>
            </Card>
            </Link>

            <Link to="/study" className="group block cursor-pointer rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Card className="h-full border-border/70 transition-all hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-900/5 dark:hover:border-indigo-800">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-2">
                  <Timer className="w-6 h-6" />
                </div>
                <CardTitle className="text-lg">Study Sessions & Tasks</CardTitle>
                <CardDescription>
                  Organize focus intervals by subject and task with clean stopwatch and countdown modes.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Log completed sessions, distraction counts, and session notes directly to Supabase.
              </CardContent>
            </Card>
            </Link>

            <Link to="/analytics" className="group block cursor-pointer rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Card className="h-full border-border/70 transition-all hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-900/5 dark:hover:border-indigo-800">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-2">
                  <BarChart className="w-6 h-6" />
                </div>
                <CardTitle className="text-lg">Deep Analytics & Streaks</CardTitle>
                <CardDescription>
                  Track planned vs. actual study times, weekly distributions, and maintain high consistency streaks.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                GitHub-style streak calendar heatmap keeps you motivated every day of the semester.
              </CardContent>
            </Card>
            </Link>

            <Link to="/premium" className="group block cursor-pointer rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Card className="h-full border-border/70 transition-all hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-900/5 dark:hover:border-indigo-800">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-2">
                  <SparkleIcon size={24} />
                </div>
                <CardTitle className="text-lg">Premium Flexibility</CardTitle>
                <CardDescription>
                  Full access to unlimited camera monitoring, practice quizzes, and complete study history.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Available at just ₹129/month or with verified academic redeem vouchers.
              </CardContent>
            </Card>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
