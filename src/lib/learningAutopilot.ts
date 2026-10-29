import type {
  QuizSession,
  StudyPlan,
  StudySession,
  Subject,
  Task,
} from '@/types/database'

export const AUTOPILOT_WEIGHTS = {
  deadlineUrgency: 0.25,
  topicWeakness: 0.20,
  revisionNeed: 0.15,
  prerequisiteReadiness: 0.15,
  studyPlanRelevance: 0.10,
  availableTimeFit: 0.10,
  recentLearningEvidence: 0.05,
} as const

export const AUTOPILOT_DEFAULTS = {
  availableMinutes: 120,
  preferredSessionMinutes: 25,
  minimumActionMinutes: 10,
  maximumActionMinutes: 180,
} as const

export type AutopilotActionType = 'task' | 'weak-topic' | 'revision' | 'plan' | 'progression'

export interface AutopilotSettings {
  availableMinutes: number
  preferredSessionMinutes: number
  applyManually: boolean
}

export interface AutopilotData {
  subjects: Subject[]
  tasks: Task[]
  studySessions: StudySession[]
  studyPlans: StudyPlan[]
  quizSessions: QuizSession[]
  now?: Date
}

export interface AutopilotFeatures {
  deadlineUrgency: number | null
  topicWeakness: number | null
  revisionNeed: number | null
  prerequisiteReadiness: number | null
  studyPlanRelevance: number | null
  availableTimeFit: number | null
  recentLearningEvidence: number | null
}

export interface RecommendationAction {
  id: string
  type: AutopilotActionType
  title: string
  subjectId: string | null
  subjectName: string | null
  topic: string | null
  taskId: string | null
  durationMinutes: number
  score: number
  priority: 'high' | 'medium' | 'low'
  features: AutopilotFeatures
  reasons: string[]
  evidence: string[]
  deadline: string | null
  prerequisiteStatus: 'not-represented' | 'satisfied' | 'unmet'
}

export interface StudySequenceItem extends RecommendationAction {
  order: number
  overBudget: boolean
  sequenceReason: string
}

export interface AutopilotProgress {
  pendingTasks: number
  revisionOpportunities: number
  demonstratedWeakAreas: number
  studySessions: number
  quizAttempts: number
}

export interface PersonalizationAdjustments {
  [key: string]: number
}

export interface AutopilotPersonalizationSummary {
  ready: boolean
  observationCount: number
  label: 'baseline' | 'personalized'
}

export interface RecommendationResult {
  calculatedAt: string
  mode: 'baseline' | 'personalized'
  actions: RecommendationAction[]
  sequence: StudySequenceItem[]
  nextAction: RecommendationAction | null
  progress: AutopilotProgress
  personalization: AutopilotPersonalizationSummary
  notes: string[]
}

interface Candidate {
  id: string
  type: AutopilotActionType
  title: string
  subjectId: string | null
  subjectName: string | null
  topic: string | null
  taskId: string | null
  durationMinutes: number
  deadline: string | null
  prerequisiteStatus: 'not-represented' | 'satisfied' | 'unmet'
  reasons: string[]
  evidence: string[]
  features: AutopilotFeatures
}

export interface RankingProfile {
  ready: boolean
  adjustments?: PersonalizationAdjustments
  observationCount?: number
}

const FEATURE_KEYS = Object.keys(AUTOPILOT_WEIGHTS) as Array<keyof AutopilotFeatures>

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value))

const normalize = (value: number, fallback = 0) => Number.isFinite(value) ? clamp(value) : fallback

const cleanText = (value: string | null | undefined) => value?.trim() || ''

const normalizeKey = (value: string | null | undefined) => cleanText(value).toLocaleLowerCase()

const dateOnly = (value: string | Date) => {
  const date = typeof value === 'string' ? new Date(`${value.length === 10 ? `${value}T12:00:00` : value}`) : value
  return date.toISOString().slice(0, 10)
}

const daysBetween = (from: Date, to: Date) => (to.getTime() - from.getTime()) / 86400000

const validQuiz = (quiz: QuizSession) => (
  Number.isFinite(quiz.score) && Number.isFinite(quiz.total) && quiz.total > 0 &&
  quiz.score >= 0 && quiz.score <= quiz.total && cleanText(quiz.subject)
)

