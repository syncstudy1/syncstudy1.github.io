import * as React from "react"
import { useLocation, Link } from "react-router-dom"
import { useSubscriptionStore } from "@/stores/subscriptionStore"
import { useAuthStore } from "@/stores/authStore"
import { Input } from "@/ui/input"
import { Button } from "@/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog"
import { Loader2, KeyRound, CheckCircle2, AlertCircle, Ticket } from "lucide-react"
import { Logo } from "@/components/brand/Logo"

export function Footer() {
  const location = useLocation()
  const isHomepage = location.pathname === "/"
  
  const { user } = useAuthStore()
  const { redeemCode, isChecking, redeemError, redeemSuccess, clearRedeemMessages } = useSubscriptionStore()

  const [openRedeem, setOpenRedeem] = React.useState(false)
  const [code, setCode] = React.useState("")

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) return
    const result = await redeemCode(code)
    if (result.success) setCode("")
  }

  return (
    <footer className="border-t border-white/40 bg-white/20 mt-auto text-sm text-muted-foreground backdrop-blur-xl">
      <div className="container mx-auto px-4 py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Link to="/" className="flex items-center gap-2 font-semibold text-foreground hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"><Logo variant="mark" className="h-7 w-7" /><span>SyncStudy</span></Link>
            <span>&copy; {new Date().getFullYear()}</span>
            <span>&bull;</span>
            <span>Personal Study Companion</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs">
            {isHomepage && (
              <>
                <Link to="/premium" className="font-semibold text-foreground hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Pricing</Link>
                <span className="text-muted-foreground/40 hidden sm:inline">|</span>
              </>
            )}
            <Link to="/privacy" className="font-semibold text-foreground hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Privacy Policy</Link>
          </div>
        </div>

        {/* Redeem Code section: ONLY on Homepage, NO promotional text beside it */}
        {isHomepage && (
          <div className="mt-8 pt-6 border-t border-border/60">
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => {
                  setOpenRedeem(true)
                  clearRedeemMessages()
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-[#4F46E5] px-5 py-3 text-sm font-extrabold text-white shadow-md shadow-indigo-600/20 transition-all hover:-translate-y-0.5 hover:bg-[#4338CA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:border-indigo-400/40 dark:bg-[#4F46E5] dark:hover:bg-[#4338CA]"
              >
                <Ticket className="w-4 h-4 text-white" />
                <span>Redeem a Code</span>
              </button>

              <Dialog open={openRedeem} onOpenChange={(open) => {
                setOpenRedeem(open)
                if (!open) clearRedeemMessages()
              }}>
                <DialogContent className="w-[calc(100%-2rem)] max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-2xl font-extrabold">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                        <KeyRound className="h-5 w-5" />
                      </span>
                      Redeem Code
                    </DialogTitle>
                    <DialogDescription>
                      Enter your premium access code below. Codes contain letters and numbers only.
                    </DialogDescription>
                  </DialogHeader>

                  <form onSubmit={handleRedeem} className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="redeem-code" className="text-sm font-semibold text-foreground">
                        Access code
                      </label>
                      <Input
                        id="redeem-code"
                        type="text"
                        placeholder="Enter code here"
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase())}
                        className="h-11 uppercase font-mono tracking-wider"
                        inputMode="text"
                        autoComplete="off"
                        disabled={isChecking}
                        aria-describedby="redeem-code-help"
                      />
                      <p id="redeem-code-help" className="text-xs text-muted-foreground">
                        Letters and numbers only.
                      </p>
                    </div>

                    {redeemError && (
                      <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300" role="alert">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{redeemError}</span>
                      </div>
                    )}

                    {redeemSuccess && (
                      <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300" role="status">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{redeemSuccess}</span>
                      </div>
                    )}

                    {!user && (
                      <p className="text-xs text-muted-foreground">
                        Sign in before redeeming a code.
                      </p>
                    )}

                    <DialogFooter className="gap-2 sm:gap-2">
                      <Button type="button" variant="outline" onClick={() => setOpenRedeem(false)} disabled={isChecking}>
                        Cancel
                      </Button>
                      <Button type="submit" className="gap-2 bg-indigo-600 text-white hover:bg-indigo-700" disabled={isChecking || !code}>
                        {isChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ticket className="h-4 w-4" />}
                        Redeem
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        )}
      </div>
    </footer>
  )
}
