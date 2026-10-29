import * as React from "react"
import { Link } from "react-router-dom"
import { useSubscriptionStore } from "@/stores/subscriptionStore"
import { Button } from "@/ui/button"
import { Badge } from "@/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/ui/dialog"
import {
  Crown,
  Check,
  X,
  Sparkles,
  Zap,
  ShieldCheck,
  BrainCircuit,
  Eye,
  BarChart,
  Calendar,
  Download,
  AlertCircle,
  Clock,
  FileQuestion,
} from "lucide-react"

export function PremiumPage() {
  const { isPremium, getRemainingDays } = useSubscriptionStore()
  const premium = isPremium()
  const daysLeft = getRemainingDays()

  const [paymentNoticeOpen, setPaymentNoticeOpen] = React.useState<boolean>(false)

  return (
    <div className="page-shell">
      <div className="page-container max-w-5xl space-y-12 sm:space-y-16 py-8">
        {/* Hero Section */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-500/15 via-purple-500/10 to-amber-500/15 border border-amber-300 dark:border-amber-700/60 text-amber-700 dark:text-amber-400 text-xs font-semibold">
            <Crown className="w-4 h-4 fill-amber-500 text-amber-500" />
            <span>Elevate Your Focus & Study Habits</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground font-display">
            Unlock Your Full{" "}
            <span className="bg-gradient-to-r from-[#7651E8] via-[#A78BFA] to-[#FF9B7A] bg-clip-text text-transparent">
              Academic Potential
            </span>
          </h1>

          <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
            Gain unlimited access to AI study plan generation, unlimited active recall quizzes, uninterrupted camera focus monitoring, and comprehensive 90-day streak analytics.
          </p>

          {premium && (
            <div className="inline-flex items-center gap-2 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
              <Check className="w-4 h-4" />
              <span>
                You currently have SyncStudy Premium active! ({daysLeft > 0 ? `${daysLeft} days remaining` : "Active"})
              </span>
            </div>
          )}
        </div>

        {/* Centered Pricing Card */}
        <div className="flex justify-center">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border-2 border-primary bg-card p-6 sm:p-8 shadow-2xl shadow-purple-500/10 space-y-6">
            <div className="absolute top-0 right-0 bg-[#7651E8] text-white text-[10px] font-bold uppercase tracking-wider py-1 px-4 rounded-bl-xl shadow-sm">
              Most Popular
            </div>

            <div className="text-center space-y-2 pt-2">
              <div className="inline-flex p-3 rounded-2xl bg-primary/10 text-primary mx-auto">
                <Crown className="w-7 h-7 text-amber-500" />
              </div>
              <h2 className="text-2xl font-extrabold text-foreground font-display">SyncStudy Premium</h2>
              <p className="text-xs text-muted-foreground">
                Everything you need for serious academic mastery
              </p>

              <div className="pt-3 flex items-baseline justify-center gap-1">
                <span className="text-4xl sm:text-5xl font-black text-foreground tabular-nums">₹129</span>
                <span className="text-xs text-muted-foreground">/ month</span>
              </div>
            </div>

            {/* Features List */}
            <ul className="space-y-3 text-xs sm:text-sm font-medium">
              {[
                "Unlimited AI Study Planner schedules",
                "Unlimited Practice Quizzes with explanations",
                "Uninterrupted Computer Vision focus monitoring",
                "90-day learning history & activity heatmaps",
                "Downloadable PDF Analytics performance reports",
                "Priority Gemini AI response processing",
                "All 7 illustrated study buddy environments",
              ].map((feature, idx) => (
                <li key={idx} className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                  <span className="text-foreground">{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              size="lg"
              onClick={() => setPaymentNoticeOpen(true)}
              className="w-full bg-[#7651E8] hover:bg-[#6842D8] text-white font-semibold py-6 rounded-2xl shadow-lg shadow-purple-500/25 transition-all hover:scale-[1.01]"
            >
              {premium ? "Extend Subscription" : "Upgrade to Premium Now"}
            </Button>

            <p className="text-[11px] text-muted-foreground text-center">
              Simple monthly access. Cancel anytime with no commitments.
            </p>
          </div>
        </div>

        {/* Plan Comparison Table */}
        <div className="surface-panel p-6 sm:p-8 space-y-4">
          <h2 className="text-lg font-bold text-foreground">Feature Comparison</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3">Feature</th>
                  <th className="py-3 px-3">Free Tier</th>
                  <th className="py-3 px-3 text-primary font-bold">Premium</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-medium">
                {[
                  { name: "Study Timer & Pomodoro", free: "Full Access", premium: "Full Access" },
                  { name: "Illustrated Study Rooms & Buddies", free: "All 7 Animals", premium: "All 7 Animals" },
                  { name: "Camera Focus Monitoring", free: "10 min / session", premium: "Unlimited Duration" },
                  { name: "AI Study Planner", free: "Preview Only", premium: "Unlimited 7-Day Plans" },
                  { name: "Practice Quizzes", free: "1 Quiz / day", premium: "Unlimited Quizzes" },
                  { name: "Analytics & History", free: "7-day window", premium: "90-day window" },
                  { name: "Heatmap & Activity Streaks", free: "Current Streak", premium: "Full 90-Day Heatmap" },
                  { name: "PDF Performance Export", free: "No", premium: "Included" },
                ].map((row, idx) => (
                  <tr key={idx} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-3 font-semibold text-foreground">{row.name}</td>
                    <td className="py-3 px-3 text-muted-foreground">{row.free}</td>
                    <td className="py-3 px-3 font-bold text-primary">{row.premium}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment Notice Dialog */}
        <Dialog open={paymentNoticeOpen} onOpenChange={setPaymentNoticeOpen}>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                <Sparkles className="w-5 h-5 text-amber-500" />
                Activate Premium Access
              </DialogTitle>
              <DialogDescription>
                During testing, automated card payment is bypassed. You can activate full 30-day Premium instantly using an access code.
              </DialogDescription>
            </DialogHeader>

            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-foreground space-y-2">
              <p className="font-semibold text-primary">Use Access Code:</p>
              <p className="font-mono text-base font-bold text-foreground bg-card p-2 rounded-lg border text-center select-all">
                UNLOCKALL
              </p>
              <p className="text-[11px] text-muted-foreground">
                Enter this code in the &ldquo;Redeem a Code&rdquo; button in the footer of the homepage or login page to activate your 30-day Premium subscription.
              </p>
            </div>

            <DialogFooter>
              <Button onClick={() => setPaymentNoticeOpen(false)} className="rounded-xl bg-primary text-primary-foreground">
                Got it
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
