import * as React from "react"
import { useNavigate, useLocation, Link } from "react-router-dom"
import { useAuthStore } from "@/stores/authStore"
import { Button } from "@/ui/button"
import { Loader2, AlertCircle, ShieldCheck, Sparkles } from "lucide-react"

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isInitialized, isLoading: authLoading, signInWithGoogle } = useAuthStore()

  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  // Redirect target if arriving from a protected route
  const from = (location.state as any)?.from?.pathname || "/dashboard"

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
  }

  if (authLoading && !isInitialized) {
    return (
      <div className="page-shell flex min-h-[calc(100vh-8rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-medium">Checking session...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-shell flex min-h-[calc(100vh-8rem)] items-center justify-center p-4">
      {/* Centered Liquid Glass Card */}
      <div className="w-full max-w-md rounded-3xl border border-purple-200/60 dark:border-purple-900/40 bg-card/90 backdrop-blur-xl p-8 sm:p-10 shadow-2xl shadow-purple-500/10 space-y-6 text-center animate-fade-in relative overflow-hidden">
        {/* Soft background aura */}
        <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-gradient-to-br from-[#FFD8C2]/40 to-[#DCCBFF]/40 blur-2xl pointer-events-none" />

        {/* Official Brand Logo */}
        <div className="flex justify-center relative z-10">
          <img
            src="/syncstudy-logo-full.jpg"
            alt="SyncStudy"
            className="h-20 w-auto object-contain rounded-2xl shadow-sm"
          />
        </div>

        <div className="space-y-1.5 relative z-10">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-display">
            Welcome to SyncStudy
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Sign in to access your study room, planner, and analytics.
          </p>
        </div>

        {errorMessage && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50/80 p-3.5 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 text-left">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Google Sign In Button */}
        <div className="pt-2 relative z-10">
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleSignIn}
            disabled={isSubmitting}
            className="w-full h-12 rounded-2xl border border-border/80 bg-card hover:bg-muted/60 text-foreground font-semibold text-sm gap-3 shadow-sm transition-all hover:scale-[1.01]"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24">
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
            )}
            <span>Continue with Google</span>
          </Button>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground pt-2">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <span>New accounts are created automatically upon sign-in</span>
        </div>

        <p className="text-[11px] text-muted-foreground pt-1">
          By signing in, you agree to our{" "}
          <Link to="/privacy" className="text-primary hover:underline font-medium">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
