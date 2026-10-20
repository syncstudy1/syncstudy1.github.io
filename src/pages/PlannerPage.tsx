import * as React from 'react'
import { Link } from 'react-router-dom'
import { usePlannerStore } from '@/stores/plannerStore'
import { useSubjects } from '@/hooks/useSubjects'
import { useTasks } from '@/hooks/useTasks'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import { Button } from '@/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/ui/card'
import { Input } from '@/ui/input'
import { Label } from '@/ui/label'
import { Badge } from '@/ui/badge'
import { useToast } from '@/ui/toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/ui/dialog'
import {
  BrainCircuit,
  Lock,
  Sparkles,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Trash2,
  ChevronDown,
  ChevronUp,
  Edit2,
  ArrowRight,
  BookOpen,
  Check,
} from 'lucide-react'
import type { StudyPlanBlock } from '@/types/database'

export function PlannerPage() {
  const { toast } = useToast()
  const { isPremium } = useSubscriptionStore()
  const { subjects } = useSubjects()
  const { tasks } = useTasks()

  const {
    currentPlan,
    savedPlans,
    isGenerating,
    error,
    generatePlan,
    approvePlan,
    discardPlan,
    loadSavedPlans,
    deletePlan,
    updatePlanBlock,
  } = usePlannerStore()

  // Form Inputs
  const [selectedSubjects, setSelectedSubjects] = React.useState<string[]>([])
  const [availableHours, setAvailableHours] = React.useState<number>(4)
  const [startDate, setStartDate] = React.useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [endDate, setEndDate] = React.useState<string>(
    new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  )

  // Edit block dialog state
  const [editingBlock, setEditingBlock] = React.useState<StudyPlanBlock | null>(null)
  const [editDuration, setEditDuration] = React.useState<number>(60)
  const [editTips, setEditTips] = React.useState<string>('')

  // Expandable saved plans
  const [expandedPlanId, setExpandedPlanId] = React.useState<string | null>(null)

  // Load saved plans on mount
  React.useEffect(() => {
    loadSavedPlans()
  }, [loadSavedPlans])

  // Preselect all subjects initially
  React.useEffect(() => {
    if (subjects.length > 0 && selectedSubjects.length === 0) {
      setSelectedSubjects(subjects.map((s) => s.name))
    }
  }, [subjects, selectedSubjects.length])

  const toggleSubject = (name: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]
    )
  }

  // Handle plan generation
  const handleGenerate = async () => {
    if (selectedSubjects.length === 0) {
      toast({
        title: 'Select at least one subject',
        description: 'Choose which subjects should be included in your schedule.',
        type: 'error',
      })
      return
    }

    try {
      const pendingTaskTitles = tasks
        .filter((t) => t.status !== 'done')
        .map((t) => `${t.title} (due: ${t.deadline})`)

      await generatePlan({
        subjects: selectedSubjects,
        tasks: pendingTaskTitles,
        availableHours,
        startDate,
        endDate,
      })

      toast({
        title: 'Your study plan is ready.',
        description: 'Review your personalized schedule below.',
        type: 'success',
      })
    } catch {
      toast({
        title: 'Generation Failed',
        description: 'Could not generate schedule. Please try again.',
        type: 'error',
      })
    }
  }

  // Handle plan approval
  const handleApprove = async () => {
    try {
      await approvePlan()
      toast({
        title: 'Plan Approved & Saved!',
        description: 'Your study plan is active in your timetable.',
        type: 'success',
      })
    } catch {
      toast({
        title: 'Failed to save plan',
        type: 'error',
      })
    }
  }

  // Handle saving block edits
  const handleSaveBlockEdit = () => {
    if (!editingBlock) return
    updatePlanBlock(editingBlock.id, editDuration, editTips)
    setEditingBlock(null)
    toast({
      title: 'Session block updated',
      type: 'info',
    })
  }

  // Group current plan schedule by day
  const groupedSchedule = React.useMemo(() => {
    if (!currentPlan) return {}
    const groups: Record<string, StudyPlanBlock[]> = {}
    currentPlan.plan_json.schedule.forEach((block) => {
      if (!groups[block.day]) {
        groups[block.day] = []
      }
      groups[block.day].push(block)
    })
    return groups
  }, [currentPlan])

  // --- PREMIUM GATE SCREEN ---
  if (!isPremium()) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-16">
        <Card className="border-indigo-100 dark:border-indigo-900/60 shadow-xl overflow-hidden relative">
          <div className="p-8 sm:p-12 text-center space-y-6">
            <div className="inline-flex p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mb-2">
              <Lock className="w-10 h-10" />
            </div>

            <div className="space-y-2 max-w-xl mx-auto">
              <Badge className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-none">
                SyncStudy Premium Exclusive
              </Badge>
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
                Study Planner
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Create evidence-based study schedules that distribute cognitive load efficiently and help you prepare without burnout.
              </p>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto text-left pt-2">
              <div className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-semibold text-foreground">Adaptive 7-Day Timetables</p>
                  <p className="text-muted-foreground">Balances intense subject modules with spaced review.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-semibold text-foreground">Task Backlog Integration</p>
                  <p className="text-muted-foreground">Prioritizes assignments approaching strict deadlines.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-semibold text-foreground">Burnout Prevention</p>
                  <p className="text-muted-foreground">Limits excessive daily hours and interleaves topics.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-semibold text-foreground">Editable Schedules</p>
                  <p className="text-muted-foreground">Customize slots, durations, and revision strategies.</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-4">
              <Link to="/premium">
                <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 shadow-md">
                  Upgrade to SyncStudy Premium
                </Button>
              </Link>
              <p className="text-xs text-muted-foreground">
                Testing this project? Use code <span className="font-mono font-bold text-foreground">UNLOCKALL</span> in the footer of the homepage to activate 30 days of Premium.
              </p>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  // --- PREMIUM SUBSCRIBER SCREEN ---
  return (
    <div className="container max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BrainCircuit className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            Study Planner
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create a personalized study schedule that fits your goals, available time, and upcoming deadlines.
          </p>
        </div>

        {currentPlan && (
          <Button variant="outline" size="sm" onClick={discardPlan}>
            Start New Plan
          </Button>
        )}
      </div>

      {/* STEP 1: Plan Inputs (Shown when no plan is being reviewed) */}
      {!currentPlan && (
        <Card className="border-indigo-100 dark:border-indigo-900/40 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Configure Your Study Plan
            </CardTitle>
            <CardDescription className="text-xs">
              Select which subjects and tasks to schedule, and define your daily study bandwidth.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Subject Selector Pills */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Include Subjects in Timetable</Label>
              <div className="flex flex-wrap gap-2 pt-1">
                {subjects.map((sub) => {
                  const isChecked = selectedSubjects.includes(sub.name)
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => toggleSubject(sub.name)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-1.5 transition-all ${
                        isChecked
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-600'
                          : 'bg-background border-border text-muted-foreground hover:border-muted-foreground/60'
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: sub.color }}
                      />
                      <span>{sub.name}</span>
                      {isChecked && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Date Range & Daily Hours Slider */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="start-date" className="text-xs font-semibold">
                  Start Date
                </Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end-date" className="text-xs font-semibold">
                  End Date
                </Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-semibold">Daily Study Hours</Label>
                  <span className="font-mono text-xs font-bold text-indigo-600">
                    {availableHours} hours / day
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="12"
                  step="1"
                  value={availableHours}
                  onChange={(e) => setAvailableHours(parseInt(e.target.value))}
                  className="w-full accent-indigo-600 mt-2"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>1h (Light)</span>
                  <span>4h (Balanced)</span>
                  <span>12h (Intense)</span>
                </div>
              </div>
            </div>

            {/* Backlog Tasks Preview */}
            <div className="p-4 rounded-xl border bg-muted/20 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                  Included Backlog Tasks ({tasks.filter((t) => t.status !== 'done').length} pending)
                </span>
                <span className="text-muted-foreground text-[11px]">
                  Deadlines will be prioritized in your schedule
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {tasks.filter((t) => t.status !== 'done').map((t) => (
                  <Badge key={t.id} variant="secondary" className="text-[11px] font-normal">
                    {t.title} ({t.deadline})
                  </Badge>
                ))}
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg border border-destructive/40 bg-destructive/10 text-xs text-destructive flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              size="lg"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-6 shadow-md transition-all"
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Creating your study plan...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  <span>Create My Study Plan</span>
                </div>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* STEP 2: Plan Review (Shown when generated plan is ready) */}
      {currentPlan && (
        <div className="space-y-6 animate-in fade-in">
          {/* Plan Header Card */}
          <Card className="border-indigo-200 dark:border-indigo-900 bg-gradient-to-r from-indigo-50/50 to-purple-50/30 dark:from-indigo-950/20 dark:to-purple-950/10 shadow-sm">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <Badge className="bg-indigo-600 text-white mb-2">New Plan Generated</Badge>
                  <CardTitle className="text-xl">{currentPlan.plan_json.title}</CardTitle>
                  <CardDescription className="text-xs text-foreground/80 mt-1">
                    {currentPlan.plan_json.summary}
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={handleGenerate} disabled={isGenerating}>
                    <RotateCcw className="w-3.5 h-3.5 mr-1" />
                    Revise
                  </Button>
                  <Button variant="ghost" size="sm" onClick={discardPlan}>
                    Discard
                  </Button>
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                    onClick={handleApprove}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    Approve Plan
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Schedule Days Grid */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-500" />
              Daily Study Timetable (Click any block to edit duration or tips)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(groupedSchedule).map(([dayLabel, blocks]) => (
                <Card key={dayLabel} className="shadow-sm border">
                  <CardHeader className="py-3 px-4 bg-muted/40 border-b">
                    <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider">
                      {dayLabel}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 space-y-2.5">
                    {blocks.map((block) => (
                      <div
                        key={block.id}
                        className="p-3 rounded-lg border bg-card hover:border-indigo-300 dark:hover:border-indigo-700 transition-all cursor-pointer group"
                        onClick={() => {
                          setEditingBlock(block)
                          setEditDuration(block.durationMinutes)
                          setEditTips(block.tips || '')
                        }}
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-medium">
                            {block.subject}
                          </Badge>
                          <span className="font-mono text-muted-foreground text-[11px]">
                            {block.timeSlot || `${block.durationMinutes}m`}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-foreground group-hover:text-indigo-600 transition-colors">
                          {block.taskTitle}
                        </p>
                        {block.tips && (
                          <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 italic">
                            "{block.tips}"
                          </p>
                        )}
                        <div className="flex items-center justify-between text-[10px] text-indigo-600 pt-1.5 mt-1 border-t opacity-0 group-hover:opacity-100 transition-opacity">
                          <span>Click to edit</span>
                          <Edit2 className="w-3 h-3" />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Saved Approved Plans */}
      <div className="pt-8 border-t space-y-4">
        <h3 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-500" />
          Saved Study Plans ({savedPlans.length})
        </h3>

        {savedPlans.length === 0 ? (
          <div className="text-center py-8 border border-dashed rounded-xl text-muted-foreground text-xs italic">
            No saved plans yet. Configure and generate your first timetable above!
          </div>
        ) : (
          <div className="space-y-4">
            {savedPlans.map((plan) => {
              const isExpanded = expandedPlanId === plan.id
              const dateStr = new Date(plan.generated_at).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })

              return (
                <Card key={plan.id} className="shadow-sm">
                  <CardHeader className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">{plan.plan_json.title}</CardTitle>
                          <Badge variant="outline" className="text-[10px]">
                            Approved
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Generated on {dateStr} • {plan.plan_json.dailyTargetHours}h / day •{' '}
                          {plan.plan_json.schedule.length} session blocks
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => setExpandedPlanId(isExpanded ? null : plan.id)}
                        >
                          {isExpanded ? (
                            <>
                              Hide Details <ChevronUp className="w-3.5 h-3.5 ml-1" />
                            </>
                          ) : (
                            <>
                              View Schedule <ChevronDown className="w-3.5 h-3.5 ml-1" />
                            </>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => deletePlan(plan.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="pt-0 border-t mt-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-4">
                        {plan.plan_json.schedule.map((block) => (
                          <div key={block.id} className="p-3 rounded-lg border bg-muted/20 text-xs space-y-1">
                            <div className="flex justify-between items-center">
                              <Badge variant="outline" className="text-[10px]">
                                {block.subject}
                              </Badge>
                              <span className="font-mono text-[10px] text-muted-foreground">
                                {block.durationMinutes} min
                              </span>
                            </div>
                            <p className="font-semibold text-foreground">{block.taskTitle}</p>
                            <p className="text-[10px] text-muted-foreground">{block.day}</p>
                            {block.tips && <p className="text-[10px] text-muted-foreground italic mt-1">"{block.tips}"</p>}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Edit Block Dialog */}
      <Dialog open={editingBlock !== null} onOpenChange={(open) => !open && setEditingBlock(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Edit Session Block</DialogTitle>
            <DialogDescription className="text-xs">
              {editingBlock?.taskTitle} ({editingBlock?.subject})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="block-duration" className="text-xs">
                Duration (Minutes)
              </Label>
              <Input
                id="block-duration"
                type="number"
                min={15}
                max={240}
                value={editDuration}
                onChange={(e) => setEditDuration(parseInt(e.target.value) || 30)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="block-tips" className="text-xs">
                Strategy Tips & Revision Notes
              </Label>
              <Input
                id="block-tips"
                value={editTips}
                onChange={(e) => setEditTips(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingBlock(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveBlockEdit} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
