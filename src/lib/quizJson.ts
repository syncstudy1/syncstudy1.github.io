import type { QuizQuestion } from '../types/database'

export function coerceCorrectIndex(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value.trim()) : NaN
  if (!Number.isInteger(n) || n < 0 || n > 3) return null
  return n
}

export function parseGeminiJson(rawContent: string): unknown {
  let text = rawContent.trim()
  const fence = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  if (fence) text = fence[1].trim()

  try {
    return JSON.parse(text)
  } catch {
    const arrStart = text.indexOf('[')
    const objStart = text.indexOf('{')
    const start =
      arrStart >= 0 && (objStart < 0 || arrStart < objStart)
        ? arrStart
        : objStart
    if (start < 0) throw new Error('The generated response was incomplete. Please try again.')
    const closer = text[start] === '[' ? ']' : '}'
    const end = text.lastIndexOf(closer)
    if (end <= start) throw new Error('The generated response was incomplete. Please try again.')
    return JSON.parse(text.slice(start, end + 1))
  }
}

export function unwrapQuizArray(parsed: unknown): unknown {
  if (typeof parsed === 'string') {
    parsed = parseGeminiJson(parsed)
  }
  if (Array.isArray(parsed)) return parsed
  if (parsed && typeof parsed === 'object') {
    const o = parsed as Record<string, unknown>
    for (const key of ['questions', 'quiz', 'items', 'data']) {
      if (Array.isArray(o[key])) return o[key]
    }
  }
  return parsed
}

/**
 * Validates the parsed JSON array returned by the quiz generation endpoint.
 * Throws a descriptive error if the structure is invalid so the caller
 * can surface a meaningful message instead of silently showing bad data.
 */
export function validateQuizResponse(
  raw: unknown,
  expectedCount: number,
  _subject: string,
  _topic: string,
): QuizQuestion[] {
  const unwrapped = unwrapQuizArray(raw)

  if (!Array.isArray(unwrapped)) {
    throw new Error('The generated response had an unexpected response structure. Please try again.')
  }

  const validated: QuizQuestion[] = []

  for (let i = 0; i < unwrapped.length; i++) {
    const q = unwrapped[i]

    if (typeof q !== 'object' || q === null) {
      throw new Error(`Question ${i + 1} is not a valid object.`)
    }

    const { question, options, correctIndex, explanation, revisionTip } = q as Record<string, unknown>

    if (typeof question !== 'string' || question.trim() === '') {
      throw new Error(`Question ${i + 1} is missing question text.`)
    }

    if (!Array.isArray(options) || options.length < 4) {
      throw new Error(`Question ${i + 1} has fewer than 4 options.`)
    }

    const opts = (options as unknown[]).map((o) => {
      if (typeof o !== 'string') throw new Error(`Question ${i + 1} contains a non-string option.`)
      return o
    })

    const uniqueOpts = new Set(opts.map((o) => o.trim().toLowerCase()))
    if (uniqueOpts.size < opts.length) {
      throw new Error(`Question ${i + 1} has duplicate options.`)
    }

    const coercedIndex = coerceCorrectIndex(correctIndex)
    if (coercedIndex === null) {
      throw new Error(`Question ${i + 1} has an invalid correctIndex (${correctIndex}). Must be 0–3.`)
    }

    if (typeof explanation !== 'string' || explanation.trim() === '') {
      throw new Error(`Question ${i + 1} is missing an explanation.`)
    }

    validated.push({
      id: i + 1,
      question: question.trim(),
      options: opts,
      correctIndex: coercedIndex,
      explanation: explanation.trim(),
      revisionTip: typeof revisionTip === 'string' ? revisionTip.trim() : undefined,
    })
  }

  const seen = new Set<string>()
  const deduplicated = validated.filter((q) => {
    const key = q.question.slice(0, 60).toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  if (deduplicated.length < expectedCount) {
    throw new Error(
      `${deduplicated.length} valid questions but ${expectedCount} were requested. Please try again.`,
    )
  }

  return deduplicated.slice(0, expectedCount)
}