const durationForHours = (hours: number | null | undefined) => {
  const minutes = Number.isFinite(hours) && (hours || 0) > 0 ? Math.round((hours || 0) * 60) : AUTOPILOT_DEFAULTS.preferredSessionMinutes
  return Math.min(AUTOPILOT_DEFAULTS.maximumActionMinutes, Math.max(AUTOPILOT_DEFAULTS.minimumActionMinutes, minutes))
}

const findSubject = (subjects: Subject[], name: string | null | undefined) => {
  const key = normalizeKey(name)
  return subjects.find((subject) => normalizeKey(subject.name) === key) || null
}

function deadlineUrgency(deadline: string, now: Date): number {
  const due = new Date(`${deadline}T12:00:00Z`)
  if (Number.isNaN(due.getTime())) return 0
  const today = new Date(`${dateOnly(now)}T12:00:00Z`)
  const days = daysBetween(today, due)
  if (days <= 0) return 1
  return clamp(1 - days / 14)
}

function scorePriority(score: number): RecommendationAction['priority'] {
  if (score >= 0.7) return 'high'
  if (score >= 0.4) return 'medium'
  return 'low'
}

function quizGroups(quizzes: QuizSession[]) {
  const groups = new Map<string, { subject: string; topic: string; attempts: QuizSession[] }>()
  quizzes.filter(validQuiz).forEach((quiz) => {
    const key = `${normalizeKey(quiz.subject)}::${normalizeKey(quiz.topic)}`
    const group = groups.get(key) || { subject: quiz.subject.trim(), topic: quiz.topic.trim(), attempts: [] }
    group.attempts.push(quiz)
    groups.set(key, group)
  })
  return groups
}

function calculateFeatures(
  candidate: Omit<Candidate, 'features'>,
  data: AutopilotData,
  settings: AutopilotSettings,
  now: Date,
  quizPerformance: Map<string, { average: number; lastAt: string; attempts: number }>,
): AutopilotFeatures {
  const subjectKey = normalizeKey(candidate.subjectName)
  const topicKey = candidate.topic ? `${subjectKey}::${normalizeKey(candidate.topic)}` : ''
  const subjectTasks = data.tasks.filter((task) => task.status !== 'done' && normalizeKey(task.subject?.name) === subjectKey)
  const relatedPerformance = topicKey ? quizPerformance.get(topicKey) : undefined
  const subjectPerformance = [...quizPerformance.entries()]
    .filter(([key]) => key.startsWith(`${subjectKey}::`))
    .map(([, value]) => value)

  const lastSession = data.studySessions
    .filter((session) => (session.actual_duration_s || 0) > 0 && normalizeKey(session.subject?.name) === subjectKey)
    .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())[0]
  const lastEvidenceAt = relatedPerformance?.lastAt || lastSession?.started_at || null
  const ageDays = lastEvidenceAt ? Math.max(0, daysBetween(new Date(lastEvidenceAt), now)) : null

  return {
    deadlineUrgency: candidate.deadline ? deadlineUrgency(candidate.deadline, now) : (
      subjectTasks.length > 0 ? Math.max(...subjectTasks.map((task) => deadlineUrgency(task.deadline, now))) : null
    ),
    topicWeakness: relatedPerformance ? clamp(1 - relatedPerformance.average) : (
      candidate.topic ? null : subjectPerformance.length > 0
        ? clamp(1 - subjectPerformance.reduce((sum, item) => sum + item.average, 0) / subjectPerformance.length)
        : null
    ),
    revisionNeed: candidate.type === 'revision' ? clamp((ageDays ?? 0) / 14) : null,
    prerequisiteReadiness: candidate.type === 'progression'
      ? (lastEvidenceAt ? 0.75 : 0.25)
      : candidate.type === 'plan' ? 0.5 : null,
    studyPlanRelevance: candidate.type === 'plan' ? 1 : null,
    availableTimeFit: settings.availableMinutes > 0
      ? clamp(settings.availableMinutes / Math.max(candidate.durationMinutes, settings.availableMinutes))
      : null,
    recentLearningEvidence: ageDays === null ? null : clamp(1 - ageDays / 30),
  }
}

