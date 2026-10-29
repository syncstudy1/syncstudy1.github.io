import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useSubjects } from '@/hooks/useSubjects'
import { useTasks } from '@/hooks/useTasks'
import { useStudySessions } from '@/hooks/useStudySessions'
import { useQuizSessions } from '@/hooks/useQuizSessions'
import { usePlannerStore } from '@/stores/plannerStore'
import { Badge } from '@/ui/badge'
import { Button } from '@/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/card'
import { Input } from '@/ui/input'
import { Label } from '@/ui/label'
import { useToast } from '@/ui/toast'
import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Compass,
  ListChecks,
  Loader2,
  RefreshCw,
  SkipForward,
  Sparkles,
  Target,
} from 'lucide-react'
import {
  actionFeatureExplanation,
  AUTOPILOT_DEFAULTS,
  buildLearningAutopilot,
  type AutopilotSettings,
  type RecommendationAction,
  type RecommendationResult,
} from '@/lib/learningAutopilot'
import {
  getAutopilotFeedbackEventId,
  getAutopilotPersonalization,
  recordAutopilotFeedback,
} from '@/lib/autopilotPersonalization'

const SETTINGS_PREFIX = 'syncstudy:learning-autopilot-settings:'

function readSettings(userId: string): AutopilotSettings {
  if (typeof window === 'undefined') return { ...AUTOPILOT_DEFAULTS, applyManually: true }
  try {
    const value = JSON.parse(window.localStorage.getItem(`${SETTINGS_PREFIX}${userId}`) || '') as Partial<AutopilotSettings>
    return {
      availableMinutes: Number.isFinite(value.availableMinutes) ? Math.max(1, Math.round(value.availableMinutes as number)) : AUTOPILOT_DEFAULTS.availableMinutes,
      preferredSessionMinutes: Number.isFinite(value.preferredSessionMinutes) ? Math.max(10, Math.round(value.preferredSessionMinutes as number)) : AUTOPILOT_DEFAULTS.preferredSessionMinutes,
      applyManually: value.applyManually !== false,
    }
  } catch {
    return { ...AUTOPILOT_DEFAULTS, applyManually: true }
  }
}

function saveSettings(userId: string, settings: AutopilotSettings) {
  if (typeof window !== 'undefined') window.localStorage.setItem(`${SETTINGS_PREFIX}${userId}`, JSON.stringify(settings))
}

