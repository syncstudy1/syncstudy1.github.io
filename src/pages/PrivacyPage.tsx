import * as React from "react"
import { Link } from "react-router-dom"
import { Badge } from "@/ui/badge"
import { Button } from "@/ui/button"
import {
  ShieldCheck,
  Lock,
  Eye,
  Mail,
  ArrowLeft,
  UserCheck,
} from "lucide-react"

export function PrivacyPage() {
  React.useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="page-shell min-h-screen px-4 py-10 text-foreground sm:px-6 sm:py-14 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Navigation Breadcrumb / Back button */}
        <div className="flex items-center justify-between">
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground rounded-xl">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </Button>
          </Link>
          <div className="text-xs text-muted-foreground font-mono">
            Last Updated: October 2026
          </div>
        </div>

        {/* Page Header */}
        <div className="space-y-3">
          <Badge
            variant="outline"
            className="py-1 px-3.5 rounded-full border-purple-200 dark:border-purple-800 text-primary gap-1.5 font-medium"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Privacy & Data Transparency</span>
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-display">
            Privacy Policy
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
            This Privacy Policy explains how SyncStudy collects, uses, and safeguards your information when you use our web application. SyncStudy is designed to help students build consistent study habits, track productive hours, and stay focused during study sessions.
          </p>
        </div>

        {/* Content Cards */}
        <div className="space-y-6">
          {/* 1. Information We Collect */}
          <div className="surface-panel p-6 space-y-3 rounded-2xl">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-primary" />
              1. Information We Collect
            </h2>
            <ul className="text-xs sm:text-sm text-muted-foreground space-y-2 list-disc pl-5 leading-relaxed">
              <li><strong>Account Profile:</strong> When signing in with Google OAuth, we receive your email address, full name, and avatar image URL.</li>
              <li><strong>Study Activity Data:</strong> Timestamps of study sessions, selected subject names, session durations, distraction warning counts, and task records.</li>
              <li><strong>AI Interaction Data:</strong> Study schedule preferences and quiz generation topics sent securely to our backend AI proxy.</li>
              <li><strong>Local Storage:</strong> Selected theme (light/dark mode) and preferred study buddy are stored on your local browser device.</li>
            </ul>
          </div>

          {/* 2. Webcam & CV Focus Monitoring */}
          <div className="surface-panel p-6 space-y-3 rounded-2xl border-emerald-500/20 bg-emerald-500/[0.02]">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Eye className="w-5 h-5 text-emerald-500" />
              2. Webcam & Computer Vision Focus Monitoring (100% On-Device)
            </h2>
            <ul className="text-xs sm:text-sm text-muted-foreground space-y-2 list-disc pl-5 leading-relaxed">
              <li><strong>No Video Recording:</strong> Video frames from your webcam are processed entirely in your browser using Google MediaPipe Face Landmarker WebAssembly.</li>
              <li><strong>No Cloud Video Streaming:</strong> Video streams never leave your device. No images, video clips, or biometric representations are transmitted or stored on any server.</li>
              <li><strong>Opt-In Control:</strong> Camera monitoring is strictly optional. You can disable camera monitoring at any time without affecting timer functionality.</li>
            </ul>
          </div>

          {/* 3. Data Security & Storage */}
          <div className="surface-panel p-6 space-y-3 rounded-2xl">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              3. Data Security & Storage
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              All stored user records (profiles, subjects, tasks, session logs, quiz histories) are persisted in a secure PostgreSQL database hosted on Supabase, protected with Row-Level Security (RLS) policies ensuring users can only read and modify their own records.
            </p>
          </div>

          {/* 4. Contact Information */}
          <div className="surface-panel p-6 space-y-3 rounded-2xl">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              4. Contact Information
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              If you have any questions or concerns regarding this Privacy Policy or data protection in SyncStudy, please contact the development team via the project repository.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
