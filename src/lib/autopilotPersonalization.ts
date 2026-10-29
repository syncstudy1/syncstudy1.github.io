import type { AutopilotActionType, RankingProfile } from '@/lib/learningAutopilot'

const STORAGE_PREFIX = 'syncstudy:learning-autopilot:v1:'
const MAX_EVENTS = 100
const VALID_TYPES: AutopilotActionType[] = ['task', 'weak-topic', 'revision', 'plan', 'progression']

type FeedbackKind = 'accepted' | 'skipped' | 'session-completed'

interface FeedbackEvent {
  id: string
  kind: FeedbackKind
  actionId: string
  actionType: AutopilotActionType
  occurredAt: string
  actualMinutes?: number
}

interface PersonalizationState {
  version: 1
  events: FeedbackEvent[]
}

const emptyState = (): PersonalizationState => ({ version: 1, events: [] })

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`
}

function readState(userId: string): PersonalizationState {
  if (typeof window === 'undefined') return emptyState()
  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey(userId)) || '') as Partial<PersonalizationState>
    if (parsed.version !== 1 || !Array.isArray(parsed.events)) return emptyState()
    const events = parsed.events.filter((event): event is FeedbackEvent => (
      Boolean(event && typeof event.id === 'string' && typeof event.actionId === 'string' &&
        VALID_TYPES.includes(event.actionType) &&
        ['accepted', 'skipped', 'session-completed'].includes(event.kind) &&
        !Number.isNaN(new Date(event.occurredAt).getTime()))
    ))
    return { version: 1, events: events.slice(-MAX_EVENTS) }
  } catch {
    return emptyState()
  }
}

function saveState(userId: string, state: PersonalizationState) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(storageKey(userId), JSON.stringify({
    version: 1,
    events: state.events.slice(-MAX_EVENTS),
  }))
}

export function getAutopilotPersonalization(userId: string): RankingProfile & { observationCount: number; skippedActionIds: string[] } {
  const events = readState(userId).events
  const validEvents = events.filter((event) => event.kind !== 'skipped' || event.actionId.length > 0)
  const acceptedOrCompleted = validEvents.filter((event) => event.kind !== 'skipped').length
  const ready = validEvents.length >= 5 && acceptedOrCompleted >= 2
  const adjustments: Record<string, number> = {}

  VALID_TYPES.forEach((type) => {
    const typeEvents = validEvents.filter((event) => event.actionType === type)
    const positive = typeEvents.filter((event) => event.kind !== 'skipped').length
    const negative = typeEvents.filter((event) => event.kind === 'skipped').length
    // A small Laplace-smoothed preference estimate, bounded to avoid overfitting.
    const preference = (positive + 1) / (positive + negative + 2)
    adjustments[type] = 0.85 + preference * 0.30
  })

  const today = new Date().toISOString().slice(0, 10)
  const skippedActionIds = validEvents
    .filter((event) => event.kind === 'skipped' && event.occurredAt.slice(0, 10) === today)
    .map((event) => event.actionId)
  return { ready, adjustments, observationCount: validEvents.length, skippedActionIds }
}

export function recordAutopilotFeedback(
  userId: string,
  event: Omit<FeedbackEvent, 'occurredAt'> & { occurredAt?: string },
): boolean {
  if (!userId || !event.id || !event.actionId || !VALID_TYPES.includes(event.actionType)) return false
  if (!['accepted', 'skipped', 'session-completed'].includes(event.kind)) return false
  if (event.actualMinutes !== undefined && (!Number.isFinite(event.actualMinutes) || event.actualMinutes < 0 || event.actualMinutes > 24 * 60)) return false
  const state = readState(userId)
  if (state.events.some((existing) => existing.id === event.id)) return false
  state.events.push({
    ...event,
    occurredAt: event.occurredAt || new Date().toISOString(),
  })
  saveState(userId, state)
  return true
}

export function getAutopilotFeedbackEventId(actionId: string, kind: FeedbackKind, suffix = '') {
  return `${kind}:${actionId}:${suffix || new Date().toISOString().slice(0, 10)}`
}

