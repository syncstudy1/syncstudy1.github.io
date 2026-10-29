import type { AutopilotFeedbackEvent, AutopilotFeedbackType, AutopilotFeatures, AutopilotSettings } from './learningAutopilot'

const feedbackKey = (userId: string) => `syncstudy-autopilot-feedback:${userId}`
const settingsKey = (userId: string) => `syncstudy-autopilot-settings:${userId}`

export function loadAutopilotFeedback(userId: string): AutopilotFeedbackEvent[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(feedbackKey(userId)) || '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter(item => item && typeof item.candidateKey === 'string' && typeof item.eventType === 'string')
  } catch { return [] }
}

export function recordAutopilotFeedback(userId: string, eventType: AutopilotFeedbackType, candidateKey: string, features?: Partial<AutopilotFeatures>) {
  if (!candidateKey) return
  const current = loadAutopilotFeedback(userId)
  const duplicate = current.some(item => item.eventType === eventType && item.candidateKey === candidateKey && Date.now() - new Date(item.createdAt).getTime() < 60_000)
  if (duplicate) return
  const inheritedFeatures = features || [...current].reverse().find(item => item.candidateKey === candidateKey && item.eventType === 'accepted')?.features
  const next = [...current, { eventType, candidateKey, features: inheritedFeatures, createdAt: new Date().toISOString() }].slice(-200)
  try { localStorage.setItem(feedbackKey(userId), JSON.stringify(next)); window.dispatchEvent(new CustomEvent('syncstudy:autopilot-feedback')) } catch { }
}

export function loadAutopilotSettings(userId: string): AutopilotSettings {
  const fallback: AutopilotSettings = { dailyMinutes: 120, preferredSessionMinutes: 25, respectPlan: true, manualApply: true }
  try {
    const value = JSON.parse(localStorage.getItem(settingsKey(userId)) || 'null')
    if (!value) return fallback
    return { dailyMinutes: typeof value.dailyMinutes === 'number' && value.dailyMinutes > 0 ? Math.min(720, value.dailyMinutes) : null, preferredSessionMinutes: typeof value.preferredSessionMinutes === 'number' ? Math.min(180, Math.max(5, value.preferredSessionMinutes)) : fallback.preferredSessionMinutes, respectPlan: value.respectPlan !== false, manualApply: value.manualApply !== false }
  } catch { return fallback }
}

export function saveAutopilotSettings(userId: string, settings: AutopilotSettings) {
  try { localStorage.setItem(settingsKey(userId), JSON.stringify(settings)) } catch { }
}
