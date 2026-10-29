import * as React from "react"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/ui/button"
import { useAuthStore } from "@/stores/authStore"
import {
  Timer,
  Eye,
  BrainCircuit,
  Sparkles,
  BarChart,
  ShieldCheck,
  Zap,
  ArrowRight,
  LogIn,
  Music,
  BookOpen,
} from "lucide-react"

export function HomePage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  React.useEffect(() => {
    // If OAuth redirect landed on root with token hash, redirect to dashboard
    if (
      window.location.hash &&
      (window.location.hash.includes("access_token") || window.location.hash.includes("refresh_token"))
    ) {
      navigate("/dashboard", { replace: true })
    }
  }, [navigate])

  return (
    <div className="page-shell flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border/70 py-16 sm:py-24 bg-gradient-to-b from-[#FFFDF9] via-[#FBF7FF] to-[#F5F0FF] dark:from-[#1A1626] dark:via-[#161320] dark:to-[#120F1A]">
        {/* Soft background aura glow blobs */}
        <div className="absolute top-10 right-10 h-96 w-96 rounded-full bg-gradient-to-br from-[#FFD8C2]/30 via-[#DCCBFF]/40 to-[#A78BFA]/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 left-10 h-80 w-80 rounded-full bg-gradient-to-tr from-[#DCCBFF]/30 to-[#FF9B7A]/20 blur-3xl pointer-events-none" />

        <div className="container relative z-10 mx-auto grid max-w-6xl items-center gap-12 px-4 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 dark:bg-white/10 backdrop-blur-md border border-purple-200 dark:border-purple-800 text-xs font-semibold text-primary shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Intelligent Focus & Study Optimization</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.08] tracking-tight text-foreground font-display">
              Study smarter.{" "}
              <span className="bg-gradient-to-r from-[#7651E8] via-[#A78BFA] to-[#FF9B7A] bg-clip-text text-transparent">
                Stay focused.
              </span>{" "}
              See your progress.
            </h1>

            <p className="max-w-xl text-base sm:text-lg leading-relaxed text-muted-foreground">
              An artfully designed study companion featuring cozy illustrated environments, 7 friendly study buddies, on-device focus tracking, and AI-powered learning tools.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
              {user ? (
                <Link to="/study">
                  <Button size="lg" className="h-12 px-8 rounded-2xl gap-2.5 text-base font-semibold bg-[#7651E8] hover:bg-[#6842D8] text-white shadow-xl shadow-purple-500/25 transition-all hover:scale-[1.02]">
                    <Timer className="w-5 h-5" />
                    <span>Enter Study Room</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              ) : (
                <Link to="/login">
                  <Button size="lg" className="h-12 px-8 rounded-2xl gap-2.5 text-base font-semibold bg-[#7651E8] hover:bg-[#6842D8] text-white shadow-xl shadow-purple-500/25 transition-all hover:scale-[1.02]">
                    <LogIn className="w-5 h-5" />
                    <span>Start Studying Free</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              )}
              <Link to="/planner">
                <Button variant="outline" size="lg" className="h-12 px-6 rounded-2xl gap-2 text-sm font-semibold bg-card/80 backdrop-blur border-border hover:bg-card">
                  <BrainCircuit className="w-4 h-4 text-primary" />
                  <span>Explore AI Planner</span>
                </Button>
              </Link>
            </div>

            {/* Trust Badges */}
            <div className="pt-4 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-semibold text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>100% Private (No video leaves your device)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>MediaPipe head-pose detection</span>
              </span>
              <span className="flex items-center gap-1.5">
                <img src="/streak-flame.svg" alt="" className="w-4 h-4 object-contain" />
                <span>Daily streak momentum</span>
              </span>
            </div>
          </div>

          {/* Interactive Study Room Showcase Preview Card */}
          <div className="relative">
            <div className="surface-panel p-3 rounded-3xl shadow-2xl border border-white/60 dark:border-white/10 overflow-hidden transform hover:-rotate-1 transition-transform duration-300">
              <div
                className="relative rounded-2xl h-80 sm:h-96 w-full bg-cover bg-center flex flex-col justify-between p-4"
                style={{ backgroundImage: "url('/assets/rooms/room-cat.jpg')" }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 rounded-2xl pointer-events-none" />

                {/* Top header badge */}
                <div className="relative z-10 flex justify-between items-center">
                  <div className="px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md text-white text-xs font-semibold flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-purple-300" />
                    <span>Data Structures</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md text-white text-xs font-semibold flex items-center gap-1.5">
                    <img src="/assets/buddies/cat.png" alt="Cat" className="w-4 h-4 rounded-full" />
                    <span>Cosy Cat</span>
                  </div>
                </div>

                {/* Circular timer preview */}
                <div className="relative z-10 flex flex-col items-center justify-center my-auto">
                  <div className="h-32 w-32 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex flex-col items-center justify-center shadow-lg">
                    <span className="text-2xl font-black text-white tabular-nums">25:00</span>
                    <span className="text-[10px] uppercase font-semibold text-white/80">Focus Time</span>
                  </div>
                </div>

                {/* Bottom quote */}
                <div className="relative z-10 px-3 py-2 rounded-xl bg-black/40 backdrop-blur-md text-white text-[11px] font-medium text-center">
                  &ldquo;Stay focused. Good things take time.&rdquo;
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="py-16 sm:py-24 container mx-auto px-4 max-w-6xl space-y-12">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-wider text-primary">All-in-One Learning System</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground font-display">
            Built for Students Who Value Deep Work
          </h2>
          <p className="text-sm text-muted-foreground">
            Everything you need to plan, practice, focus, and review in one cohesive, beautiful interface.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 1. Immersive Study Rooms */}
          <div className="surface-panel p-6 space-y-3 hover:-translate-y-1 transition-transform">
            <div className="h-10 w-10 rounded-2xl bg-purple-500/10 text-primary flex items-center justify-center">
              <Timer className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-foreground">7 Illustrated Environments</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Study alongside 7 animal companions in customized cozy rooms, bamboo sanctuaries, rainforest retreats, and ocean decks.
            </p>
          </div>

          {/* 2. AI Study Planner */}
          <div className="surface-panel p-6 space-y-3 hover:-translate-y-1 transition-transform">
            <div className="h-10 w-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <BrainCircuit className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-foreground">AI Study Timetables</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Gemini AI generates adaptive 7-day schedules that balance your subjects, respect daily hours, and prioritize pending deadlines.
            </p>
          </div>

          {/* 3. Practice Quizzes */}
          <div className="surface-panel p-6 space-y-3 hover:-translate-y-1 transition-transform">
            <div className="h-10 w-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-foreground">Active Recall Quizzes</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Generate custom multiple-choice tests with detailed explanations and targeted study tips based on topics you missed.
            </p>
          </div>

          {/* 4. On-Device Focus Guard */}
          <div className="surface-panel p-6 space-y-3 hover:-translate-y-1 transition-transform">
            <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Eye className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-foreground">Private Focus Monitoring</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              MediaPipe analyzes head pose locally in your browser. Auto-pauses when distractions are detected without saving video frames.
            </p>
          </div>

          {/* 5. Deep Analytics & Streaks */}
          <div className="surface-panel p-6 space-y-3 hover:-translate-y-1 transition-transform">
            <div className="h-10 w-10 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
              <BarChart className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-foreground">90-Day Activity Heatmaps</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Track consistency with GitHub-style heatmaps, daily focus trends, quiz performance graphs, and downloadable PDF reports.
            </p>
          </div>

          {/* 6. Ambient Audio */}
          <div className="surface-panel p-6 space-y-3 hover:-translate-y-1 transition-transform">
            <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
              <Music className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-foreground">Synthesized Ambient Sounds</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Built-in Lo-fi, gentle rain, cafe background, and ocean soundscapes running on Web Audio API directly in your browser.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
