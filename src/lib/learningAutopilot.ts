import type { StudyPlan, StudySession, Subject, Task, QuizSession } from '@/types/database'

export type AutopilotActionType = 'complete_task' | 'practice_topic' | 'revise_topic' | 'continue_subject'
export type AutopilotFeedbackType = 'generated' | 'accepted' | 'skipped' | 'completed'

export interface AutopilotSettings {
  dailyMinutes: number | null
  preferredSessionMinutes: number
  respectPlan: boolean
  manualApply: boolean
}

export interface AutopilotFeedbackEvent {
  eventType: AutopilotFeedbackType
  candidateKey: string
  features?: Partial<AutopilotFeatures>
  createdAt: string
}

export interface AutopilotStudentState {
  subjects: Subject[]
  tasks: Task[]
  sessions: StudySession[]
  quizzes: QuizSession[]
  plans: StudyPlan[]
  feedback: AutopilotFeedbackEvent[]
  settings: AutopilotSettings
  now?: Date
}

export interface AutopilotFeatures {
  deadlineUrgency: number
  topicWeakness: number
  revisionNeed: number
  progression: number
  planRelevance: number
  timeFit: number
  recentEvidence: number
}

export interface AutopilotCandidate {
  key: string
  type: AutopilotActionType
  title: string
  subjectId: string | null
  subjectName: string | null
  taskId: string | null
  topic: string | null
  durationMinutes: number
  features: AutopilotFeatures
  score: number
  reason: string
  evidence: string[]
}

export interface AutopilotResult {
  candidates: AutopilotCandidate[]
  sequence: AutopilotCandidate[]
  baselineWeights: Record<keyof AutopilotFeatures, number>
  effectiveWeights: Record<keyof AutopilotFeatures, number>
  personalization: { ready: boolean; evaluatedEvents: number; message: string }
  calculatedAt: string
}

export const BASELINE_WEIGHTS: Record<keyof AutopilotFeatures, number> = {
  deadlineUrgency: 0.25,
  topicWeakness: 0.20,
  revisionNeed: 0.15,
  progression: 0.15,
  planRelevance: 0.10,
  timeFit: 0.10,
  recentEvidence: 0.05,
}

const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value))
const dayDiff = (from: Date, to: Date) => (to.getTime() - from.getTime()) / 86400000
const dateValue = (value: string | null | undefined, fallback: Date) => value ? new Date(`${value}T12:00:00`) : fallback
const durationFor = (minutes: number, preferred: number) => Math.max(15, Math.min(120, minutes || preferred))

export function getEffectiveWeights(events: AutopilotFeedbackEvent[]): { weights: Record<keyof AutopilotFeatures, number>; evaluatedEvents: number; ready: boolean } {
  const evaluated = events.filter(event => event.eventType === 'completed' || event.eventType === 'skipped')
  const multipliers = { ...Object.fromEntries(Object.keys(BASELINE_WEIGHTS).map(key => [key, 1])) } as Record<keyof AutopilotFeatures, number>
  if (evaluated.length < 5) return { weights: { ...BASELINE_WEIGHTS }, evaluatedEvents: evaluated.length, ready: false }
  for (const event of evaluated) {
    const direction = event.eventType === 'completed' ? 0.018 : -0.009
    for (const key of Object.keys(BASELINE_WEIGHTS) as (keyof AutopilotFeatures)[]) {
      const feature = event.features?.[key]
      if (typeof feature === 'number') multipliers[key] = clamp(multipliers[key] + direction * feature, 0.75, 1.25)
    }
  }
  const raw = Object.fromEntries((Object.keys(BASELINE_WEIGHTS) as (keyof AutopilotFeatures)[]).map(key => [key, BASELINE_WEIGHTS[key] * multipliers[key]])) as Record<keyof AutopilotFeatures, number>
  const total = Object.values(raw).reduce((sum, value) => sum + value, 0)
  const weights = Object.fromEntries((Object.keys(raw) as (keyof AutopilotFeatures)[]).map(key => [key, raw[key] / total])) as Record<keyof AutopilotFeatures, number>
  return { weights, evaluatedEvents: evaluated.length, ready: true }
}