function formatAge(value: string | null) {
  if (!value) return 'Not calculated yet'
  return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function ActionBadge({ action }: { action: RecommendationAction }) {
  return (
    <Badge
      variant={action.priority === 'high' ? 'destructive' : action.priority === 'medium' ? 'default' : 'secondary'}
      className="capitalize text-[10px]"
    >
      {action.priority} priority
    </Badge>
  )
}

export function LearningAutopilotPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuthStore()
  const { subjects, loading: subjectsLoading, error: subjectsError, refreshSubjects } = useSubjects()
  const { tasks, loading: tasksLoading, error: tasksError, refreshTasks } = useTasks()
  const { sessions, loading: sessionsLoading, error: sessionsError, refreshSessions } = useStudySessions()
  const { quizHistory, loading: quizzesLoading, error: quizzesError, refreshQuizzes } = useQuizSessions()
  const { savedPlans, loadSavedPlans } = usePlannerStore()
  const [settings, setSettings] = React.useState<AutopilotSettings>(() => ({ ...AUTOPILOT_DEFAULTS, applyManually: true }))
  const [result, setResult] = React.useState<RecommendationResult | null>(null)
  const [skippedIds, setSkippedIds] = React.useState<string[]>([])
  const [refreshing, setRefreshing] = React.useState(false)
  const [settingsReady, setSettingsReady] = React.useState(false)

  React.useEffect(() => {
    if (!user) return
    setSettings(readSettings(user.id))
    setSkippedIds(getAutopilotPersonalization(user.id).skippedActionIds)
    setSettingsReady(true)
  }, [user])

  const calculate = React.useCallback(() => {
    if (!user) return
    const personalization = getAutopilotPersonalization(user.id)
    const next = buildLearningAutopilot(
      { subjects, tasks, studySessions: sessions, studyPlans: savedPlans, quizSessions: quizHistory },
      settings,
      personalization,
    )
    setResult(next)
  }, [quizHistory, savedPlans, sessions, settings, subjects, tasks, user])

  React.useEffect(() => {
    if (settingsReady) calculate()
  }, [calculate, settingsReady])

  React.useEffect(() => {
    const refresh = () => {
      void Promise.all([refreshSubjects(), refreshTasks(), refreshSessions(), refreshQuizzes(), loadSavedPlans()])
    }
    window.addEventListener('syncstudy:data-changed', refresh)
    return () => {
      window.removeEventListener('syncstudy:data-changed', refresh)
    }
  }, [loadSavedPlans, refreshQuizzes, refreshSessions, refreshSubjects, refreshTasks])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await Promise.all([refreshSubjects(), refreshTasks(), refreshSessions(), refreshQuizzes(), loadSavedPlans()])
      toast({ title: 'Recommendations recalculated', description: 'The latest saved activity is now included.', type: 'success' })
    } finally {
      setRefreshing(false)
    }
  }

  const updateSettings = (patch: Partial<AutopilotSettings>) => {
    const next = { ...settings, ...patch }
    setSettings(next)
    if (user) saveSettings(user.id, next)
  }

  const actions = result?.actions.filter((action) => !skippedIds.includes(action.id)) || []
  const nextAction = actions[0] || null
  const isLoading = subjectsLoading || tasksLoading || sessionsLoading || quizzesLoading

  const startAction = (action: RecommendationAction) => {
    if (!user) return
    recordAutopilotFeedback(user.id, {
      id: getAutopilotFeedbackEventId(action.id, 'accepted', String(Date.now())),
      actionId: action.id,
      actionType: action.type,
      kind: 'accepted',
    })
    const query = new URLSearchParams({
      autopilotActionId: action.id,
      autopilotActionType: action.type,
      duration: String(action.durationMinutes),
    })
    if (action.subjectId) query.set('subjectId', action.subjectId)
    if (action.taskId) query.set('taskId', action.taskId)
    navigate(`/study?${query.toString()}`)
  }

  const skipAction = (action: RecommendationAction) => {
    if (user) {
      recordAutopilotFeedback(user.id, {
        id: getAutopilotFeedbackEventId(action.id, 'skipped'),
        actionId: action.id,
        actionType: action.type,
        kind: 'skipped',
      })
    }
    setSkippedIds((previous) => [...previous, action.id])
  }

  const evidence = nextAction ? actionFeatureExplanation(nextAction) : []
  const dataErrors = [subjectsError, tasksError, sessionsError, quizzesError].filter(Boolean)

  return (
    <div className="page-shell">
      <div className="page-container max-w-6xl space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white">
              <span className="rounded-xl bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300"><BrainCircuit className="h-6 w-6" /></span>
              Learning Autopilot
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">A transparent daily recommendation built from your SyncStudy activity.</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1.5 py-1.5">
              <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
              {result?.mode === 'personalized' ? 'Personalized baseline' : 'Deterministic baseline'}
            </Badge>
            <Button variant="outline" size="sm" onClick={() => void handleRefresh()} disabled={refreshing} className="gap-1.5">
              {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Recalculate
            </Button>
          </div>
        </div>

        {dataErrors.length > 0 && (
          <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">
            Some saved learning data could not be loaded. Recommendations below use only the data that was available; try Recalculate after checking your connection.
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <Card className="border-indigo-100 dark:border-indigo-900/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg"><Target className="h-5 w-5 text-indigo-500" />Next Best Action</CardTitle>
                  <CardDescription>Highest-ranked eligible action after hard constraints.</CardDescription>
                </div>
                {nextAction && <ActionBadge action={nextAction} />}
              </div>
            </CardHeader>
            <CardContent>
              {isLoading && !result ? (
                <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading your learning data…</div>
              ) : nextAction ? (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">{nextAction.title}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {[nextAction.subjectName, nextAction.topic].filter(Boolean).join(' · ') || 'Saved learning activity'} · {nextAction.durationMinutes} minutes
                    </p>
                  </div>
                  <div className="rounded-xl border bg-muted/20 p-4 text-sm leading-relaxed">
                    <p className="mb-2 font-semibold text-foreground">Why this was selected</p>
                    <ul className="space-y-1.5 text-muted-foreground">
                      {evidence.slice(0, 4).map((item) => <li key={item}>• {item}</li>)}
                    </ul>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => startAction(nextAction)} className="gap-1.5"><Clock3 className="h-4 w-4" />Start Studying</Button>
                    <Button variant="outline" onClick={() => skipAction(nextAction)} className="gap-1.5"><SkipForward className="h-4 w-4" />Skip for now</Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">No eligible action is available yet. Add a subject or task, complete a session, or record a quiz to give Autopilot evidence to use.</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg"><Compass className="h-5 w-5 text-indigo-500" />Agent status</CardTitle>
              <CardDescription>Recommendations are recalculated from saved records.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">Mode</span><Badge variant="outline">{result?.mode || 'Loading'}</Badge></div>
              <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">Last calculation</span><span className="text-right text-xs font-medium">{formatAge(result?.calculatedAt || null)}</span></div>
              <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">Observed interactions</span><span className="text-right font-semibold">{result?.personalization.observationCount || 0} · {result?.personalization.ready ? 'bounded adaptation active' : 'still developing'}</span></div>
              <p className="border-t pt-3 text-xs leading-relaxed text-muted-foreground">No external AI call is required. Missing scores and prerequisites remain missing rather than being treated as zero or inferred.</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><ListChecks className="h-5 w-5 text-indigo-500" />Today’s Study Sequence</CardTitle>
            <CardDescription>Review this proposal before using it. Existing Study Planner plans are never overwritten.</CardDescription>
          </CardHeader>
          <CardContent>
            {result?.sequence.length ? (
              <div className="space-y-3">
                {result.sequence.map((item) => (
                  <div key={item.id} className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">{item.order}</span>
                      <div className="min-w-0"><p className="font-semibold text-foreground">{item.title}</p><p className="text-xs text-muted-foreground">{item.subjectName || 'Saved activity'} · {item.durationMinutes} min · {item.type.replace('-', ' ')}</p><p className="mt-1 text-xs text-muted-foreground">{item.sequenceReason}</p></div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => startAction(item)} className="shrink-0 gap-1.5">Open in Study Room <ArrowRight className="h-3.5 w-3.5" /></Button>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">No sequence can be built from the available evidence and time budget.</p>}
          </CardContent>
        </Card>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><CheckCircle2 className="h-5 w-5 text-emerald-500" />Learning progress</CardTitle><CardDescription>Only supported records are shown.</CardDescription></CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                ['Pending tasks', result?.progress.pendingTasks || 0],
                ['Revision opportunities', result?.progress.revisionOpportunities || 0],
                ['Demonstrated weak areas', result?.progress.demonstratedWeakAreas || 0],
                ['Study sessions', result?.progress.studySessions || 0],
                ['Quiz attempts', result?.progress.quizAttempts || 0],
              ].map(([label, value]) => <div key={label} className="rounded-xl border bg-muted/20 p-3"><p className="text-xl font-bold text-foreground">{value}</p><p className="text-[11px] text-muted-foreground">{label}</p></div>)}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Settings</CardTitle><CardDescription>Used for sequencing and session suggestions.</CardDescription></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label htmlFor="autopilot-available">Available today (minutes)</Label><Input id="autopilot-available" type="number" min={1} max={1440} value={settings.availableMinutes} onChange={(event) => updateSettings({ availableMinutes: Number(event.target.value) || 1 })} /></div>
              <div className="space-y-1.5"><Label htmlFor="autopilot-session">Preferred session (minutes)</Label><Input id="autopilot-session" type="number" min={10} max={180} value={settings.preferredSessionMinutes} onChange={(event) => updateSettings({ preferredSessionMinutes: Number(event.target.value) || 10 })} /></div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground sm:col-span-2"><input type="checkbox" checked={settings.applyManually} onChange={(event) => updateSettings({ applyManually: event.target.checked })} /> Keep proposed sequences manual; do not apply them to Study Planner automatically.</label>
            </CardContent>
          </Card>
        </div>

        <p className="text-xs text-muted-foreground">{result?.notes.join(' ') || 'Preparing a recommendation from your saved data.'}</p>
      </div>
    </div>
  )
}

