import * as React from 'react'
import { useStudyTimer } from '@/hooks/useStudyTimer'
import { useSubjects } from '@/hooks/useSubjects'
import { useTasks } from '@/hooks/useTasks'
import { useStudySessions } from '@/hooks/useStudySessions'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import { Button } from '@/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/ui/card'
import { Input } from '@/ui/input'
import { Label } from '@/ui/label'
import { Badge } from '@/ui/badge'
import { Switch } from '@/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/ui/dialog'
import { useToast } from '@/ui/toast'
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  AlertTriangle,
  Camera,
  CheckCircle2,
  Clock,
  BookOpen,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Check,
} from 'lucide-react'
import type { TaskStatus } from '@/types/database'
import { CameraMonitor } from '@/components/vision/CameraMonitor'

const PRESET_COLORS = [
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#ef4444', // Red
  '#06b6d4', // Cyan
  '#84cc16', // Lime
]

function formatSeconds(totalSecs: number): string {
  const hrs = Math.floor(totalSecs / 3600)
  const mins = Math.floor((totalSecs % 3600) / 60)
  const secs = totalSecs % 60
  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export function StudySessionPage() {
  const { toast } = useToast()
  const { isPremium } = useSubscriptionStore()
  const { subjects, createSubject } = useSubjects()
  const { tasks, createTask, updateTaskStatus, deleteTask } = useTasks()
  const { saveSession } = useStudySessions()

  const {
    elapsed,
    plannedDuration,
    status,
    warningCount,
    autoPaused,
    isHeld,
    holdReason,
    start,
    pause,
    resume,
    stop,
    reset,
    addWarning,
    clearAutoPause,
    holdTimer,
    releaseTimerHold,
  } = useStudyTimer()

  // Setup state
  const [selectedSubjectId, setSelectedSubjectId] = React.useState<string>('')
  const [selectedTaskId, setSelectedTaskId] = React.useState<string>('')
  const [sessionNotes, setSessionNotes] = React.useState<string>('')
  const [durationMinutes, setDurationMinutes] = React.useState<number>(25)
  const [enableCamera, setEnableCamera] = React.useState<boolean>(false)
  const [startTimeIso, setStartTimeIso] = React.useState<string>('')

  // Summary dialog state
  const [summaryOpen, setSummaryOpen] = React.useState<boolean>(false)
  const [completedElapsed, setCompletedElapsed] = React.useState<number>(0)
  const [finalNotes, setFinalNotes] = React.useState<string>('')

  // Management section toggle
  const [showManagement, setShowManagement] = React.useState<boolean>(false)

  // Add Subject Form
  const [newSubName, setNewSubName] = React.useState<string>('')
  const [newSubColor, setNewSubColor] = React.useState<string>(PRESET_COLORS[0])
  const [isAddingSub, setIsAddingSub] = React.useState<boolean>(false)

  // Add Task Form
  const [newTaskTitle, setNewTaskTitle] = React.useState<string>('')
  const [newTaskSubId, setNewTaskSubId] = React.useState<string>('')
  const [newTaskHours, setNewTaskHours] = React.useState<number>(1)
  const [newTaskDeadline, setNewTaskDeadline] = React.useState<string>(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  )
  const [isAddingTask, setIsAddingTask] = React.useState<boolean>(false)

  // Auto-select first subject if none selected
  React.useEffect(() => {
    if (!selectedSubjectId && subjects.length > 0) {
      setSelectedSubjectId(subjects[0].id)
    }
  }, [subjects, selectedSubjectId])

  const currentSubject = React.useMemo(() => {
    return subjects.find((s) => s.id === selectedSubjectId)
  }, [subjects, selectedSubjectId])

  const filteredTasks = React.useMemo(() => {
    if (!selectedSubjectId) return tasks
    return tasks.filter((t) => t.subject_id === selectedSubjectId || !t.subject_id)
  }, [tasks, selectedSubjectId])

  // If camera is disabled mid-session, release any timer hold
  React.useEffect(() => {
    if (!enableCamera) {
      releaseTimerHold()
    }
  }, [enableCamera, releaseTimerHold])

  const handleMonitoringReady = React.useCallback(
    (isReady: boolean, reason?: string) => {
      if (status === 'running') {
        if (isReady) {
          releaseTimerHold()
        } else {
          holdTimer(reason || 'Calibrating posture...')
        }
      }
    },
    [status, holdTimer, releaseTimerHold]
  )

  // Handle start session
  const handleStart = () => {
    const plannedSeconds = Math.max(1, durationMinutes) * 60
    setStartTimeIso(new Date().toISOString())
    start(plannedSeconds)

    if (enableCamera) {
      holdTimer('Initializing camera & posture...')
    }

    toast({
      title: 'Session Started',
      description: enableCamera
        ? `Focus timer started. Timer is on hold while vision monitor calibrates.`
        : `Focus timer active for ${durationMinutes} minutes. Stay focused!`,
      type: 'info',
    })
  }

  // Handle stop session
  const handleStop = () => {
    const finalTime = stop()
    setCompletedElapsed(finalTime)
    setFinalNotes(sessionNotes)
    setSummaryOpen(true)
  }

  // Handle save session
  const handleSaveSession = async () => {
    try {
      await saveSession({
        subject_id: selectedSubjectId || null,
        started_at: startTimeIso || new Date(Date.now() - completedElapsed * 1000).toISOString(),
        ended_at: new Date().toISOString(),
        planned_duration_s: plannedDuration,
        actual_duration_s: completedElapsed,
        warning_count: warningCount,
        auto_paused: autoPaused,
        notes: finalNotes || null,
        subject: currentSubject,
      })

      // If a task was selected and user studied at least 15 min, suggest status update
      if (selectedTaskId) {
        const linkedTask = tasks.find((t) => t.id === selectedTaskId)
        if (linkedTask && linkedTask.status === 'pending') {
          await updateTaskStatus(selectedTaskId, 'in_progress')
        }
      }

      toast({
        title: 'Session Saved!',
        description: `Logged ${formatSeconds(completedElapsed)} with ${warningCount} warnings recorded.`,
        type: 'success',
      })
      setSummaryOpen(false)
      reset()
      setSessionNotes('')
    } catch {
      toast({
        title: 'Error Saving Session',
        description: 'Could not save session to your study history.',
        type: 'error',
      })
    }
  }

  // Handle discard session
  const handleDiscardSession = () => {
    setSummaryOpen(false)
    reset()
    toast({
      title: 'Session Discarded',
      description: 'Your session data was not recorded.',
      type: 'info',
    })
  }

  // Handle create subject
  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSubName.trim()) return
    setIsAddingSub(true)
    try {
      const created = await createSubject(newSubName.trim(), newSubColor)
      setSelectedSubjectId(created.id)
      setNewSubName('')
      toast({
        title: 'Subject Added',
        description: `Created subject "${created.name}".`,
        type: 'success',
      })
    } catch {
      toast({
        title: 'Failed to add subject',
        type: 'error',
      })
    } finally {
      setIsAddingSub(false)
    }
  }

  // Handle create task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskTitle.trim()) return
    setIsAddingTask(true)
    try {
      await createTask({
        title: newTaskTitle.trim(),
        subject_id: newTaskSubId || selectedSubjectId || null,
        estimated_hours: newTaskHours,
        deadline: newTaskDeadline,
      })
      setNewTaskTitle('')
      toast({
        title: 'Task Created',
        description: 'New study task added to your backlog.',
        type: 'success',
      })
    } catch {
      toast({
        title: 'Failed to create task',
        type: 'error',
      })
    } finally {
      setIsAddingTask(false)
    }
  }

  // SVG circular progress calculation
  const radius = 130
  const circumference = 2 * Math.PI * radius
  const progressPercent = plannedDuration > 0 ? Math.min(1, elapsed / plannedDuration) : 0
  const strokeDashoffset = circumference - progressPercent * circumference

  return (
    <div className="page-shell">
    <div className="page-container max-w-5xl space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white">
            <span className="rounded-xl bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300"><Clock className="h-6 w-6" /></span>
            Study Room
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Focus timer integrated with real-time distraction detection and adaptive pauses.
          </p>
        </div>

        {status !== 'idle' && (
          <div className="flex items-center gap-2">
            {isHeld && (
              <Badge
                variant="outline"
                className="text-xs px-3 py-1 border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 animate-pulse font-semibold"
              >
                Timer On Hold
              </Badge>
            )}
            <Badge
              variant={
                autoPaused
                  ? 'destructive'
                  : status === 'running'
                  ? 'default'
                  : 'secondary'
              }
              className="text-xs px-3 py-1 uppercase tracking-wider font-semibold"
            >
              {autoPaused
                ? 'Auto-Paused'
                : status === 'running'
                ? isHeld
                  ? 'Awaiting Vision'
                  : 'Active Focus'
                : 'Paused'}
            </Badge>
            <Badge
              variant={warningCount > 0 ? (warningCount >= 3 ? 'destructive' : 'outline') : 'outline'}
              className="text-xs px-3 py-1 flex items-center gap-1"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              {warningCount} / 3 Warnings
            </Badge>
          </div>
        )}
      </div>

      {/* Auto-pause Alert Notification */}
      {autoPaused && (
        <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-5 shadow-sm animate-in fade-in flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-destructive/20 text-destructive shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-destructive text-sm sm:text-base">
                Timer Auto-Paused (3 Distractions Detected)
              </h4>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Our vision monitor detected repeated posture or gaze shifts. Take a deep breath, sit upright, and refocus before resuming.
              </p>
            </div>
          </div>
          <Button
            variant="destructive"
            className="shrink-0 font-medium"
            onClick={() => {
              clearAutoPause()
              resume()
            }}
          >
            <Play className="w-4 h-4 mr-2" />
            Refocus & Resume
          </Button>
        </div>
      )}

      {/* Main Timer / Setup Section */}
      {status === 'idle' ? (
        /* Setup Form Card */
        <Card className="border-indigo-100 dark:border-indigo-900/40 shadow-md">
          <CardHeader>
            <CardTitle className="text-xl">Configure Study Session</CardTitle>
            <CardDescription>
              Select your subject, link a target task, set your duration, and prepare to study.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Subject Selector */}
              <div className="space-y-2">
                <Label htmlFor="subject-select" className="text-sm font-semibold">
                  Study Subject
                </Label>
                <div className="relative">
                  <select
                    id="subject-select"
                    className="w-full h-11 rounded-xl border border-input bg-card px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    value={selectedSubjectId}
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                  >
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>
                {currentSubject && (
                  <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
                    <span
                      className="w-3 h-3 rounded-full inline-block"
                      style={{ backgroundColor: currentSubject.color }}
                    />
                    <span>Selected: {currentSubject.name}</span>
                  </div>
                )}
              </div>

              {/* Task Selector */}
              <div className="space-y-2">
                <Label htmlFor="task-select" className="text-sm font-semibold">
                  Target Task (Optional)
                </Label>
                <select
                  id="task-select"
                  className="w-full h-11 rounded-xl border border-input bg-card px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={selectedTaskId}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                >
                  <option value="">-- No specific task --</option>
                  {filteredTasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} ({t.status.replace('_', ' ')})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground pt-1">
                  Filtering tasks for the chosen subject.
                </p>
              </div>

              {/* Duration Input */}
              <div className="space-y-2">
                <Label htmlFor="duration-input" className="text-sm font-semibold">
                  Planned Duration (Minutes)
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="duration-input"
                    type="number"
                    min={1}
                    max={180}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-32"
                  />
                  <div className="flex gap-2">
                    {[15, 25, 45, 60].map((mins) => (
                      <Button
                        key={mins}
                        type="button"
                        size="sm"
                        variant={durationMinutes === mins ? 'default' : 'outline'}
                        onClick={() => setDurationMinutes(mins)}
                      >
                        {mins}m
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Session Goal / Notes */}
              <div className="space-y-2">
                <Label htmlFor="session-notes" className="text-sm font-semibold">
                  Session Goal or Notes
                </Label>
                <Input
                  id="session-notes"
                  placeholder="e.g. Finish calculus problem set 4, practice chapter 6"
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                />
              </div>
            </div>

            {/* Camera Monitor Switch */}
            <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">Focus Eye & Posture Monitoring</span>
                    <Badge variant="outline" className="text-[10px] py-0 border-indigo-200">
                      Focus Monitoring
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Detect head yaw & pitch deviation to warn you when distracted.
                  </p>
                </div>
              </div>
              <Switch
                checked={enableCamera}
                onCheckedChange={setEnableCamera}
                id="camera-switch-setup"
              />
            </div>

            <Button
              size="lg"
              className="w-full text-base font-semibold py-6 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all"
              onClick={handleStart}
            >
              <Play className="w-5 h-5 mr-2 fill-current" />
              Start Focus Session ({durationMinutes}m)
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Active Timer Display */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 border-indigo-100 dark:border-indigo-900/40 shadow-lg flex flex-col items-center justify-center p-8 text-center">
            {/* Subject Pill */}
            {currentSubject && (
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6 shadow-sm"
                style={{
                  backgroundColor: `${currentSubject.color}20`,
                  color: currentSubject.color,
                  border: `1px solid ${currentSubject.color}40`,
                }}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: currentSubject.color }}
                />
                {currentSubject.name}
              </div>
            )}

            {/* Circular Progress Display */}
            <div className="relative flex items-center justify-center my-4">
              <svg className="w-72 h-72 sm:w-80 sm:h-80 transform -rotate-90">
                {/* Background Ring */}
                <circle
                  cx="160"
                  cy="160"
                  r={radius}
                  className="stroke-muted/30"
                  strokeWidth="14"
                  fill="transparent"
                />
                {/* Progress Ring */}
                <circle
                  cx="160"
                  cy="160"
                  r={radius}
                  stroke={currentSubject ? currentSubject.color : '#6366f1'}
                  strokeWidth="14"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-1000 ease-linear"
                />
              </svg>

              {/* Inside Timer Text */}
              <div className="absolute flex flex-col items-center justify-center space-y-1">
                <span className="text-5xl sm:text-6xl font-extrabold tracking-tight font-mono text-foreground">
                  {formatSeconds(elapsed)}
                </span>
                <span className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                  Target: {formatSeconds(plannedDuration)}
                </span>
                {isHeld && holdReason && (
                  <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-0.5 rounded-full mt-1 max-w-[220px] truncate animate-pulse border border-amber-300 dark:border-amber-800">
                    ⏳ {holdReason}
                  </span>
                )}
                {sessionNotes && (
                  <p className="text-xs text-muted-foreground/80 max-w-[200px] truncate px-2 mt-1">
                    "{sessionNotes}"
                  </p>
                )}
              </div>
            </div>

            {/* Timer Controls */}
            <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
              {status === 'running' ? (
                <Button
                  size="lg"
                  variant="outline"
                  className="px-6 py-6 text-base font-semibold border-amber-500/30 hover:bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  onClick={pause}
                >
                  <Pause className="w-5 h-5 mr-2" />
                  Pause
                </Button>
              ) : (
                <Button
                  size="lg"
                  className="px-6 py-6 text-base font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
                  onClick={resume}
                >
                  <Play className="w-5 h-5 mr-2 fill-current" />
                  Resume
                </Button>
              )}

              <Button
                size="lg"
                variant="destructive"
                className="px-6 py-6 text-base font-semibold"
                onClick={handleStop}
              >
                <Square className="w-5 h-5 mr-2 fill-current" />
                Finish Session
              </Button>

              <Button
                size="lg"
                variant="ghost"
                className="text-muted-foreground hover:text-foreground"
                onClick={reset}
                title="Reset without saving"
              >
                <RotateCcw className="w-5 h-5" />
              </Button>
            </div>
          </Card>

          {/* Right Column: Status & Camera Card */}
          <div className="space-y-6">
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Camera className="w-4 h-4 text-indigo-500" />
                    Vision Monitor
                  </CardTitle>
                  <Switch
                    checked={enableCamera}
                    onCheckedChange={setEnableCamera}
                    id="camera-switch-active"
                  />
                </div>
                <CardDescription className="text-xs">
                  {enableCamera
                    ? 'Active head yaw & pitch calibration'
                    : 'Vision tracking is paused.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {enableCamera ? (
                  <CameraMonitor
                    onWarning={addWarning}
                    isSessionRunning={status === 'running'}
                    isPremium={isPremium()}
                    sessionElapsedSeconds={elapsed}
                    onMonitoringReady={handleMonitoringReady}
                  />
                ) : (
                  <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground text-xs">
                    Turn on the switch above to enable real-time gaze and posture distraction tracking.
                  </div>
                )}

                <div className="space-y-2 pt-2 border-t text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Warnings Triggered:</span>
                    <span className="font-semibold text-foreground">{warningCount} / 3</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Auto-Pause Threshold:</span>
                    <span>3 consecutive</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Account Tier:</span>
                    <span className="capitalize font-medium text-indigo-600">
                      {isPremium() ? 'Premium' : 'Free (10 min cam max)'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Session Tips */}
            <Card className="bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900/30">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-semibold text-xs">
                  <Sparkles className="w-4 h-4" />
                  <span>Productivity Rule</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Keep your head aligned with the screen. 25° yaw or 20° pitch sustained for over 3 seconds logs a distraction event.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Summary Dialog */}
      <Dialog open={summaryOpen} onOpenChange={setSummaryOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              Session Completed!
            </DialogTitle>
            <DialogDescription>
              Review your study statistics before committing this session to your analytics record.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/40 border">
              <div>
                <p className="text-xs text-muted-foreground">Subject</p>
                <p className="font-semibold text-sm">{currentSubject?.name || 'General Study'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Time Studied</p>
                <p className="font-semibold text-sm text-indigo-600 font-mono">
                  {formatSeconds(completedElapsed)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Planned Goal</p>
                <p className="font-medium text-sm font-mono">{formatSeconds(plannedDuration)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Distraction Warnings</p>
                <p className="font-medium text-sm text-amber-600">{warningCount} warnings</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="final-notes" className="text-xs font-semibold">
                Reflections or Key Takeaways
              </Label>
              <Input
                id="final-notes"
                placeholder="What did you accomplish during this session?"
                value={finalNotes}
                onChange={(e) => setFinalNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleDiscardSession}>
              Discard
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={handleSaveSession}
            >
              Save to Analytics
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Collapsible Subject and Task Management Section */}
      <div className="pt-6 border-t">
        <button
          type="button"
          className="w-full flex items-start justify-between gap-4 rounded-xl px-3 py-3 text-left text-foreground transition-colors hover:bg-indigo-50/70 dark:hover:bg-indigo-950/30"
          onClick={() => setShowManagement(!showManagement)}
        >
          <span className="flex min-w-0 items-start gap-2.5">
            <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-400" />
            <span className="min-w-0">
              <span className="block text-base font-bold leading-6 text-foreground">
                Manage Subjects &amp; Backlog Tasks
              </span>
              <span className="mt-0.5 block text-sm font-medium leading-5 text-muted-foreground">
                {subjects.length} subjects, {tasks.length} tasks
              </span>
            </span>
          </span>
          {showManagement ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showManagement && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in">
            {/* Subjects Management */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Study Subjects</CardTitle>
                <CardDescription className="text-xs">
                  Create subjects with custom colors to categorize sessions and quizzes.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* List of existing subjects */}
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {subjects.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between p-2 rounded-lg border text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3.5 h-3.5 rounded-full"
                          style={{ backgroundColor: sub.color }}
                        />
                        <span className="font-medium">{sub.name}</span>
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {tasks.filter((t) => t.subject_id === sub.id).length} tasks
                      </span>
                    </div>
                  ))}
                </div>

                {/* Add Subject Form */}
                <form onSubmit={handleCreateSubject} className="space-y-3 pt-3 border-t">
                  <div className="space-y-1">
                    <Label htmlFor="new-sub-name" className="text-xs">
                      New Subject Name
                    </Label>
                    <Input
                      id="new-sub-name"
                      placeholder="e.g. Organic Chemistry"
                      value={newSubName}
                      onChange={(e) => setNewSubName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Badge Color</Label>
                    <div className="flex items-center gap-2">
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          className="w-6 h-6 rounded-full border flex items-center justify-center transition-transform hover:scale-110"
                          style={{ backgroundColor: c }}
                          onClick={() => setNewSubColor(c)}
                        >
                          {newSubColor === c && <Check className="w-3.5 h-3.5 text-white" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button
                    type="submit"
                    size="sm"
                    className="w-full text-xs"
                    disabled={isAddingSub || !newSubName.trim()}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Add Subject
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Task Management */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Task Backlog</CardTitle>
                <CardDescription className="text-xs">
                  Track assignments, papers, and readings with status indicators.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* List of Tasks */}
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {tasks.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic py-3 text-center">
                      No tasks in backlog. Create your first task below!
                    </p>
                  ) : (
                    tasks.map((t) => {
                      const sub = subjects.find((s) => s.id === t.subject_id)
                      return (
                        <div
                          key={t.id}
                          className="flex items-center justify-between p-2 rounded-lg border text-sm gap-2"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <button
                              type="button"
                              onClick={() => {
                                const nextStatus: TaskStatus =
                                  t.status === 'done'
                                    ? 'pending'
                                    : t.status === 'pending'
                                    ? 'in_progress'
                                    : 'done'
                                updateTaskStatus(t.id, nextStatus)
                              }}
                              className={`w-4 h-4 rounded-full border shrink-0 flex items-center justify-center ${
                                t.status === 'done'
                                  ? 'bg-emerald-500 border-emerald-500 text-white'
                                  : t.status === 'in_progress'
                                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600'
                                  : 'border-muted-foreground'
                              }`}
                            >
                              {t.status === 'done' && <Check className="w-2.5 h-2.5" />}
                              {t.status === 'in_progress' && (
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                              )}
                            </button>
                            <div className="truncate">
                              <p
                                className={`text-xs font-medium truncate ${
                                  t.status === 'done' ? 'line-through text-muted-foreground' : ''
                                }`}
                              >
                                {t.title}
                              </p>
                              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                {sub && (
                                  <span
                                    className="font-medium"
                                    style={{ color: sub.color }}
                                  >
                                    {sub.name}
                                  </span>
                                )}
                                <span>• Due {t.deadline}</span>
                              </div>
                            </div>
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
                            onClick={() => deleteTask(t.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )
                    })
                  )}
                </div>

                {/* Add Task Form */}
                <form onSubmit={handleCreateTask} className="space-y-3 pt-3 border-t">
                  <div className="space-y-1">
                    <Label htmlFor="new-task-title" className="text-xs">
                      Task Title
                    </Label>
                    <Input
                      id="new-task-title"
                      placeholder="e.g. Chapter 4 Exercises"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="new-task-sub" className="text-xs">
                        Subject
                      </Label>
                      <select
                        id="new-task-sub"
                        className="w-full h-9 px-2 text-xs rounded-md border border-input bg-background"
                        value={newTaskSubId}
                        onChange={(e) => setNewTaskSubId(e.target.value)}
                      >
                        <option value="">General</option>
                        {subjects.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="new-task-deadline" className="text-xs">
                        Due Date
                      </Label>
                      <Input
                        id="new-task-deadline"
                        type="date"
                        className="h-9 text-xs"
                        value={newTaskDeadline}
                        onChange={(e) => setNewTaskDeadline(e.target.value)}
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    size="sm"
                    className="w-full text-xs"
                    disabled={isAddingTask || !newTaskTitle.trim()}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Add Task
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
    </div>
  )
}