function scoreCandidate(features: AutopilotFeatures, weights: Record<keyof AutopilotFeatures, number>) {
  return Object.keys(weights).reduce((score, key) => score + features[key as keyof AutopilotFeatures] * weights[key as keyof AutopilotFeatures], 0)
}

export function buildAutopilotRecommendations(state: AutopilotStudentState): AutopilotResult {
  const now = state.now || new Date()
  const effective = getEffectiveWeights(state.feedback)
  const pendingTasks = state.tasks.filter(task => task.status !== 'done')
  const recentCutoff = new Date(now.getTime() - 3 * 86400000)
  const recentKeys = new Set(state.feedback.filter(event => event.createdAt >= recentCutoff.toISOString() && event.eventType === 'skipped').map(event => event.candidateKey))
  const candidates: AutopilotCandidate[] = []
  const latestSessionBySubject = new Map<string, StudySession>()
  for (const session of [...state.sessions].sort((a, b) => b.started_at.localeCompare(a.started_at))) if (session.subject_id && !latestSessionBySubject.has(session.subject_id)) latestSessionBySubject.set(session.subject_id, session)
  for (const task of pendingTasks) {
    const deadline = dateValue(task.deadline, now)
    const days = dayDiff(now, deadline)
    const urgency = days < 0 ? 1 : clamp((7 - days) / 7)
    const latest = task.subject_id ? latestSessionBySubject.get(task.subject_id) : undefined
    const recency = latest ? clamp(dayDiff(new Date(latest.started_at), now) / 14) : 0.4
    const duration = durationFor(Math.round(Number(task.estimated_hours || 1) * 60), state.settings.preferredSessionMinutes)
    const planRelevance = state.settings.respectPlan && state.plans.some(plan => plan.approved && plan.plan_json.schedule.some(block => (subject?.name && block.subject.toLowerCase() === subject.name.toLowerCase()) || block.taskTitle.toLowerCase().includes(task.title.toLowerCase()))) ? 1 : 0
    const features: AutopilotFeatures = { deadlineUrgency: urgency, topicWeakness: 0, revisionNeed: recency, progression: task.status === 'in_progress' ? 1 : 0.65, planRelevance, timeFit: state.settings.dailyMinutes === null ? 0.75 : clamp(state.settings.dailyMinutes / duration), recentEvidence: latest ? 0.35 : 0.15 }
    const subject = state.subjects.find(item => item.id === task.subject_id)
    const evidence = [days < 0 ? `This task is overdue by ${Math.ceil(Math.abs(days))} day(s).` : `Deadline is ${Math.max(0, Math.ceil(days))} day(s) away.`, task.status === 'in_progress' ? 'You already started this task.' : 'It is still pending.']
    const reason = days <= 1 ? 'It is due very soon and is still unfinished.' : task.status === 'in_progress' ? 'Continuing unfinished work keeps your current thread warm.' : 'It is a concrete piece of pending work with a known deadline.'
    candidates.push({ key:`task:${task.id}`, type:'complete_task', title:task.status === 'in_progress' ? `Continue ${task.title}` : `Complete ${task.title}`, subjectId:task.subject_id, subjectName:subject?.name || null, taskId:task.id, topic:null, durationMinutes:duration, features, score:scoreCandidate(features,effective.weights), reason, evidence })
  }

  for (const quiz of state.quizzes) {
    const percentage = quiz.total > 0 ? quiz.score / quiz.total : null
    if (percentage === null) continue
    const weakness = clamp(1 - percentage)
    const age = clamp(dayDiff(new Date(quiz.taken_at), now) / 14)
    const subject = state.subjects.find(item => item.name.toLowerCase() === quiz.subject.toLowerCase())
    const type: AutopilotActionType = percentage < 0.7 ? 'practice_topic' : 'revise_topic'
    const duration = durationFor(percentage < 0.7 ? 30 : 20, state.settings.preferredSessionMinutes)
    const planRelevance = state.settings.respectPlan && state.plans.some(plan => plan.approved && plan.plan_json.schedule.some(block => block.subject.toLowerCase() === quiz.subject.toLowerCase() || block.taskTitle.toLowerCase().includes(quiz.topic.toLowerCase()))) ? 1 : 0
    const features: AutopilotFeatures = { deadlineUrgency:0, topicWeakness:weakness, revisionNeed:age, progression:0.55, planRelevance, timeFit:state.settings.dailyMinutes===null?0.8:clamp(state.settings.dailyMinutes/duration), recentEvidence:clamp(1-age) }
    const label = percentage < 0.7 ? `Practice ${quiz.topic}` : `Revise ${quiz.topic}`
    candidates.push({ key:`quiz:${quiz.id}:${type}`, type, title:label, subjectId:subject?.id || null, subjectName:quiz.subject || subject?.name || null, taskId:null, topic:quiz.topic, durationMinutes:duration, features, score:scoreCandidate(features,effective.weights), reason:percentage < 0.7 ? `Your latest quiz score was ${Math.round(percentage*100)}%, so targeted practice is supported by evidence.` : `Your latest quiz score was ${Math.round(percentage*100)}%; a short spaced revision is due based on recency.`, evidence:[`Latest result: ${quiz.score}/${quiz.total}.`,`Attempted ${new Date(quiz.taken_at).toLocaleDateString()}.`] })
  }

  for (const subject of state.subjects) {
    if (candidates.some(candidate => candidate.subjectId === subject.id)) continue
    const latest = latestSessionBySubject.get(subject.id)
    if (!latest) continue
    const age = clamp(dayDiff(new Date(latest.started_at), now) / 14)
    const features: AutopilotFeatures = { deadlineUrgency:0, topicWeakness:0, revisionNeed:age, progression:0.45, planRelevance:0, timeFit:state.settings.dailyMinutes===null?0.8:clamp(state.settings.dailyMinutes/state.settings.preferredSessionMinutes), recentEvidence:clamp(1-age) }
    candidates.push({ key:`subject:${subject.id}`, type:'continue_subject', title:`Continue ${subject.name}`, subjectId:subject.id, subjectName:subject.name, taskId:null, topic:null, durationMinutes:state.settings.preferredSessionMinutes, features, score:scoreCandidate(features,effective.weights), reason:`You have existing study history in ${subject.name}, and it has not been selected by a more specific action.`, evidence:[`Last studied ${new Date(latest.started_at).toLocaleDateString()}.`] })
  }

  const ranked = candidates.filter(candidate => !recentKeys.has(candidate.key)).sort((a,b)=>b.score-a.score||a.key.localeCompare(b.key))
  const sequence: AutopilotCandidate[] = []
  let remaining = state.settings.dailyMinutes
  const usedSubjects = new Set<string>()
  for (const candidate of ranked) { if (sequence.length >= 6) break; if (candidate.subjectId && usedSubjects.has(candidate.subjectId) && ranked.length > 3) continue; if (remaining !== null && sequence.length > 0 && candidate.durationMinutes > remaining) continue; sequence.push(candidate); if (candidate.subjectId) usedSubjects.add(candidate.subjectId); if (remaining !== null) remaining -= candidate.durationMinutes }
  return { candidates: ranked, sequence, baselineWeights:{...BASELINE_WEIGHTS}, effectiveWeights:effective.weights, personalization:{ready:effective.ready,evaluatedEvents:effective.evaluatedEvents,message:effective.ready?'Personalized from your recommendation outcomes.':'Using transparent baseline rules while more outcome evidence accumulates.'}, calculatedAt:new Date().toISOString() }
}
