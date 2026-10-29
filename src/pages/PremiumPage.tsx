import * as React from 'react'
import { Link } from 'react-router-dom'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import { Button } from '@/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/ui/card'
import { Badge } from '@/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/ui/dialog'
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
} from 'lucide-react'

export function PremiumPage() {
  const { isPremium, getRemainingDays } = useSubscriptionStore()
  const premium = isPremium()
  const daysLeft = getRemainingDays()

  const [paymentNoticeOpen, setPaymentNoticeOpen] = React.useState<boolean>(false)

  return (
    <div className="page-shell">
    <div className="page-container max-w-5xl space-y-14">
      {/* Hero Section */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/10 via-amber-500/20 to-amber-500/10 border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-xs font-semibold">
          <Crown className="w-4 h-4 fill-amber-500 text-amber-500" />
          <span>Elevate Your Focus & Grades</span>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">
          Unlock Your Full Academic Potential
        </h1>

        <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
          Gain unlimited access to personalized study scheduling, practice question generation, uninterrupted focus monitoring, and quarterly streak analytics.
        </p>

        {premium && (
          <div className="inline-flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
            <Check className="w-4 h-4" />
            <span>You currently have SyncStudy Premium active! ({daysLeft > 0 ? `${daysLeft} days remaining` : 'Active'})</span>
          </div>
        )}
      </div>

      {/* Centered Pricing Card */}
      <div className="flex justify-center">
        <Card className="relative w-full max-w-md overflow-hidden border-2 border-indigo-500 bg-card shadow-2xl shadow-indigo-900/10">
          <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider py-1 px-3 rounded-bl-lg">
            Most Popular
          </div>

          <CardHeader className="text-center pt-8 pb-4">
            <div className="inline-flex p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mx-auto mb-2">
              <Crown className="w-7 h-7" />
            </div>
            <CardTitle className="text-2xl font-bold">SyncStudy Premium</CardTitle>
            <CardDescription className="text-xs">
              Everything you need for serious academic mastery
            </CardDescription>

            <div className="pt-4 flex items-baseline justify-center gap-1">
              <span className="text-4xl font-extrabold font-mono text-foreground">₹129</span>
              <span className="text-muted-foreground text-sm">/ month</span>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 px-6 sm:px-8">
            <div className="space-y-3 pt-2 text-xs">
              <div className="flex items-center gap-3">
                <div className="p-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <span className="text-foreground font-medium">Unlimited Study Planner</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <span className="text-foreground font-medium">Unlimited Practice Quiz Generation</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <span className="text-foreground font-medium">Unlimited Camera Monitoring (No 10m cap)</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <span className="text-foreground font-medium">Full Analytics History (90 days)</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <span className="text-foreground font-medium">Streak Calendar Heatmap</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <span className="text-foreground font-medium">Download Analytics Reports (PDF)</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <span className="text-foreground font-medium">Priority Responses & Faster Invocations</span>
              </div>
            </div>
          </CardContent>

          <CardFooter className="px-6 sm:px-8 pb-8 pt-2">
            <Button
              size="lg"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-6 shadow-md"
              onClick={() => setPaymentNoticeOpen(true)}
            >
              Subscribe to Premium (₹129/mo)
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Feature Comparison Table */}
      <div className="space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Plan Comparison
          </h2>
          <p className="text-xs text-muted-foreground">
            Compare features across Free and Premium memberships.
          </p>
        </div>

        <div className="rounded-xl border overflow-hidden shadow-sm bg-card">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b bg-muted/50 font-semibold text-muted-foreground">
                <th className="p-4 sm:w-1/2">Feature</th>
                <th className="p-4 text-center sm:w-1/4">Free</th>
                <th className="p-4 text-center sm:w-1/4 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300">
                  Premium (₹129/mo)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr className="hover:bg-muted/10">
                <td className="p-4 font-medium flex items-center gap-2">
                  <BrainCircuit className="w-4 h-4 text-indigo-500" />
                  <span>Study Timer</span>
                </td>
                <td className="p-4 text-center text-emerald-600 font-semibold">
                  ✅ Unlimited
                </td>
                <td className="p-4 text-center text-emerald-600 font-semibold bg-indigo-50/30 dark:bg-indigo-950/10">
                  ✅ Unlimited
                </td>
              </tr>

              <tr className="hover:bg-muted/10">
                <td className="p-4 font-medium flex items-center gap-2">
                  <Eye className="w-4 h-4 text-indigo-500" />
                  <span>Camera Monitoring</span>
                </td>
                <td className="p-4 text-center text-muted-foreground">
                  ✅ 10 min/session max
                </td>
                <td className="p-4 text-center text-emerald-600 font-semibold bg-indigo-50/30 dark:bg-indigo-950/10">
                  ✅ Unlimited
                </td>
              </tr>

              <tr className="hover:bg-muted/10">
                <td className="p-4 font-medium flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  <span>Study Planner</span>
                </td>
                <td className="p-4 text-center text-rose-500 font-bold">
                  ❌
                </td>
                <td className="p-4 text-center text-emerald-600 font-semibold bg-indigo-50/30 dark:bg-indigo-950/10">
                  ✅ Unlimited
                </td>
              </tr>

              <tr className="hover:bg-muted/10">
                <td className="p-4 font-medium flex items-center gap-2">
                  <Zap className="w-4 h-4 text-indigo-500" />
                  <span>Practice Quiz</span>
                </td>
                <td className="p-4 text-center text-muted-foreground">
                  ✅ 1 quiz / day
                </td>
                <td className="p-4 text-center text-emerald-600 font-semibold bg-indigo-50/30 dark:bg-indigo-950/10">
                  ✅ Unlimited
                </td>
              </tr>

              <tr className="hover:bg-muted/10">
                <td className="p-4 font-medium flex items-center gap-2">
                  <BarChart className="w-4 h-4 text-indigo-500" />
                  <span>Analytics History</span>
                </td>
                <td className="p-4 text-center text-muted-foreground">
                  ✅ 7 days
                </td>
                <td className="p-4 text-center text-emerald-600 font-semibold bg-indigo-50/30 dark:bg-indigo-950/10">
                  ✅ 90 days
                </td>
              </tr>

              <tr className="hover:bg-muted/10">
                <td className="p-4 font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-500" />
                  <span>Streak Calendar Heatmap</span>
                </td>
                <td className="p-4 text-center text-rose-500 font-bold">
                  ❌
                </td>
                <td className="p-4 text-center text-emerald-600 font-semibold bg-indigo-50/30 dark:bg-indigo-950/10">
                  ✅ Included
                </td>
              </tr>

              <tr className="hover:bg-muted/10">
                <td className="p-4 font-medium flex items-center gap-2">
                  <Download className="w-4 h-4 text-indigo-500" />
                  <span>Data Export</span>
                </td>
                <td className="p-4 text-center text-rose-500 font-bold">
                  ❌
                </td>
                <td className="p-4 text-center text-emerald-600 font-semibold bg-indigo-50/30 dark:bg-indigo-950/10">
                  ✅ PDF Analytics Reports
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Processing Notice Dialog */}
      <Dialog open={paymentNoticeOpen} onOpenChange={setPaymentNoticeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              Payment Setup Notice
            </DialogTitle>
            <DialogDescription className="pt-2 text-foreground/90 text-sm leading-relaxed">
              Online card and UPI payments are currently being configured with the payment gateway. If you have an institutional or promotional access voucher (such as <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">UNLOCKALL</span>), you can activate 30 days of full Premium instantly via the Redeem Code option in the homepage footer.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4">
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => setPaymentNoticeOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </div>
  )
}