function rankCandidate(candidate: Candidate, profile: RankingProfile): RecommendationAction {
  let weightTotal = 0
  let weightedTotal = 0
  FEATURE_KEYS.forEach((key) => {
    const value = candidate.features[key]
    if (value === null || value === undefined) return
    const weight = AUTOPILOT_WEIGHTS[key]
    weightTotal += weight
    weightedTotal += weight * normalize(value)
  })

  const baselineScore = weightTotal > 0 ? weightedTotal / weightTotal : 0
  const multiplier = profile.ready ? clamp(profile.adjustments?.[candidate.type] ?? 1, 0.85, 1.15) : 1
  const score = clamp(baselineScore * multiplier)
  return {
    ...candidate,
    score,
    priority: scorePriority(score),
  }
}

function compareActions(a: RecommendationAction, b: RecommendationAction) {
  if (b.score !== a.score) return b.score - a.score
  const aDeadline = a.deadline || '9999-12-31'
  const bDeadline = b.deadline || '9999-12-31'
  if (aDeadline !== bDeadline) return aDeadline.localeCompare(bDeadline)
  if (a.durationMinutes !== b.durationMinutes) return a.durationMinutes - b.durationMinutes
  return a.id.localeCompare(b.id)
}

function createCandidates(data: AutopilotData, settings: AutopilotSettings, now: Date): Candidate[] {
  const candidates: Candidate[] = []
  const seen = new Set<string>()
  const add = (candidate: Omit<Candidate, 'features'>) => {
    if (seen.has(candidate.id) || candidate.prerequisiteStatus === 'unmet') return
    seen.add(candidate.id)
    candidates.push({
      ...candidate,
      features: calculateFeatures(candidate, data, settings, now, performance),
    })
  }

  const performance = new Map<string, { average: number; lastAt: string; attempts: number }>()
  quizGroups(data.quizSessions).forEach((group, key) => {
    const attempts = group.attempts.slice().sort((a, b) => new Date(b.taken_at).getTime() - new Date(a.taken_at).getTime())
    performance.set(key, {
      average: attempts.reduce((sum, quiz) => sum + quiz.score / quiz.total, 0) / attempts.length,
      lastAt: attempts[0].taken_at,
      attempts: attempts.length,
    })
  })

  data.tasks.filter((task) => task.status !== 'done').forEach((task) => {
    const subject = task.subject || data.subjects.find((item) => item.id === task.subject_id)
    add({
      id: `task:${task.id}`,
      type: 'task',
      title: task.title.trim() || 'Complete assignment',
      subjectId: subject?.id || task.subject_id || null,
      subjectName: subject?.name || null,
      topic: null,
      taskId: task.id,
      durationMinutes: durationForHours(task.estimated_hours),
      deadline: task.deadline || null,
      prerequisiteStatus: 'not-represented',
      reasons: ['This task is still open in your backlog.'],
      evidence: [task.deadline ? `Due ${task.deadline}.` : 'No deadline is stored for this task.'],
    })
  })

  performance.forEach((result, key) => {
    if (result.average >= 0.7) return
    const [subjectKey, topicKey] = key.split('::')
    const subjectName = data.quizSessions.find((quiz) => normalizeKey(quiz.subject) === subjectKey)?.subject.trim() || subjectKey
    const topicName = topicKey
      ? data.quizSessions.find((quiz) => normalizeKey(quiz.subject) === subjectKey && normalizeKey(quiz.topic) === topicKey)?.topic.trim() || topicKey
      : null
    const subject = findSubject(data.subjects, subjectName)
    add({
      id: `weak-topic:${subjectKey}:${topicKey}`,
      type: 'weak-topic',
      title: topicName ? `Practise ${topicName}` : `Practise ${subjectName}`,
      subjectId: subject?.id || null,
      subjectName: subject?.name || subjectName,
      topic: topicName,
      taskId: null,
      durationMinutes: settings.preferredSessionMinutes,
      deadline: null,
      prerequisiteStatus: 'not-represented',
      reasons: ['Your recorded quiz performance shows this area needs practice.'],
      evidence: [`Average recorded quiz score: ${Math.round(result.average * 100)}% across ${result.attempts} attempt${result.attempts === 1 ? '' : 's'}.`],
    })
  })

  const revisionKeys = new Set<string>()
  performance.forEach((result, key) => {
    if (daysBetween(new Date(result.lastAt), now) < 3) return
    revisionKeys.add(key)
    const [subjectKey, topicKey] = key.split('::')
    const subjectName = data.quizSessions.find((quiz) => normalizeKey(quiz.subject) === subjectKey)?.subject.trim() || subjectKey
    const topicName = topicKey
      ? data.quizSessions.find((quiz) => normalizeKey(quiz.subject) === subjectKey && normalizeKey(quiz.topic) === topicKey)?.topic.trim() || topicKey
      : null
    const subject = findSubject(data.subjects, subjectName)
    add({
      id: `revision:quiz:${subjectKey}:${topicKey}`,
      type: 'revision',
      title: topicName ? `Revise ${topicName}` : `Revise ${subjectName}`,
      subjectId: subject?.id || null,
      subjectName: subject?.name || subjectName,
      topic: topicName,
      taskId: null,
      durationMinutes: settings.preferredSessionMinutes,
      deadline: null,
      prerequisiteStatus: 'not-represented',
      reasons: ['This recorded area has not been revisited recently.'],
      evidence: [`Last quiz evidence: ${new Date(result.lastAt).toLocaleDateString()}.`],
    })
  })

  const activePlan = data.studyPlans
    .filter((plan) => plan.approved && Array.isArray(plan.plan_json?.schedule))
    .sort((a, b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime())[0]
  if (activePlan) {
    const today = dateOnly(now)
    const weekday = now.toLocaleDateString(undefined, { weekday: 'long' }).toLowerCase()
    const blocks = activePlan.plan_json.schedule.filter((block) => {
      const day = normalizeKey(block.day)
      return day === today || day === weekday
    })
    blocks.forEach((block) => {
      const subject = findSubject(data.subjects, block.subject)
      add({
        id: `plan:${activePlan.id}:${block.id}`,
        type: 'plan',
        title: cleanText(block.taskTitle) || `Study ${cleanText(block.subject) || 'scheduled subject'}`,
        subjectId: subject?.id || null,
        subjectName: subject?.name || cleanText(block.subject) || null,
        topic: null,
        taskId: null,
        durationMinutes: Math.max(AUTOPILOT_DEFAULTS.minimumActionMinutes, Math.round(block.durationMinutes || settings.preferredSessionMinutes)),
        deadline: null,
        prerequisiteStatus: 'not-represented',
        reasons: ['This block is scheduled in your approved study plan for today.'],
        evidence: [`Plan generated ${new Date(activePlan.generated_at).toLocaleDateString()}.`],
      })
    })
  }

  const subjectActivity = new Set(
    data.studySessions.filter((session) => (session.actual_duration_s || 0) > 0).map((session) => normalizeKey(session.subject?.name))
  )
  data.subjects.forEach((subject) => {
    const subjectKey = normalizeKey(subject.name)
    const hasCandidate = candidates.some((candidate) => normalizeKey(candidate.subjectName) === subjectKey)
    if (hasCandidate) return
    const hasHistory = subjectActivity.has(subjectKey)
    add({
      id: `progression:${subject.id}`,
      type: 'progression',
      title: hasHistory ? `Continue ${subject.name}` : `Begin ${subject.name}`,
      subjectId: subject.id,
      subjectName: subject.name,
      topic: null,
      taskId: null,
      durationMinutes: settings.preferredSessionMinutes,
      deadline: null,
      prerequisiteStatus: 'not-represented',
      reasons: [hasHistory ? 'You have previous study evidence for this subject.' : 'This is one of your saved subjects; no performance history is available yet.'],
      evidence: hasHistory ? ['A completed study session is recorded for this subject.'] : ['No quiz score or completed study session is recorded yet.'],
    })
  })

  // Remove a generic revision if it duplicates a weak-topic recommendation for the same evidence.
  return candidates.filter((candidate) => {
    if (candidate.type !== 'revision') return true
    return !candidates.some((other) => other.type === 'weak-topic' && other.subjectName === candidate.subjectName && other.topic === candidate.topic && revisionKeys.has(`${normalizeKey(candidate.subjectName)}::${normalizeKey(candidate.topic)}`) && daysBetween(new Date((performance.get(`${normalizeKey(candidate.subjectName)}::${normalizeKey(candidate.topic)}`)?.lastAt || now.toISOString())), now) < 7)
  })
}

export function buildLearningAutopilot(
  data: AutopilotData,
  settings: Partial<AutopilotSettings> = {},
  profile: RankingProfile = { ready: false },
): RecommendationResult {
  const resolved: AutopilotSettings = {
    availableMinutes: Math.max(1, Math.round(settings.availableMinutes || AUTOPILOT_DEFAULTS.availableMinutes)),
    preferredSessionMinutes: Math.max(AUTOPILOT_DEFAULTS.minimumActionMinutes, Math.round(settings.preferredSessionMinutes || AUTOPILOT_DEFAULTS.preferredSessionMinutes)),
    applyManually: settings.applyManually !== false,
  }
  const now = data.now || new Date()
  const rawActions = createCandidates(data, resolved, now)
  const actions = rawActions.map((candidate) => rankCandidate(candidate, profile)).sort(compareActions)
  const sequence: StudySequenceItem[] = []
  let remainingMinutes = resolved.availableMinutes
  const usedIds = new Set<string>()

  for (const action of actions) {
    if (usedIds.has(action.id)) continue
    if (action.durationMinutes <= remainingMinutes) {
      sequence.push({
        ...action,
        order: sequence.length + 1,
        overBudget: false,
        sequenceReason: sequence.length === 0 ? 'Highest ranked eligible action.' : 'Fits after the higher-ranked action within today’s available time.',
      })
      remainingMinutes -= action.durationMinutes
      usedIds.add(action.id)
    }
  }

  if (sequence.length === 0 && actions.length > 0) {
    const shortest = actions.slice().sort((a, b) => a.durationMinutes - b.durationMinutes || compareActions(a, b))[0]
    sequence.push({
      ...shortest,
      order: 1,
      overBudget: true,
      sequenceReason: `This is the shortest eligible action, but it exceeds the ${resolved.availableMinutes}-minute budget.`,
    })
  }

  const weakAreas = new Set(actions.filter((action) => action.type === 'weak-topic').map((action) => `${action.subjectName}:${action.topic}`))
  const revisionOpportunities = new Set(actions.filter((action) => action.type === 'revision').map((action) => action.id))
  const personalizationReady = profile.ready
  return {
    calculatedAt: now.toISOString(),
    mode: personalizationReady ? 'personalized' : 'baseline',
    actions,
    sequence,
    nextAction: actions[0] || null,
    progress: {
      pendingTasks: data.tasks.filter((task) => task.status !== 'done').length,
      revisionOpportunities: revisionOpportunities.size,
      demonstratedWeakAreas: weakAreas.size,
      studySessions: data.studySessions.filter((session) => (session.actual_duration_s || 0) > 0).length,
      quizAttempts: data.quizSessions.filter(validQuiz).length,
    },
    personalization: {
      ready: personalizationReady,
      observationCount: profile.observationCount || 0,
      label: personalizationReady ? 'personalized' : 'baseline',
    },
    notes: [
      'Recommendations use only records available to this student.',
      'Prerequisites are not represented in the current database, so none are inferred.',
      ...(personalizationReady ? [] : ['Personalization is still developing; the deterministic baseline is active.']),
    ],
  }
}

export function actionFeatureExplanation(action: RecommendationAction): string[] {
  const explanations: string[] = []
  if (action.features.deadlineUrgency !== null && action.features.deadlineUrgency > 0) explanations.push(`Deadline urgency is ${Math.round(action.features.deadlineUrgency * 100)}%.`)
  if (action.features.topicWeakness !== null) explanations.push(`Recorded performance indicates ${Math.round(action.features.topicWeakness * 100)}% room for improvement.`)
  if (action.features.revisionNeed !== null) explanations.push('The last relevant learning evidence is old enough to justify revision.')
  if (action.features.studyPlanRelevance !== null) explanations.push('It is present in an approved study plan for today.')
  if (action.features.availableTimeFit !== null && action.features.availableTimeFit < 1) explanations.push('The suggested duration is longer than the remaining available time.')
  return [...action.reasons, ...explanations]
}

