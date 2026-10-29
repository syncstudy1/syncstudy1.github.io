import * as React from "react"
import { useQuizSessions } from "@/hooks/useQuizSessions"
import { useSubscriptionStore } from "@/stores/subscriptionStore"
import { callGemini, validateQuizResponse } from "@/lib/gemini"
import { STANDARD_SUBJECTS } from "@/lib/subjects"
import { Button } from "@/ui/button"
import { Input } from "@/ui/input"
import { Label } from "@/ui/label"
import { Badge } from "@/ui/badge"
import { Progress } from "@/ui/progress"
import { useToast } from "@/ui/toast"
import confetti from "canvas-confetti"
import {
  BrainCircuit,
  Sparkles,
  CheckCircle2,
  XCircle,
  ArrowRight,
  BookOpen,
  Award,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  HelpCircle,
  FileQuestion,
  ChevronRight,
  RotateCcw,
} from "lucide-react"
import type { QuizQuestion, QuizDifficulty } from "@/types/database"
import { recordQualifyingActivity } from "@/lib/activity"

interface FormErrors {
  subject?: string
  topic?: string
}

export function QuizPage() {
  const { toast } = useToast()
  const { isPremium } = useSubscriptionStore()
  const { quizHistory, todayQuizCount, saveQuizSession } = useQuizSessions()

  const premium = isPremium()
  const remainingFreeQuizzes = Math.max(0, 1 - todayQuizCount)

  // Form state
  const [subject, setSubject] = React.useState<string>(STANDARD_SUBJECTS[0])
  const [topic, setTopic] = React.useState<string>("")
  const [difficulty, setDifficulty] = React.useState<QuizDifficulty>("medium")
  const [questionCount, setQuestionCount] = React.useState<number>(5)
  const [additionalInstructions, setAdditionalInstructions] = React.useState<string>("")
  const [formErrors, setFormErrors] = React.useState<FormErrors>({})
  const [isGenerating, setIsGenerating] = React.useState<boolean>(false)
  const [generationError, setGenerationError] = React.useState<string | null>(null)

  const generationIdRef = React.useRef<number>(0)

  // Active quiz state
  const [activeQuizMeta, setActiveQuizMeta] = React.useState<{
    subject: string
    topic: string
    difficulty: QuizDifficulty
  } | null>(null)
  const [activeQuizQuestions, setActiveQuizQuestions] = React.useState<QuizQuestion[] | null>(null)
  const [currentIndex, setCurrentIndex] = React.useState<number>(0)
  const [selectedOptionIndex, setSelectedOptionIndex] = React.useState<number | null>(null)
  const [isAnswerSubmitted, setIsAnswerSubmitted] = React.useState<boolean>(false)
  const [userAnswers, setUserAnswers] = React.useState<number[]>([])

  // Results state
  const [quizFinished, setQuizFinished] = React.useState<boolean>(false)
  const [finalScore, setFinalScore] = React.useState<number>(0)
  const [reviewMode, setReviewMode] = React.useState<boolean>(false)

  // Form validation
  function validateForm(): boolean {
    const errors: FormErrors = {}

    if (!subject || !STANDARD_SUBJECTS.includes(subject)) {
      errors.subject = "Please select a valid subject from the list."
    }

    const trimmedTopic = topic.trim()
    if (!trimmedTopic) {
      errors.topic = "Please enter a specific topic or chapter name."
    } else if (trimmedTopic.length < 2) {
      errors.topic = "Topic must be at least 2 characters."
    } else if (trimmedTopic.length > 300) {
      errors.topic = "Topic is too long (max 300 characters)."
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Generate quiz
  const handleGenerateQuiz = async (e: React.FormEvent) => {
    e.preventDefault()
    setGenerationError(null)

    if (!validateForm()) return

    if (!premium && todayQuizCount >= 1) {
      toast({
        title: "Daily Limit Reached",
        description: "Free tier includes 1 AI quiz per day. Upgrade to Premium for unlimited quizzes.",
        type: "error",
      })
      return
    }

    setIsGenerating(true)
    const currentGenId = ++generationIdRef.current

    try {
      const raw = await callGemini({
        type: "quiz",
        data: {
          subject,
          topic: topic.trim(),
          difficulty,
          questionCount,
          additionalInstructions: additionalInstructions.trim() || undefined,
        },
      })

      if (currentGenId !== generationIdRef.current) return

      const validatedQuestions = validateQuizResponse(raw, questionCount, subject, topic.trim())

      setActiveQuizMeta({ subject, topic: topic.trim(), difficulty })
      setActiveQuizQuestions(validatedQuestions)
      setCurrentIndex(0)
      setSelectedOptionIndex(null)
      setIsAnswerSubmitted(false)
      setUserAnswers([])
      setQuizFinished(false)
      setFinalScore(0)
      setReviewMode(false)

      toast({
        title: "Quiz Ready!",
        description: `${questionCount} questions on ${topic.trim()}`,
        type: "success",
      })
    } catch (err: unknown) {
      if (currentGenId !== generationIdRef.current) return
      const msg = err instanceof Error ? err.message : "Failed to generate quiz. Please try again."
      setGenerationError(msg)
      toast({ title: "Quiz Generation Failed", description: msg, type: "error" })
    } finally {
      if (currentGenId === generationIdRef.current) {
        setIsGenerating(false)
      }
    }
  }

  // Answer selection
  const handleSelectOption = (idx: number) => {
    if (isAnswerSubmitted) return
    setSelectedOptionIndex(idx)
  }

  // Submit Answer
  const handleSubmitAnswer = () => {
    if (selectedOptionIndex === null || isAnswerSubmitted) return
    setIsAnswerSubmitted(true)
    setUserAnswers((prev) => [...prev, selectedOptionIndex])
  }

  // Next Question or Finish
  const handleNextQuestion = async () => {
    if (!activeQuizQuestions || !activeQuizMeta) return

    const nextIndex = currentIndex + 1
    if (nextIndex < activeQuizQuestions.length) {
      setCurrentIndex(nextIndex)
      setSelectedOptionIndex(null)
      setIsAnswerSubmitted(false)
    } else {
      // Calculate Score
      const allAnswers = [...userAnswers]
      let score = 0
      activeQuizQuestions.forEach((q, idx) => {
        if (allAnswers[idx] === q.correctIndex) {
          score++
        }
      })

      setFinalScore(score)
      setQuizFinished(true)

      // Save to Supabase
      try {
        await saveQuizSession({
          subject: activeQuizMeta.subject,
          topic: activeQuizMeta.topic,
          difficulty: activeQuizMeta.difficulty,
          questions_json: activeQuizQuestions,
          score,
          total: activeQuizQuestions.length,
        })
        await recordQualifyingActivity("quiz")
      } catch (err) {
        console.error("Failed to save quiz session", err)
      }

      // Confetti for good score!
      const percentage = (score / activeQuizQuestions.length) * 100
      if (percentage >= 80) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#7651E8", "#FF9B7A", "#5DAD7A", "#FFD8C2"],
        })
      }
    }
  }

  const handleExitQuiz = () => {
    setActiveQuizQuestions(null)
    setActiveQuizMeta(null)
    setQuizFinished(false)
  }

  const handleTakeAnother = () => {
    setActiveQuizQuestions(null)
    setActiveQuizMeta(null)
    setQuizFinished(false)
    setTopic("")
  }

  const currentQ = activeQuizQuestions?.[currentIndex]
  const isLastQuestion = activeQuizQuestions ? currentIndex === activeQuizQuestions.length - 1 : false

  // Grade helper
  const getGrade = (percentage: number) => {
    if (percentage >= 90) return { label: "Exceptional", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30" }
    if (percentage >= 75) return { label: "Proficient", color: "text-purple-500 bg-purple-500/10 border-purple-500/30" }
    if (percentage >= 60) return { label: "Competent", color: "text-amber-500 bg-amber-500/10 border-amber-500/30" }
    return { label: "Review Recommended", color: "text-rose-500 bg-rose-500/10 border-rose-500/30" }
  }

  // Revision tips from wrong answers
  const topicsToReview = React.useMemo(() => {
    if (!activeQuizQuestions || !quizFinished) return []
    const tips: string[] = []
    activeQuizQuestions.forEach((q, idx) => {
      if (userAnswers[idx] !== q.correctIndex && q.revisionTip) {
        tips.push(q.revisionTip)
      }
    })
    return tips
  }, [activeQuizQuestions, quizFinished, userAnswers])

  return (
    <div className="page-shell">
      <div className="page-container max-w-5xl space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-2xl bg-primary/10 text-primary">
                <FileQuestion className="h-6 w-6" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-display">
                Practice Quiz
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Active recall testing powered by Gemini AI. Test key concepts and retain knowledge.
            </p>
          </div>

          {!premium && (
            <Badge variant="outline" className="text-xs font-semibold py-1 px-3 border-amber-300 text-amber-700 dark:text-amber-300 bg-amber-500/10">
              Free Quota: {remainingFreeQuizzes}/1 today
            </Badge>
          )}
        </div>

        {/* ─── 1. ACTIVE QUIZ SCREEN ─── */}
        {activeQuizQuestions && !quizFinished && currentQ && (
          <div className="surface-panel p-6 sm:p-8 space-y-6 max-w-3xl mx-auto border-2 border-primary/20 shadow-xl animate-fade-in">
            {/* Quiz Progress & Topic */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-muted-foreground">
                  Question {currentIndex + 1} of {activeQuizQuestions.length}
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[11px] font-semibold">
                    {activeQuizMeta?.subject}
                  </Badge>
                  <Badge variant="outline" className="text-[11px] capitalize">
                    {activeQuizMeta?.difficulty}
                  </Badge>
                </div>
              </div>
              <Progress value={((currentIndex + 1) / activeQuizQuestions.length) * 100} className="h-2 rounded-full" />
            </div>

            {/* Question Text */}
            <div className="py-2">
              <h2 className="text-lg sm:text-xl font-bold text-foreground leading-relaxed">
                {currentQ.question}
              </h2>
            </div>

            {/* Multiple Choice Options */}
            <div className="space-y-3">
              {currentQ.options.map((opt, idx) => {
                const letters = ["A", "B", "C", "D"]
                const isSelected = selectedOptionIndex === idx
                const isCorrect = idx === currentQ.correctIndex

                let btnStyle = "border-border/80 bg-card hover:bg-muted/50 text-foreground"
                if (isAnswerSubmitted) {
                  if (isCorrect) {
                    btnStyle = "border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/30"
                  } else if (isSelected) {
                    btnStyle = "border-rose-500 bg-rose-500/15 text-rose-700 dark:text-rose-300"
                  } else {
                    btnStyle = "opacity-50 border-border/40"
                  }
                } else if (isSelected) {
                  btnStyle = "border-primary bg-primary/10 text-primary ring-2 ring-primary/40 font-semibold"
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectOption(idx)}
                    disabled={isAnswerSubmitted}
                    className={`w-full flex items-center gap-3.5 p-4 rounded-2xl border text-left text-sm transition-all duration-200 ${btnStyle}`}
                  >
                    <span className="h-7 w-7 rounded-xl bg-muted/80 font-bold text-xs flex items-center justify-center flex-shrink-0">
                      {letters[idx]}
                    </span>
                    <span className="flex-1 font-medium">{opt}</span>
                    {isAnswerSubmitted && isCorrect && (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                    )}
                    {isAnswerSubmitted && isSelected && !isCorrect && (
                      <XCircle className="h-5 w-5 text-rose-500 flex-shrink-0" />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Explanation Panel (shown after submit) */}
            {isAnswerSubmitted && (
              <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 text-xs sm:text-sm space-y-2 animate-fade-in">
                <p className="font-bold text-foreground flex items-center gap-1.5">
                  <HelpCircle className="h-4 w-4 text-primary" />
                  Explanation
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  {currentQ.explanation}
                </p>
                {currentQ.revisionTip && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium pt-1">
                    💡 Study tip: {currentQ.revisionTip}
                  </p>
                )}
              </div>
            )}

            {/* Action Buttons Footer */}
            <div className="flex items-center justify-between pt-2">
              <Button variant="ghost" size="sm" onClick={handleExitQuiz} className="text-muted-foreground text-xs">
                Exit Quiz
              </Button>

              {!isAnswerSubmitted ? (
                <Button
                  onClick={handleSubmitAnswer}
                  disabled={selectedOptionIndex === null}
                  className="bg-[#7651E8] hover:bg-[#6842D8] text-white rounded-xl text-xs px-6 h-10 font-semibold"
                >
                  Submit Answer
                </Button>
              ) : (
                <Button
                  onClick={handleNextQuestion}
                  className="bg-[#7651E8] hover:bg-[#6842D8] text-white rounded-xl text-xs px-6 h-10 font-semibold gap-1.5"
                >
                  <span>{isLastQuestion ? "View Final Results" : "Next Question"}</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* ─── 2. RESULTS SCREEN ─── */}
        {quizFinished && activeQuizQuestions && (
          <div className="surface-panel p-6 sm:p-10 space-y-6 max-w-3xl mx-auto border-2 border-primary/20 shadow-2xl animate-fade-in text-center">
            <div className="h-16 w-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-inner">
              <Award className="h-9 w-9 text-amber-500" />
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground font-display">
                Quiz Complete!
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {activeQuizMeta?.subject} • {activeQuizMeta?.topic}
              </p>
            </div>

            {/* Score Display Card */}
            <div className="p-6 rounded-2xl bg-muted/40 border border-border/60 max-w-sm mx-auto space-y-2">
              <span className="text-4xl sm:text-5xl font-black text-foreground tabular-nums">
                {finalScore} / {activeQuizQuestions.length}
              </span>
              <p className="text-sm font-semibold text-muted-foreground">
                {Math.round((finalScore / activeQuizQuestions.length) * 100)}% Score
              </p>
              <div className="pt-2">
                <Badge
                  variant="outline"
                  className={`text-xs font-bold py-1 px-3 ${
                    getGrade((finalScore / activeQuizQuestions.length) * 100).color
                  }`}
                >
                  {getGrade((finalScore / activeQuizQuestions.length) * 100).label}
                </Badge>
              </div>
            </div>

            {/* Revision Tips list if any missed */}
            {topicsToReview.length > 0 && (
              <div className="text-left p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                <p className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4" />
                  Key Revision Tips based on your answers:
                </p>
                <ul className="text-xs text-foreground/80 space-y-1 list-disc pl-5">
                  {topicsToReview.map((tip, idx) => (
                    <li key={idx}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setReviewMode(!reviewMode)}
                className="rounded-xl text-xs"
              >
                {reviewMode ? "Hide Question Review" : "Review All Answers"}
              </Button>
              <Button
                onClick={handleTakeAnother}
                className="bg-[#7651E8] hover:bg-[#6842D8] text-white rounded-xl text-xs gap-1.5 font-semibold"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Take Another Quiz</span>
              </Button>
            </div>

            {/* Review Mode Breakdown */}
            {reviewMode && (
              <div className="text-left space-y-4 pt-6 border-t border-border/60">
                <h3 className="text-sm font-bold text-foreground">Detailed Question Breakdown</h3>
                {activeQuizQuestions.map((q, idx) => {
                  const userAns = userAnswers[idx]
                  const isCorrect = userAns === q.correctIndex
                  return (
                    <div key={idx} className="p-4 rounded-xl border border-border/60 bg-card space-y-2 text-xs">
                      <div className="flex items-center justify-between font-semibold">
                        <span>Question {idx + 1}</span>
                        {isCorrect ? (
                          <span className="text-emerald-500 font-bold flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Correct
                          </span>
                        ) : (
                          <span className="text-rose-500 font-bold flex items-center gap-1">
                            <XCircle className="h-3.5 w-3.5" /> Incorrect
                          </span>
                        )}
                      </div>
                      <p className="font-medium text-foreground">{q.question}</p>
                      <p className="text-muted-foreground">
                        Your answer: <span className="font-semibold">{q.options[userAns] || "None"}</span>
                      </p>
                      {!isCorrect && (
                        <p className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          Correct answer: {q.options[q.correctIndex]}
                        </p>
                      )}
                      <p className="text-[11px] text-muted-foreground/80 italic pt-1 border-t border-border/40">
                        {q.explanation}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── 3. QUIZ SETUP FORM (Shown when no quiz is active) ─── */}
        {!activeQuizQuestions && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Form Column (8 cols) */}
            <form onSubmit={handleGenerateQuiz} className="lg:col-span-8 surface-panel p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  Create AI Practice Quiz
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Select your subject, chapter or topic, and customize questions.
                </p>
              </div>

              {generationError && (
                <div className="p-3 rounded-xl border border-destructive/40 bg-destructive/10 text-xs text-destructive flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{generationError}</span>
                </div>
              )}

              {/* Subject Dropdown */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Study Subject</Label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-card border border-border text-sm font-medium focus:ring-2 focus:ring-primary/40 focus:outline-none"
                >
                  {STANDARD_SUBJECTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                {formErrors.subject && (
                  <p className="text-[11px] text-rose-500">{formErrors.subject}</p>
                )}
              </div>

              {/* Topic / Chapter Input */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Specific Topic or Chapter</Label>
                <Input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Binary Search Trees & Tree Traversals"
                  className="rounded-xl h-11"
                />
                {formErrors.topic && (
                  <p className="text-[11px] text-rose-500">{formErrors.topic}</p>
                )}
              </div>

              {/* Difficulty Selector */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Difficulty Level</Label>
                <div className="grid grid-cols-3 gap-2.5">
                  {(["easy", "medium", "hard"] as QuizDifficulty[]).map((d) => {
                    const isSelected = difficulty === d
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDifficulty(d)}
                        className={`h-10 rounded-xl text-xs font-bold capitalize transition-all border ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-card border-border/80 text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {d}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Question Count Selector */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Number of Questions</Label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[5, 10, 15].map((cnt) => {
                    const isSelected = questionCount === cnt
                    return (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => setQuestionCount(cnt)}
                        className={`h-10 rounded-xl text-xs font-bold transition-all border ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-card border-border/80 text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {cnt} Questions
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Additional Instructions textarea */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Additional Instructions (Optional)</Label>
                <textarea
                  value={additionalInstructions}
                  onChange={(e) => setAdditionalInstructions(e.target.value)}
                  placeholder="e.g. Include real-world coding scenarios or exam-style trick questions"
                  maxLength={4000}
                  rows={3}
                  className="w-full p-3 rounded-xl bg-card border border-border text-xs focus:ring-2 focus:ring-primary/40 focus:outline-none resize-none"
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                size="lg"
                disabled={isGenerating}
                className="w-full bg-[#7651E8] hover:bg-[#6842D8] text-white font-semibold py-6 rounded-2xl shadow-lg shadow-purple-500/25 transition-all hover:scale-[1.01]"
              >
                {isGenerating ? (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Generating Questions with AI...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    <span>Generate Quiz Now</span>
                  </div>
                )}
              </Button>
            </form>

            {/* Quiz History Sidebar (4 cols) */}
            <div className="lg:col-span-4 surface-panel p-5 space-y-4">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border/60 pb-2.5">
                <BrainCircuit className="h-4 w-4 text-primary" />
                Recent Quizzes ({quizHistory.length})
              </h2>

              {quizHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileQuestion className="h-8 w-8 mx-auto mb-1 opacity-60" />
                  <p className="text-xs font-semibold">No quizzes taken yet</p>
                  <p className="text-[10px] mt-0.5">Generate your first quiz on the left.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                  {quizHistory.slice(0, 8).map((q) => (
                    <div
                      key={q.id}
                      className="p-3 rounded-xl border border-border/60 bg-card hover:bg-muted/40 transition-colors space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between font-bold text-foreground">
                        <span className="truncate max-w-[140px]">{q.topic}</span>
                        <span className="text-primary font-bold tabular-nums">
                          {q.score}/{q.total}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>{q.subject}</span>
                        <span className="capitalize">{q.difficulty}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
