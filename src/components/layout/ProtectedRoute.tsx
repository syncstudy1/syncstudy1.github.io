import * as React from "react"
import { Navigate, useLocation } from "react-router-dom"
import { useAuthStore } from "@/stores/authStore"
import { Loader2 } from "lucide-react"

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading, isInitialized } = useAuthStore()
  const location = useLocation()

  // Prevent flash of protected content while auth state is determining
  if (isLoading || !isInitialized) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" />
        <p className="text-sm text-muted-foreground">Verifying authentication...</p>
      </div>
    )
  }

  // If unauthenticated, redirect immediately to /login with history replace
  // This ensures browser back-button or direct URL access cannot reveal protected content
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <>{children}</>
}
