import * as React from "react"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/ui/button"
import { Badge } from "@/ui/badge"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/ui/card"
import { useAuthStore } from "@/stores/authStore"
import {
  Timer,
  Eye,
  CalendarCheck,
  BrainCircuit,
  Sparkles,
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
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-24 md:pt-32 md:pb-36 bg-gradient-to-b from-indigo-50/50 via-background to-background dark:from-indigo-950/20">
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,#fff,rgba(255,255,255,0.6))] dark:bg-grid-slate-700/25 dark:[mask-image:linear-gradient(0deg,rgba(255,255,255,0.1),rgba(255,255,255,0.5))]" />
        
        <div className="container mx-auto px-4 relative z-10 text-center max-w-4xl">
          <Badge variant="outline" className="mb-6 py-1.5 px-4 rounded-full border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 gap-2 font-medium">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>AI-Powered Focus & Adaptive Learning Assistant</span>
          </Badge>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground leading-[1.1] mb-6">
            Master Deep Focus with{" "}
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Intelligent Computer Vision
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            SyncStudy combines on-device MediaPipe posture monitoring with Gemini AI study schedules and adaptive quizzes to keep your productivity at its peak.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {user ? (
              <Link to="/study">
                <Button size="lg" className="h-12 px-8 text-base gap-2 rounded-xl shadow-lg shadow-indigo-600/20 bg-indigo-600 hover:bg-indigo-700 text-white">
                  <Timer className="w-5 h-5" />
                  Enter Study Room
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            ) : (
              <Link to="/login">
                <Button
                  size="lg"
                  className="h-12 px-8 text-base gap-2 rounded-xl shadow-lg shadow-indigo-600/20 bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  <LogIn className="w-4 h-4 mr-1" />
                  Sign In to Study
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            )}
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground font-medium">
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
      </section>

      {/* Feature Cards Grid */}
      <section id="features" className="py-20 border-t bg-muted/20">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight mb-3">Engineered for Academic Excellence</h2>
            <p className="text-muted-foreground">
              Every feature works together to build uninterrupted focus loops and structured knowledge retention.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Link to="/study" className="group block cursor-pointer rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Card className="h-full hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all border-border/80">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-2">
                  <Eye className="w-6 h-6" />
                </div>
                <CardTitle className="text-lg">Computer Vision Guard</CardTitle>
                <CardDescription>
                  MediaPipe Face Landmarker continuously measures head yaw and pitch relative to your calibrated baseline.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Sustained distraction triggers progressive warning alerts and auto-pauses the timer to preserve clean session data.
              </CardContent>
            </Card>
            </Link>

            <Link to="/planner" className="group block cursor-pointer rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Card className="h-full hover:shadow-md hover:border-purple-300 dark:hover:border-purple-700 transition-all border-border/80">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/60 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-2">
                  <CalendarCheck className="w-6 h-6" />
                </div>
                <CardTitle className="text-lg">AI Study Planner</CardTitle>
                <CardDescription>
                  Gemini 2.0 Flash crafts tailored study schedules based on your exams, task loads, and available daily hours.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Approve, revise, or regenerate schedules into structured cards with actionable time blocks.
              </CardContent>
            </Card>
            </Link>

            <Link to="/quiz" className="group block cursor-pointer rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Card className="h-full hover:shadow-md hover:border-pink-300 dark:hover:border-pink-700 transition-all border-border/80">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-pink-50 dark:bg-pink-950/60 flex items-center justify-center text-pink-600 dark:text-pink-400 mb-2">
                  <BrainCircuit className="w-6 h-6" />
                </div>
                <CardTitle className="text-lg">AI Quiz Generator</CardTitle>
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
            <Card className="h-full hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700 transition-all border-border/80">
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
            <Card className="h-full hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all border-border/80">
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
            <Card className="h-full hover:shadow-md hover:border-amber-300 dark:hover:border-amber-700 transition-all border-border/80">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-2">
                  <Sparkles className="w-6 h-6" />
                </div>
                <CardTitle className="text-lg">Premium Flexibility</CardTitle>
                <CardDescription>
                  Full access to unlimited camera monitoring, unlimited AI quizzes, and complete study history.
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
