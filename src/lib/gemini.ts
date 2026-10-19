import { supabase, isSupabaseConfigured } from './supabase'
import type { StudyPlanJson } from '@/types/database'

export {
  coerceCorrectIndex,
  parseGeminiJson,
  unwrapQuizArray,
  validateQuizResponse,
} from './quizJson'

export interface CallGeminiPayload {
  type: 'schedule' | 'quiz'
  data: Record<string, unknown>
}

// ─── Mock study plan (demo / no-Supabase mode only) ─────────────────────────

function getMockStudyPlan(data: Record<string, unknown>): StudyPlanJson {
  const subjects = (data.subjects as string[]) || ['Mathematics', 'Physics', 'Chemistry']
  const dailyHours = (data.availableHours as number) || 4
  const startDateStr = (data.startDate as string) || new Date().toISOString().split('T')[0]

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const timeSlots = ['09:00 - 10:30', '11:00 - 12:30', '14:30 - 16:00', '16:30 - 17:30']

  const schedule = days.map((dayName, idx) => {
    const curDate = new Date(new Date(startDateStr).getTime() + idx * 86400000)
    const formattedDate = curDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
    const sub = subjects[idx % subjects.length] || 'General Study'

    return {
      id: `block-${idx + 1}`,
      day: `${dayName} (${formattedDate})`,
      subject: sub,
      taskTitle: `Core Module Mastery & Practice Problems in ${sub}`,
      durationMinutes: Math.round((dailyHours * 60) / 2),
      timeSlot: timeSlots[idx % timeSlots.length],
      tips: `Focus deeply on fundamentals. Use active recall and summarize key formulas without glancing at solutions.`,
    }
  })

  days.forEach((dayName, idx) => {
    const curDate = new Date(new Date(startDateStr).getTime() + idx * 86400000)
    const formattedDate = curDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
    const sub2 = subjects[(idx + 1) % subjects.length] || 'Revision'

    schedule.push({
      id: `block-rev-${idx + 1}`,
      day: `${dayName} (${formattedDate})`,
      subject: sub2,
      taskTitle: `Spaced Repetition & Flashcards: ${sub2}`,
      durationMinutes: Math.round((dailyHours * 60) / 2),
      timeSlot: '19:00 - 20:30',
      tips: `Solve 5 timer-bounded practice questions to cement retrieval paths.`,
    })
  })

  return {
    title: `Adaptive 7-Day Curriculum (${dailyHours}h/day)`,
    summary: `Tailored study regimen balanced across ${subjects.join(', ')}. Incorporates interleaving to avoid cognitive fatigue and spaced recall sessions prior to target deadlines.`,
    dailyTargetHours: dailyHours,
    schedule: schedule.sort((a, b) => a.day.localeCompare(b.day)),
  }
}

async function readFunctionsErrorMessage(error: unknown, data: unknown): Promise<string> {
  if (data && typeof data === 'object' && data !== null && 'error' in data) {
    const nested = (data as { error: unknown }).error
    if (typeof nested === 'string' && nested.trim()) return nested
  }

  const ctx = error && typeof error === 'object' ? (error as { context?: Response }).context : undefined
  if (ctx && typeof ctx.json === 'function') {
    try {
      const body = await ctx.json()
      if (body && typeof body === 'object' && typeof (body as { error?: unknown }).error === 'string') {
        return (body as { error: string }).error
      }
    } catch {
      // Body may already have been consumed; fall through to the generic message.
    }
  }

  if (error instanceof Error && error.message) return error.message
  return 'Failed to call AI study proxy.'
}

// ─── Main callGemini function ────────────────────────────────────────────────

/**
 * Calls the Supabase ai-proxy Edge Function to generate AI content.
 *
 * IMPORTANT: When Supabase IS configured, this function never falls back to
 * mock/hardcoded data for quiz generation.  If the Edge Function fails, the
 * error is propagated so the user sees a clear error and can retry.
 *
 * Mock fallback only occurs for the study-plan (schedule) type when Supabase
 * is NOT configured, i.e. in offline demo mode.
 */
export async function callGemini(payload: CallGeminiPayload): Promise<unknown> {
  // ── Offline / no-Supabase demo mode ────────────────────────────────────────
  if (!isSupabaseConfigured) {
    await new Promise((r) => setTimeout(r, 1200))

    if (payload.type === 'schedule') {
      return getMockStudyPlan(payload.data)
    }

    // For quiz in demo mode, tell the user Supabase must be configured
    if (payload.type === 'quiz') {
      throw new Error(
        'AI quiz generation requires a configured Supabase project with the GEMINI_API_KEY secret. ' +
        'Please set up your environment variables as described in the README.'
      )
    }

    throw new Error(`Unsupported AI payload type: ${payload.type}`)
  }

  // ── Live Supabase mode ─────────────────────────────────────────────────────
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 45000)

  try {
    const { data, error } = await supabase.functions.invoke('ai-proxy', {
      body: payload,
      signal: controller.signal,
    })

    if (error) {
      throw new Error(await readFunctionsErrorMessage(error, data))
    }

    if (data?.error) {
      throw new Error(data.error)
    }

    return data
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('AI request timed out after 45 seconds. The Gemini API may be under load — please try again.')
    }

    // Re-throw the original error without any mock/hardcoded fallback.
    // Silently replacing a real error with dummy physics questions is the root
    // cause of the "wrong subject" bug and must never happen in live mode.
    throw err
  } finally {
    clearTimeout(timeoutId)
  }
}
