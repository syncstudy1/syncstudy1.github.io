import * as React from "react"
import { Link } from "react-router-dom"
import { usePlannerStore } from "@/stores/plannerStore"
import { useSubjects } from "@/hooks/useSubjects"
import { useTasks } from "@/hooks/useTasks"
import { useSubscriptionStore } from "@/stores/subscriptionStore"
import { Button } from "@/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/ui/card"
import { Input } from "@/ui/input"
import { Label } from "@/ui/label"
import { Badge } from "@/ui/badge"
import { useToast } from "@/ui/toast"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/ui/dialog"
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
  CalendarDays,
  Target,
  Sliders,
} from "lucide-react"
import type { StudyPlanBlock } from "@/types/database"

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
    new Date().toISOString().split("T")[0]
  )
  const [endDate, setEndDate] = React.useState<string>(
    new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]
  )

  // Edit block dialog state
  const [editingBlock, setEditingBlock] = React.useState<StudyPlanBlock | null>(null)
  const [editDuration, setEditDuration] = React.useState<number>(60)
  const [editTips, setEditTips] = React.useState<string>("")

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
        title: "Select at least one subject",
        description: "Choose which subjects should be included in your schedule.",
        type: "error",
      })
      return
    }

    try {
      const pendingTaskTitles = tasks
        .filter((t) => t.status !== "done")
        .map((t) => `${t.title} (due: ${t.deadline})`)

      await generatePlan({
        subjects: selectedSubjects,
        tasks: pendingTaskTitles,
        availableHours,
        startDate,
        endDate,
      })

      toast({
        title: "Your study plan is ready.",
        description: "Review your personalized schedule below.",
        type: "success",
      })
    } catch {
      toast({
        title: "Generation Failed",
        description: "Could not generate schedule. Please try again.",
        type: "error",
      })
    }
  }

  // Handle plan approval
  const handleApprove = async () => {
    try {
      await approvePlan()
      toast({
        title: "Plan Approved & Saved!",
        description: "Your study plan is active in your timetable.",
        type: "success",
      })
    } catch {
      toast({
        title: "Failed to save plan",
        type: "error",
      })
    }
  }

  // Handle saving block edits
  const handleSaveBlockEdit = () => {
    if (!editingBlock) return
    updatePlanBlock(editingBlock.id, editDuration, editTips)
    setEditingBlock(null)
    toast({
      title: "Session block updated",
      type: "info",
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
      <div className="page-shell">
        <div className="page-container max-w-4xl py-16">
          <div className="surface-panel p-8 sm:p-12 text-center space-y-6 border border-purple-200/60 dark:border-purple-900/40 shadow-xl">
            <div className="inline-flex p-4 rounded-3xl bg-primary/10 text-primary mb-2 shadow-inner">
              <Lock className="w-10 h-10" />
            </div>

            <div className="space-y-2 max-w-xl mx-auto">
              <Badge variant="premium" className="py-1 px-3">
                SyncStudy Premium Exclusive
              </Badge>
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground font-display">
                AI Study Planner
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Create evidence-based study schedules that distribute cognitive load efficiently and help you prepare without burnout.
              </p>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto text-left pt-2">
              <div className="flex items-start gap-3 p-3.5 rounded-2xl border border-border/80 bg-card">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-semibold text-foreground">Adaptive 7-Day Timetables</p>
                  <p className="text-muted-foreground">Balances intense subject modules with spaced review.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-2xl border border-border/80 bg-card">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-semibold text-foreground">Task Backlog Integration</p>
                  <p className="text-muted-foreground">Prioritizes assignments approaching strict deadlines.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-2xl border border-border/80 bg-card">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-semibold text-foreground">Burnout Prevention</p>
                  <p className="text-muted-foreground">Limits excessive daily hours and interleaves topics.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-2xl border border-border/80 bg-card">
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
                <Button size="lg" className="bg-[#7651E8] hover:bg-[#6842D8] text-white font-semibold px-8 rounded-2xl shadow-lg shadow-purple-500/25">
                  Upgrade to SyncStudy Premium
                </Button>
              </Link>
              <p className="text-xs text-muted-foreground">
                Testing this project? Use code <span className="font-mono font-bold text-foreground">UNLOCKALL</span> in the footer of the homepage to activate 30 days of Premium.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // --- PREMIUM SUBSCRIBER SCREEN ---
  return (
    <div className="page-shell">
      <div className="page-container max-w-6xl space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-2xl bg-primary/10 text-primary">
                <BrainCircuit className="h-6 w-6" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-display">
                Study Planner
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Create a personalized study schedule that fits your goals, available time, and upcoming deadlines.
            </p>
          </div>

          {currentPlan && (
            <Button variant="outline" size="sm" onClick={discardPlan} className="rounded-xl">
              Start New Plan
            </Button>
          )}
        </div>

        {/* STEP 1: Plan Inputs (Shown when no plan is being reviewed) */}
        {!currentPlan && (
          <div className="surface-panel p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                Configure Your Study Plan
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Select which subjects and tasks to schedule, and define your daily study bandwidth.
              </p>
            </div>

            {/* Subject Selector Pills */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Include Subjects in Timetable
              </Label>
              <div className="flex flex-wrap gap-2 pt-1">
                {subjects.map((sub) => {
                  const isChecked = selectedSubjects.includes(sub.name)
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => toggleSubject(sub.name)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border flex items-center gap-2 transition-all ${
                        isChecked
                          ? "bg-primary/15 border-primary text-primary shadow-sm"
                          : "bg-card border-border/80 text-muted-foreground hover:border-muted-foreground"
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: sub.color }} />
                      <span>{sub.name}</span>
                      {isChecked && <Check className="w-3.5 h-3.5 text-primary" />}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Date Range & Daily Hours Slider */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              <div className="space-y-2">
                <Label htmlFor="start-date" className="text-xs font-semibold">
                  Start Date
                </Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-xl"
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
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-semibold">Daily Study Hours</Label>
                  <span className="font-mono text-xs font-bold text-primary">
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
                  className="w-full accent-primary mt-2 h-2 rounded-full bg-muted cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>1h (Light)</span>
                  <span>4h (Balanced)</span>
                  <span>12h (Intense)</span>
                </div>
              </div>
            </div>

            {/* Backlog Tasks Preview */}
            <div className="p-4 rounded-2xl border border-border/60 bg-muted/30 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-primary" />
                  Included Backlog Tasks ({tasks.filter((t) => t.status !== "done").length} pending)
                </span>
                <span className="text-muted-foreground text-[11px]">
                  Deadlines will be prioritized in your schedule
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {tasks
                  .filter((t) => t.status !== "done")
                  .map((t) => (
                    <Badge key={t.id} variant="secondary" className="text-[11px] font-normal rounded-lg">
                      {t.title} ({t.deadline})
                    </Badge>
                  ))}
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl border border-destructive/40 bg-destructive/10 text-xs text-destructive flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              size="lg"
              className="w-full bg-[#7651E8] hover:bg-[#6842D8] text-white font-semibold py-6 rounded-2xl shadow-lg shadow-purple-500/25 transition-all hover:scale-[1.01]"
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
                  <span>Generate AI Timetable</span>
                </div>
              )}
            </Button>
          </div>
        )}

        {/* STEP 2: Plan Review (when currentPlan exists) */}
        {currentPlan && (
          <div className="space-y-6 animate-fade-in">
            {/* Plan Header Card */}
            <div className="surface-panel p-6 sm:p-8 bg-gradient-to-r from-purple-500/10 via-card to-orange-500/10 border-border/80">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <Badge variant="outline" className="text-xs font-semibold text-primary border-primary/30">
                    Review Mode
                  </Badge>
                  <h2 className="text-2xl font-extrabold text-foreground font-display">
                    {currentPlan.plan_json.title || "Your Custom Study Schedule"}
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
                    {currentPlan.plan_json.summary}
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <Button variant="outline" onClick={discardPlan} className="rounded-xl text-xs">
                    Discard
                  </Button>
                  <Button onClick={handleApprove} className="bg-[#7651E8] hover:bg-[#6842D8] text-white rounded-xl text-xs gap-1.5 shadow-md">
                    <Check className="w-4 h-4" />
                    <span>Approve & Save Plan</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Days Schedule Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(groupedSchedule).map(([day, blocks]) => (
                <div key={day} className="surface-panel p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5 text-primary" />
                      {day}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-semibold">
                      {blocks.reduce((acc, b) => acc + (b.durationMinutes || 0), 0)} min total
                    </span>
                  </div>

                  <div className="space-y-2">
                    {blocks.map((block) => (
                      <div
                        key={block.id}
                        onClick={() => {
                          setEditingBlock(block)
                          setEditDuration(block.durationMinutes)
                          setEditTips(block.tips || "")
                        }}
                        className="p-3 rounded-xl border border-border/60 bg-card hover:bg-muted/40 cursor-pointer transition-all hover:scale-[1.01] group space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                            {block.subject}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                            {block.durationMinutes}m
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-1">
                          {block.taskTitle}
                        </p>
                        {block.tips && (
                          <p className="text-[10px] text-muted-foreground/80 italic line-clamp-1 border-t border-border/40 pt-1">
                            💡 {block.tips}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3: Saved Study Plans */}
        {savedPlans.length > 0 && (
          <div className="surface-panel p-6 sm:p-8 space-y-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Saved Study Plans ({savedPlans.length})
            </h2>

            <div className="space-y-3">
              {savedPlans.map((plan) => {
                const isExpanded = expandedPlanId === plan.id
                return (
                  <div key={plan.id} className="rounded-2xl border border-border/60 bg-card overflow-hidden">
                    <div className="p-4 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">
                          {plan.plan_json?.title || "7-Day Schedule"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Generated on {new Date(plan.generated_at).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedPlanId(isExpanded ? null : plan.id)}
                          className="text-xs gap-1"
                        >
                          <span>{isExpanded ? "Collapse" : "View"}</span>
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deletePlan(plan.id)}
                          className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 p-1.5 h-8 w-8"
                          title="Delete plan"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-4 pt-0 border-t border-border/40 bg-muted/20">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-3">
                          {plan.plan_json?.schedule?.map((b: StudyPlanBlock) => (
                            <div key={b.id} className="p-2.5 rounded-xl border border-border/60 bg-card text-xs">
                              <div className="flex justify-between font-bold text-foreground">
                                <span>{b.day}: {b.subject}</span>
                                <span>{b.durationMinutes}m</span>
                              </div>
                              <p className="text-[11px] text-muted-foreground mt-0.5">{b.taskTitle}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Edit Block Dialog */}
        <Dialog open={!!editingBlock} onOpenChange={(open) => !open && setEditingBlock(null)}>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Edit Study Block</DialogTitle>
              <DialogDescription>
                Adjust duration and revision tips for {editingBlock?.subject}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Duration (minutes)</Label>
                <Input
                  type="number"
                  min="15"
                  max="240"
                  value={editDuration}
                  onChange={(e) => setEditDuration(Number(e.target.value))}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Study Tips & Key Focus</Label>
                <Input
                  type="text"
                  value={editTips}
                  onChange={(e) => setEditTips(e.target.value)}
                  placeholder="e.g. Focus on edge cases and active recall"
                  className="rounded-xl"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingBlock(null)} className="rounded-xl">
                Cancel
              </Button>
              <Button onClick={handleSaveBlockEdit} className="bg-primary text-primary-foreground rounded-xl">
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
