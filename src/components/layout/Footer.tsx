import * as React from "react"
import { useLocation, Link } from "react-router-dom"
import { useSubscriptionStore } from "@/stores/subscriptionStore"
import { useAuthStore } from "@/stores/authStore"
import { Input } from "@/ui/input"
import { Button } from "@/ui/button"
import { Loader2, KeyRound, CheckCircle2, AlertCircle } from "lucide-react"

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
    await redeemCode(code)
    setCode("")
  }

  return (
    <footer className="border-t bg-muted/30 mt-auto text-sm text-muted-foreground">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Link to="/" className="font-semibold text-foreground hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              SyncStudy
            </Link>
            <span>&copy; {new Date().getFullYear()}</span>
            <span>&bull;</span>
            <span>AI-Driven Study Companion</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs">
            {isHomepage && (
              <>
                <a href="#features" className="hover:text-foreground transition-colors">Features</a>
                <Link to="/premium" className="hover:text-foreground transition-colors">Pricing</Link>
                <span className="text-muted-foreground/40 hidden sm:inline">|</span>
              </>
            )}
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
          </div>
        </div>

        {/* Redeem Code section: ONLY on Homepage, NO promotional text beside it */}
        {isHomepage && (
          <div className="mt-8 pt-6 border-t border-border/60">
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => {
                  setOpenRedeem(!openRedeem)
                  clearRedeemMessages()
                }}
                className="text-xs text-muted-foreground/80 hover:text-foreground underline-offset-4 hover:underline flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Redeem Code</span>
              </button>

              {openRedeem && (
                <div className="mt-4 w-full max-w-sm transition-all animate-in fade-in-50 zoom-in-95">
                  <form onSubmit={handleRedeem} className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Enter code"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      className="h-9 text-xs uppercase font-mono tracking-wider"
                      disabled={isChecking}
                    />
                    <Button type="submit" size="sm" className="h-9 px-4 shrink-0 text-xs" disabled={isChecking}>
                      {isChecking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Redeem"}
                    </Button>
                  </form>

                  {redeemError && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-rose-500">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{redeemError}</span>
                    </div>
                  )}

                  {redeemSuccess && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{redeemSuccess}</span>
                    </div>
                  )}

                  {!user && openRedeem && (
                    <p className="mt-1.5 text-[11px] text-muted-foreground text-center">
                      Sign in before redeeming code
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </footer>
  )
}
