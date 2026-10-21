import * as React from "react"
import { Link } from "react-router-dom"
import { Card, CardHeader, CardTitle, CardContent } from "@/ui/card"
import { Badge } from "@/ui/badge"
import { Button } from "@/ui/button"
import {
  ShieldCheck,
  Lock,
  Eye,
  Database,
  Mail,
  ArrowLeft,
  UserCheck,
} from "lucide-react"

export function PrivacyPage() {
  React.useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Navigation Breadcrumb / Back button */}
        <div className="flex items-center justify-between">
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
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
            className="py-1 px-3.5 rounded-full border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 gap-1.5 font-medium"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Privacy & Data Transparency</span>
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
            This Privacy Policy explains how SyncStudy collects, uses, and safeguards your information when you use our web application. SyncStudy is designed to help students build consistent study habits, track productive hours, and stay focused during study sessions.
          </p>
        </div>

        {/* Content Cards */}
        <div className="space-y-6">
          {/* 1. Information We Collect */}
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-indigo-500" />
                1. Information We Collect
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground leading-relaxed">
              <p>
                When you use SyncStudy, we store only the information required to run your study workspace and show your study history:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong className="text-foreground">Google Account Details:</strong> When you sign in with Google, we receive basic identity information authorized by Google OAuth—specifically your account ID, name, email address, and profile picture URL. We never have access to your Google password.
                </li>
                <li>
                  <strong className="text-foreground">Study Subjects & Tasks:</strong> The subject names, color labels, task titles, descriptions, and deadlines that you create in your planner.
                </li>
                <li>
                  <strong className="text-foreground">Study Timer Logs & Analytics:</strong> The start time, end time, target duration, actual elapsed focus minutes, any study notes you add to completed sessions, and quiz completion scores.
                </li>
                <li>
                  <strong className="text-foreground">Subscription & Access Status:</strong> Whether your account is on the free tier or has an active premium entitlement, along with voucher redemption timestamps if you activate an access code.
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* 2. Webcam & Computer Vision Focus Monitoring */}
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Eye className="w-5 h-5 text-indigo-500" />
                2. Webcam & Computer Vision Focus Monitoring
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground leading-relaxed">
              <p>
                SyncStudy includes an optional focus monitor that uses your computer&rsquo;s webcam to detect when you turn away or step away from your desk during a study session:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong className="text-foreground">Local Browser Processing:</strong> When you choose to turn on the camera monitor and allow browser camera permissions, the video feed is read directly by your web browser on your own device. The calculations used to estimate your head position and direction run locally inside your browser.
                </li>
                <li>
                  <strong className="text-foreground">Calibration Baseline:</strong> When starting, the monitor takes a brief 3-second sample while you look at the screen to establish a centered baseline. As you study, the script checks whether your head turns significantly away from this baseline or if no face is visible for a sustained period.
                </li>
                <li>
                  <strong className="text-foreground">Warnings and Auto-Pause:</strong> If sustained distraction is detected, a visual alert appears on the screen. If multiple warnings occur, the study timer automatically pauses so your session length accurately reflects genuine focus time.
                </li>
                <li>
                  <strong className="text-foreground">No Video or Photo Storage:</strong> The website does not record, take screenshots, or store your camera feed. Video frames are discarded in real time as they are evaluated. The only data saved to your account is the final count of distraction warnings and whether the timer auto-paused during that study session.
                </li>
                <li>
                  <strong className="text-foreground">Completely Voluntary:</strong> Using the camera monitor is entirely optional. You can deny camera access in your browser or toggle the monitor off at any time, and all other study timer features continue to work normally.
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* 3. Data Security & Storage */}
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Lock className="w-5 h-5 text-indigo-500" />
                3. Data Security & Storage
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground leading-relaxed">
              <p>
                Your account data, study sessions, and task lists are stored securely in a managed cloud database:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong className="text-foreground">Database Access Rules:</strong> We use database Row Level Security (RLS) policies. Every request to read, create, or update study data requires a verified session token matching your user ID. Users cannot view or modify another student&rsquo;s data.
                </li>
                <li>
                  <strong className="text-foreground">Encrypted Network Transmission:</strong> All data sent between your browser and our backend services is encrypted in transit using standard HTTPS/TLS encryption.
                </li>
                <li>
                  <strong className="text-foreground">Security Limitations:</strong> While reasonable measures are taken to protect user information, no website or online system can guarantee total invulnerability against all potential security risks. Please keep your personal Google account secure.
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* 4. Data Retention, Rights & Account Deletion */}
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-500" />
                4. Data Retention, Rights & Account Deletion
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground leading-relaxed">
              <p>
                You have full control over your study information:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong className="text-foreground">Editing and Deleting Content:</strong> You can edit or delete your tasks, subjects, and study plans at any time directly in the web application.
                </li>
                <li>
                  <strong className="text-foreground">Data Export:</strong> You can export your logged study sessions and analytical history in JSON format directly from the Analytics page.
                </li>
                <li>
                  <strong className="text-foreground">Complete Account Deletion:</strong> If you wish to permanently delete your account, profile, and all associated study sessions from our database, send an email to the contact address below and we will remove your records.
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* 5. Contact Information */}
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Mail className="w-5 h-5 text-indigo-500" />
                5. Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
              <p>
                If you have questions, feedback, or data deletion requests regarding this Privacy Policy, please contact:
              </p>
              <div className="p-4 rounded-lg bg-secondary/50 border border-border space-y-1 text-xs sm:text-sm font-mono">
                <div><strong>Project:</strong> SyncStudy</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Navigation */}
        <div className="pt-4 flex flex-wrap items-center justify-between text-xs text-muted-foreground gap-3 border-t border-border">
          <div>&copy; {new Date().getFullYear()} SyncStudy. All rights reserved.</div>
          <Link to="/" className="hover:text-foreground underline underline-offset-4">
            Return to SyncStudy Homepage
          </Link>
        </div>
      </div>
    </div>
  )
}
