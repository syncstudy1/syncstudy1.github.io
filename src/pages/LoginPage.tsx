import * as React from "react"
import { useNavigate, useLocation, Link } from "react-router-dom"
import { useAuthStore } from "@/stores/authStore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card"
import { Button } from "@/ui/button"
import { Loader2, AlertCircle, ShieldCheck } from "lucide-react"
import { BrandLockup } from "@/components/brand/BrandLockup"

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isInitialized, isLoading: authLoading, signInWithGoogle } = useAuthStore()

  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  // Redirect target if arriving from a protected route
  const fromLocation = (location.state as any)?.from
  const from = fromLocation ? `${fromLocation.pathname}${fromLocation.search || ""}${fromLocation.hash || ""}` : "/dashboard"

  // Check URL parameters or hash for errors from Google OAuth
  React.useEffect(() => {
    try {
      const searchParams = new URLSearchParams(location.search)
      const hashString = location.hash.startsWith("#") ? location.hash.substring(1) : location.hash
      const hashParams = new URLSearchParams(hashString)

      const err =
        searchParams.get("error_description") ||
        searchParams.get("error") ||
        hashParams.get("error_description") ||
        hashParams.get("error")

      if (err) {
        const decoded = decodeURIComponent(err.replace(/\+/g, " "))
        if (decoded.toLowerCase().includes("access_denied") || decoded.toLowerCase().includes("cancelled")) {
          setErrorMessage("Google sign-in was cancelled. Please try again when you are ready.")
        } else {
          setErrorMessage(decoded)
        }
      }
    } catch {
      // Ignore parsing errors
    }
  }, [location.search, location.hash])

  // If already authenticated, redirect to destination
  React.useEffect(() => {
    if (isInitialized && user) {
      navigate(from, { replace: true })
    }
  }, [user, isInitialized, navigate, from])

  const handleGoogleSignIn = async () => {
    if (isSubmitting) return
    setErrorMessage(null)
    setIsSubmitting(true)

    const res = await signInWithGoogle(from)
    if (!res.success) {
      setErrorMessage(res.error || "Google sign-in could not be completed. Please try again.")
      setIsSubmitting(false)
    }
    // Note: If successful, browser redirects to Google OAuth page
  }

  if (authLoading && !isInitialized) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" />
        <p className="text-sm text-muted-foreground">Checking session...</p>
      </div>
    )
  }

  return (
    <div className="page-shell flex min-h-[calc(100vh-8rem)] items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.12),_transparent_45%)] px-4 py-12">
      <Card className="w-full max-w-md border-border/70 shadow-xl shadow-indigo-900/5">
        <CardHeader className="space-y-3 text-center pb-6">
          <BrandLockup href="/" />
          <CardTitle className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome to SyncStudy
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground leading-relaxed px-2">
            Intelligent focus timer, camera posture guard, and academic study companion.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {errorMessage && (
            <div className="flex items-start gap-2.5 p-3.5 text-xs bg-rose-50 border border-rose-200 text-rose-800 rounded-xl dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-300 animate-in fade-in-50">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="leading-relaxed flex-1">{errorMessage}</div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-200 font-bold ml-1 text-xs"
                aria-label="Dismiss alert"
              >
                &times;
              </button>
            </div>
          )}

          {/* Prominent Google Authentication Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 gap-3 text-sm font-semibold border-border/80 hover:bg-secondary/80 hover:text-foreground shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-indigo-500"
            onClick={handleGoogleSignIn}
            disabled={isSubmitting}
            aria-label="Continue with Google"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600 dark:text-indigo-400" />
                <span>Connecting to Google...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </Button>

          {/* Automatic registration notice */}
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground text-center pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>New accounts are created automatically upon first sign-in.</span>
          </div>

          {/* Privacy Policy link */}
          <div className="pt-4 border-t border-border/60 text-center">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              By continuing, you acknowledge SyncStudy&apos;s{" "}
              <Link
                to="/privacy"
                className="underline underline-offset-4 text-foreground/80 hover:text-foreground font-medium transition-colors"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
