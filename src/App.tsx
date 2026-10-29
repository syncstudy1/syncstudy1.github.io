
import * as React from "react"
import { HashRouter, Routes, Route } from "react-router-dom"
import { Layout } from "@/components/layout/Layout"
import { ProtectedRoute } from "@/components/layout/ProtectedRoute"
import { ToastProvider } from "@/ui/toast"
import { useAuthStore } from "@/stores/authStore"

import { HomePage } from "@/pages/HomePage"
import { LoginPage } from "@/pages/LoginPage"
import { PremiumPage } from "@/pages/PremiumPage"
import { PrivacyPage } from "@/pages/PrivacyPage"
import { DashboardPage } from "@/pages/DashboardPage"
import { StudySessionPage } from "@/pages/StudySessionPage"
import { PlannerPage } from "@/pages/PlannerPage"
import { QuizPage } from "@/pages/QuizPage"
import { AnalyticsPage } from "@/pages/AnalyticsPage"
import { NotFoundPage } from "@/pages/NotFoundPage"
import { LearningAutopilotPage } from "@/pages/LearningAutopilotPage"

export function App() {
  const { initialize } = useAuthStore()

  React.useEffect(() => {
    initialize()
  }, [initialize])

  return (
    <ToastProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            {/* Public Unauthenticated Pages */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/premium" element={<PremiumPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />

            {/* Protected Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/study"
              element={
                <ProtectedRoute>
                  <StudySessionPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/planner"
              element={
                <ProtectedRoute>
                  <PlannerPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/quiz"
              element={
                <ProtectedRoute>
                  <QuizPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute>
                  <AnalyticsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/autopilot"
              element={
                <ProtectedRoute>
                  <LearningAutopilotPage />
                </ProtectedRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </HashRouter>
    </ToastProvider>
  )
}

export default App
