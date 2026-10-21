import * as React from 'react'
import { useQuizSessions } from '@/hooks/useQuizSessions'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import { callGemini, validateQuizResponse } from '@/lib/gemini'
import { STANDARD_SUBJECTS } from '@/lib/subjects'
import { Button } from '@/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/ui/card'
import { Input } from '@/ui/input'
import { Label } from '@/ui/label'
import { Badge } from '@/ui/badge'
import { Progress } from '@/ui/progress'
import { useToast } from '@/ui/toast'
import confetti from 'canvas-confetti'
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
} from 'lucide-react'
import type { QuizQuestion, QuizDifficulty } from '@/types/database'
import { recordQualifyingActivity } from '@/lib/activity'

// ─── types ────────────────────────────────────────────────────────────────────

interface FormErrors {
  subject?: string
  topic?: string
}

// ─── component ────────────────────────────────────────────────────────────────

export function QuizPage() {
  const { toast } = useToast()
  const { isPremium } = useSubscriptionStore()
  const { quizHistory, todayQuizCount, saveQuizSession } = useQuizSessions()

  const premium = isPremium()
  const remainingFreeQuizzes = Math.max(0, 1 - todayQuizCount)

  // ── Form state ──────────────────────────────────────────────────────────────
  const [subject, setSubject] = React.useState<string>(STANDARD_SUBJECTS[0])
  const [topic, setTopic] = React.useState<string>('')
  const [difficulty, setDifficulty] = React.useState<QuizDifficulty>('medium')
  const [questionCount, setQuestionCount] = React.useState<number>(5)
  const [additionalInstructions, setAdditionalInstructions] = React.useState<string>('')
  const [formErrors, setFormErrors] = React.useState<FormErrors>({})
  const [isGenerating, setIsGenerating] = React.useState<boolean>(false)
  const [generationError, setGenerationError] = React.useState<string | null>(null)

  // ── Generation request tracking (prevents stale responses overwriting newer ones) ──
  const generationIdRef = React.useRef<number>(0)

  // ── Active quiz state ───────────────────────────────────────────────────────
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

  // ── Results state ───────────────────────────────────────────────────────────
  const [quizFinished, setQuizFinished] = React.useState<boolean>(false)
  const [finalScore, setFinalScore] = React.useState<number>(0)
  const [reviewMode, setReviewMode] = React.useState<boolean>(false)

  // ── Form validation ─────────────────────────────────────────────────────────
  function validateForm(): boolean {
    const errors: FormErrors = {}

    if (!subject || !STANDARD_SUBJECTS.includes(subject)) {
      errors.subject = 'Please select a valid subject from the list.'
    }

    const trimmedTopic = topic.trim()
    if (!trimmedTopic) {
      errors.topic = 'Please enter a specific topic or chapter name.'
    } else if (trimmedTopic.length < 2) {
      errors.topic = 'Topic must be at least 2 characters.'
    } else if (trimmedTopic.length > 300) {
      errors.topic = 'Topic is too long (max 300 characters).'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // ── Generate quiz ───────────────────────────────────────────────────────────
  const handleGenerateQuiz = async (e: React.FormEvent) => {
    e.preventDefault()
    setGenerationError(null)

    if (!validateForm()) return

    if (!premium && remainingFreeQuizzes <= 0) {
      toast({
        title: 'Daily Quiz Limit Reached',
        description: 'Free tier includes 1 practice quiz per day. Upgrade to Premium for unlimited quiz generation.',
        type: 'error',
      })
      return
    }

    // Capture the current form values at the moment of submission so they
    // cannot be changed by the user mid-generation.
    const requestSubject = subject
    const requestTopic = topic.trim()
    const requestDifficulty = difficulty
    const requestCount = questionCount
    const requestNotes = additionalInstructions.trim()

    // Increment generation ID. If another generation finishes while this one
    // is in flight, the stale result will be discarded.
    const myGenerationId = ++generationIdRef.current

    setIsGenerating(true)

    try {
      const rawResult = await callGemini({
        type: 'quiz',
        data: {
          subject: requestSubject,
          topic: requestTopic,
          difficulty: requestDifficulty,
          count: requestCount,
          notes: requestNotes,
        },
      })

      // Discard if a newer generation already completed
      if (generationIdRef.current !== myGenerationId) {
        console.info('[QuizPage] Discarding stale generation response.')
        return
      }

      // Validate the response structure
      const validated = validateQuizResponse(rawResult, requestCount, requestSubject, requestTopic)

      // Initialize quiz state with a clean slate
      setActiveQuizMeta({
        subject: requestSubject,
        topic: requestTopic,
        difficulty: requestDifficulty,
      })
      setActiveQuizQuestions(validated)
      setCurrentIndex(0)
      setSelectedOptionIndex(null)
      setIsAnswerSubmitted(false)
      setUserAnswers([])
      setQuizFinished(false)
      setFinalScore(0)
      setReviewMode(false)
      setGenerationError(null)

      toast({
        title: 'Your practice quiz is ready.',
        description: `Prepared ${validated.length} questions on "${requestTopic}".`,
        type: 'success',
      })
    } catch (err: any) {
      if (generationIdRef.current !== myGenerationId) return

      const message: string = err?.message || 'Could not generate quiz questions. Please try again.'
      setGenerationError(message)
      toast({
        title: 'Generation Failed',
        description: message,
        type: 'error',
      })
    } finally {
      if (generationIdRef.current === myGenerationId) {
        setIsGenerating(false)
      }
    }
  }

  // ── Answer submission ───────────────────────────────────────────────────────
  const handleSubmitAnswer = () => {
    if (selectedOptionIndex === null || isAnswerSubmitted) return
    setIsAnswerSubmitted(true)
  }

  // ── Next question / finish quiz ─────────────────────────────────────────────
  const handleNextQuestion = async () => {
    if (!activeQuizQuestions || !activeQuizMeta) return

    const updatedAnswers = [...userAnswers, selectedOptionIndex ?? -1]
    setUserAnswers(updatedAnswers)

    if (currentIndex + 1 < activeQuizQuestions.length) {
      setCurrentIndex(currentIndex + 1)
      setSelectedOptionIndex(null)
      setIsAnswerSubmitted(false)
    } else {
      // Calculate final score using the actual generated correctIndex values
      let score = 0
      activeQuizQuestions.forEach((q, idx) => {
        if (updatedAnswers[idx] === q.correctIndex) {
          score += 1
        }
      })

      setFinalScore(score)
      setQuizFinished(true)

      // Save quiz session to Supabase
      try {
        await saveQuizSession({
          subject: activeQuizMeta.subject,
          topic: activeQuizMeta.topic,
          difficulty: activeQuizMeta.difficulty,
          questions_json: activeQuizQuestions,
          score,
          total: activeQuizQuestions.length,
        })
        try {
          await recordQualifyingActivity('quiz')
        } catch (activityError) {
          console.error('Quiz saved, but activity-day recording failed:', activityError)
          window.dispatchEvent(new CustomEvent('syncstudy:activity-recorded'))
        }
      } catch (err) {
        console.error('Error saving quiz record:', err)
      }

      // Confetti on ≥ 80%
      const percentage = Math.round((score / activeQuizQuestions.length) * 100)
      if (percentage >= 80) {
        try {
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } })
        } catch {}
      }
    }
  }

  // ── Exit current quiz ───────────────────────────────────────────────────────
  const handleExitQuiz = () => {
    setActiveQuizQuestions(null)
    setActiveQuizMeta(null)
    setQuizFinished(false)
    setSelectedOptionIndex(null)
    setIsAnswerSubmitted(false)
    setUserAnswers([])
  }

  // ── Take another quiz ───────────────────────────────────────────────────────
  const handleTakeAnother = () => {
    setActiveQuizQuestions(null)
    setActiveQuizMeta(null)
    setQuizFinished(false)
    setReviewMode(false)
    setGenerationError(null)
    // Reset topic so the form is ready for a new subject/topic pair
    setTopic('')
  }

  // ── Grade helpers ───────────────────────────────────────────────────────────
  const getGrade = (percentage: number) => {
    if (percentage >= 90) return { label: 'A+', badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' }
    if (percentage >= 80) return { label: 'A',  badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' }
    if (percentage >= 70) return { label: 'B',  badge: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200' }
    if (percentage >= 60) return { label: 'C',  badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200' }
    return { label: 'Needs Review', badge: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200' }
  }

  // ── Revision tips from wrong answers ───────────────────────────────────────
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

  // ── Derived ─────────────────────────────────────────────────────────────────
  const currentQuestion = activeQuizQuestions ? activeQuizQuestions[currentIndex] : null
  const progressPercent = activeQuizQuestions
    ? Math.round(((currentIndex + (isAnswerSubmitted ? 1 : 0)) / activeQuizQuestions.length) * 100)
    : 0

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="container max-w-5xl mx-auto px-4 py-8 sm:py-10 space-y-8">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white">
            <span className="rounded-xl bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300"><BrainCircuit className="h-6 w-6" /></span>
            Practice Quiz
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create practice questions for your subjects, choose a topic, and test your understanding.
          </p>
        </div>

        {/* Free Tier Quota */}
        {!premium && (
          <Badge
            variant="outline"
            className="text-xs px-3 py-1.5 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 gap-1.5 self-start sm:self-auto"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Free Tier: {remainingFreeQuizzes}/1 quiz remaining today</span>
          </Badge>
        )}
      </div>

      {/* ── QUIZ SETUP FORM ─────────────────────────────────────────────────── */}
      {!activeQuizQuestions && !quizFinished && (
        <Card className="border-amber-100 dark:border-amber-950/40 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Set Up Your Practice Quiz
            </CardTitle>
            <CardDescription className="text-xs">
              Select a subject, enter a topic or chapter, and choose a difficulty level for fresh practice questions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerateQuiz} noValidate className="space-y-6">

              {/* Generation error banner */}
              {generationError && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl border border-rose-200 bg-rose-50/60 dark:border-rose-900/60 dark:bg-rose-950/30 text-xs text-rose-800 dark:text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="flex-1 leading-relaxed">
                    <strong className="font-semibold">Generation failed:</strong> {generationError}
                  </div>
                  <button
                    type="button"
                    onClick={() => setGenerationError(null)}
                    className="text-rose-500 hover:text-rose-700 font-bold text-xs ml-1"
                    aria-label="Dismiss error"
                  >
                    ×
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* ── Subject dropdown (50 unique standard subjects) ── */}
                <div className="space-y-2">
                  <Label htmlFor="quiz-subject" className="text-xs font-semibold">
                    Subject <span className="text-rose-500">*</span>
                  </Label>
                  <select
                    id="quiz-subject"
                    className={`w-full h-11 rounded-xl border bg-card px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors ${
                      formErrors.subject
                        ? 'border-rose-500 focus:ring-rose-500'
                        : 'border-input'
                    }`}
                    value={subject}
                    onChange={(e) => {
                      setSubject(e.target.value)
                      if (formErrors.subject) {
                        setFormErrors((prev) => ({ ...prev, subject: undefined }))
                      }
                    }}
                  >
                    {STANDARD_SUBJECTS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  {formErrors.subject && (
                    <p className="text-xs text-rose-500 mt-1">{formErrors.subject}</p>
                  )}
                </div>

                {/* ── Topic input ── */}
                <div className="space-y-2">
                  <Label htmlFor="quiz-topic" className="text-xs font-semibold">
                    Specific Topic or Chapter <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="quiz-topic"
                    placeholder="e.g. Arrays, Bayes' Theorem, Cell Respiration, FCFS Scheduling"
                    value={topic}
                    onChange={(e) => {
                      setTopic(e.target.value)
                      if (formErrors.topic) {
                        setFormErrors((prev) => ({ ...prev, topic: undefined }))
                      }
                    }}
                    className={formErrors.topic ? 'border-rose-500 focus:ring-rose-500' : ''}
                    aria-describedby={formErrors.topic ? 'topic-error' : undefined}
                  />
                  {formErrors.topic && (
                    <p id="topic-error" className="text-xs text-rose-500 mt-1">{formErrors.topic}</p>
                  )}
                </div>
              </div>

              {/* ── Difficulty & Question Count ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Difficulty Level</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['easy', 'medium', 'hard'] as QuizDifficulty[]).map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setDifficulty(level)}
                        className={`py-2 px-3 rounded-lg text-xs font-semibold border capitalize transition-all ${
                          difficulty === level
                            ? level === 'easy'
                              ? 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : level === 'medium'
                              ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                              : 'bg-rose-50 border-rose-500 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                            : 'bg-background border-border text-muted-foreground hover:border-muted-foreground/60'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Number of Questions</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[5, 10, 15].map((cnt) => (
                      <Button
                        key={cnt}
                        type="button"
                        variant={questionCount === cnt ? 'default' : 'outline'}
                        className="text-xs"
                        onClick={() => setQuestionCount(cnt)}
                      >
                        {cnt} Questions
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Additional instructions / course material ── */}
              <div className="space-y-2">
                <Label htmlFor="quiz-instructions" className="text-xs font-semibold">
                  Additional Instructions or Course Material{' '}
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <textarea
                  id="quiz-instructions"
                  rows={4}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-xs resize-none focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                  placeholder={
                    'Paste syllabus points, learning outcomes, exam type, subtopics to emphasise, or course material here.\n' +
                    'Example: "Focus on FCFS vs SJF comparison. Gantt chart-style questions preferred. JEE Advanced level."'
                  }
                  value={additionalInstructions}
                  onChange={(e) => setAdditionalInstructions(e.target.value)}
                  maxLength={4000}
                />
                {additionalInstructions.length > 3500 && (
                  <p className="text-xs text-amber-600">
                    {4000 - additionalInstructions.length} characters remaining.
                  </p>
                )}
              </div>

              {/* ── Submit ── */}
              <Button
                type="submit"
                size="lg"
                disabled={isGenerating || (!premium && remainingFreeQuizzes <= 0)}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-6 shadow-md transition-all disabled:opacity-60"
              >
                {isGenerating ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Preparing your practice questions...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Practice Quiz</span>
                  </div>
                )}
              </Button>

              {!premium && remainingFreeQuizzes <= 0 && (
                <p className="text-xs text-rose-500 text-center font-medium">
                  Daily quiz limit reached. Upgrade to SyncStudy Premium for unlimited quiz generation.
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      )}

      {/* ── ACTIVE QUIZ ──────────────────────────────────────────────────────── */}
      {activeQuizQuestions && !quizFinished && currentQuestion && activeQuizMeta && (
        <Card className="border shadow-lg animate-in fade-in max-w-3xl mx-auto">
          {/* Progress header */}
          <CardHeader className="pb-3 border-b bg-muted/20">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span className="font-semibold text-foreground">
                Question {currentIndex + 1} of {activeQuizQuestions.length}
              </span>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">
                  {activeQuizMeta.subject}
                </Badge>
                <Badge variant="outline" className="text-[10px] capitalize">
                  {activeQuizMeta.difficulty}
                </Badge>
                <span className="font-mono">{progressPercent}%</span>
              </div>
            </div>
            <Progress value={progressPercent} className="h-1.5" />
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Question text */}
            <h2 className="text-lg sm:text-xl font-bold text-foreground leading-snug">
              {currentQuestion.question}
            </h2>

            {/* Options */}
            <div className="space-y-3">
              {currentQuestion.options.map((option, optIdx) => {
                const isSelected = selectedOptionIndex === optIdx
                const isCorrect = optIdx === currentQuestion.correctIndex
                const optionLabel = ['A', 'B', 'C', 'D'][optIdx] ?? String(optIdx + 1)

                let optionStyles = 'border-border bg-card hover:border-indigo-300 dark:hover:border-indigo-700'
                if (isAnswerSubmitted) {
                  if (isCorrect) {
                    optionStyles =
                      'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 font-medium'
                  } else if (isSelected && !isCorrect) {
                    optionStyles =
                      'border-rose-500 bg-rose-50/80 dark:bg-rose-950/40 text-rose-900 dark:text-rose-100'
                  } else {
                    optionStyles = 'opacity-60 border-border bg-muted/20'
                  }
                } else if (isSelected) {
                  optionStyles =
                    'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-100 shadow-sm'
                }

                return (
                  <button
                    key={optIdx}
                    type="button"
                    disabled={isAnswerSubmitted}
                    onClick={() => setSelectedOptionIndex(optIdx)}
                    className={`w-full p-4 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer disabled:cursor-default ${optionStyles}`}
                  >
                    <span
                      className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                        isSelected
                          ? isAnswerSubmitted
                            ? isCorrect
                              ? 'bg-emerald-500 text-white border-emerald-500'
                              : 'bg-rose-500 text-white border-rose-500'
                            : 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-muted/40 text-muted-foreground border-muted-foreground/30'
                      }`}
                    >
                      {optionLabel}
                    </span>
                    <span className="text-sm leading-relaxed flex-1">{option}</span>
                    {isAnswerSubmitted && isCorrect && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    )}
                    {isAnswerSubmitted && isSelected && !isCorrect && (
                      <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Explanation (shown after submit) */}
            {isAnswerSubmitted && (
              <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-2 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h4 className="text-xs font-bold text-indigo-950 dark:text-indigo-200 uppercase tracking-wider">
                    Explanation
                  </h4>
                </div>
                <p className="text-xs text-foreground/90 leading-relaxed">{currentQuestion.explanation}</p>
                {currentQuestion.revisionTip && (
                  <p className="text-[11px] text-muted-foreground pt-1 border-t border-indigo-200/50 dark:border-indigo-800/40 italic">
                    💡 Revision Tip: {currentQuestion.revisionTip}
                  </p>
                )}
              </div>
            )}
          </CardContent>

          <CardFooter className="flex justify-between p-6 border-t bg-muted/10">
            <Button variant="ghost" size="sm" onClick={handleExitQuiz}>
              Exit Quiz
            </Button>

            {!isAnswerSubmitted ? (
              <Button
                onClick={handleSubmitAnswer}
                disabled={selectedOptionIndex === null}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
              >
                Submit Answer
              </Button>
            ) : (
              <Button
                onClick={handleNextQuestion}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium gap-1.5"
              >
                <span>
                  {currentIndex + 1 < activeQuizQuestions.length ? 'Next Question' : 'View Results'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </CardFooter>
        </Card>
      )}

      {/* ── RESULTS SCREEN ───────────────────────────────────────────────────── */}
      {quizFinished && activeQuizQuestions && activeQuizMeta && (
        <Card className="border shadow-lg animate-in fade-in max-w-3xl mx-auto overflow-hidden">
          <div className="p-8 text-center space-y-4 bg-gradient-to-b from-indigo-50/50 to-background dark:from-indigo-950/30">
            <div className="inline-flex p-3 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 mb-1">
              <Award className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-extrabold tracking-tight text-foreground">Quiz Complete!</h2>
              <p className="text-xs text-muted-foreground">
                {activeQuizMeta.subject} · {activeQuizMeta.topic}{' '}
                <span className="capitalize">({activeQuizMeta.difficulty})</span>
              </p>
            </div>

            {/* Score & grade */}
            <div className="flex items-center justify-center gap-6 py-4">
              <div className="text-center">
                <span className="text-5xl font-extrabold font-mono text-indigo-600">
                  {finalScore} / {activeQuizQuestions.length}
                </span>
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.round((finalScore / activeQuizQuestions.length) * 100)}% Accuracy
                </p>
              </div>

              <div className="h-12 w-px bg-border" />

              <div className="text-center">
                <Badge
                  className={`text-base px-3 py-1 font-bold border-none ${
                    getGrade(Math.round((finalScore / activeQuizQuestions.length) * 100)).badge
                  }`}
                >
                  Grade{' '}
                  {getGrade(Math.round((finalScore / activeQuizQuestions.length) * 100)).label}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">
                  {finalScore === activeQuizQuestions.length ? 'Perfect Score!' : 'Keep practising'}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReviewMode(!reviewMode)}
              >
                {reviewMode ? 'Hide Review' : 'Review Answers'}
              </Button>
              <Button
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
                onClick={handleTakeAnother}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Take Another Quiz
              </Button>
            </div>
          </div>

          {/* Revision tips from wrong answers */}
          {topicsToReview.length > 0 && (
            <div className="p-6 border-t bg-amber-50/40 dark:bg-amber-950/20 space-y-3">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-semibold text-xs">
                <AlertTriangle className="w-4 h-4" />
                <span>Recommended Concepts to Review</span>
              </div>
              <ul className="space-y-1.5 text-xs text-muted-foreground list-disc list-inside">
                {topicsToReview.map((tip, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Per-question breakdown */}
          {reviewMode && (
            <CardContent className="p-6 border-t space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Per-Question Breakdown</h3>
              <div className="space-y-3">
                {activeQuizQuestions.map((q, idx) => {
                  const isCorrect = userAnswers[idx] === q.correctIndex
                  return (
                    <div
                      key={q.id}
                      className={`p-3 rounded-lg border text-xs space-y-1 ${
                        isCorrect
                          ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50/20'
                          : 'border-rose-200 dark:border-rose-900 bg-rose-50/20'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-foreground">
                          Q{idx + 1}: {q.question}
                        </span>
                        {isCorrect ? (
                          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 border-none text-[10px] shrink-0">
                            Correct
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[10px] shrink-0">
                            Incorrect
                          </Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground text-[11px] pt-1">
                        Correct Answer:{' '}
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {q.options[q.correctIndex]}
                        </span>
                      </p>
                      <p className="text-muted-foreground text-[11px]">
                        Rationale: {q.explanation}
                      </p>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* ── QUIZ HISTORY ─────────────────────────────────────────────────────── */}
      <div className="pt-8 border-t space-y-4">
        <h3 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-500" />
          Past Quiz Sessions ({quizHistory.length})
        </h3>

        {quizHistory.length === 0 ? (
          <div className="text-center py-8 border border-dashed rounded-xl text-muted-foreground text-xs italic">
            No past quizzes found. Generate your first practice quiz above!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quizHistory.map((q) => {
              const percentage = Math.round((q.score / (q.total || 1)) * 100)
              const dateStr = new Date(q.taken_at).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })

              return (
                <Card
                  key={q.id}
                  className="shadow-sm border hover:border-indigo-300 dark:hover:border-indigo-700 transition-all"
                >
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between text-xs">
                      <Badge variant="outline" className="text-[10px] max-w-[120px] truncate">
                        {q.subject}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">{dateStr}</span>
                    </div>
                    <CardTitle className="text-sm font-semibold mt-2 line-clamp-1">{q.topic}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-1 pb-3 flex items-center justify-between">
                    <div>
                      <span className="font-mono text-xl font-bold text-foreground">
                        {q.score} / {q.total}
                      </span>
                      <span className="text-xs text-muted-foreground ml-1.5">({percentage}%)</span>
                    </div>
                    <Badge
                      className={`text-[10px] capitalize ${
                        percentage >= 80
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {q.difficulty}
                    </Badge>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
