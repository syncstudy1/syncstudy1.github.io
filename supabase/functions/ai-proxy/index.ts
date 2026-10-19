import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── Validation helpers ───────────────────────────────────────────────────────

const ALLOWED_DIFFICULTIES = ['easy', 'medium', 'hard']
const ALLOWED_QUESTION_COUNTS = [5, 10, 15]

function validateQuizData(data: Record<string, unknown>): {
  subject: string
  topic: string
  difficulty: string
  count: number
  notes: string
} {
  const subject = typeof data.subject === 'string' ? data.subject.trim() : ''
  const topic = typeof data.topic === 'string' ? data.topic.trim() : ''
  const difficulty = typeof data.difficulty === 'string' ? data.difficulty.toLowerCase().trim() : 'medium'
  const rawCount = typeof data.count === 'number' ? data.count : parseInt(String(data.count), 10)
  const notes = typeof data.notes === 'string' ? data.notes.slice(0, 4000).trim() : ''

  if (!subject) throw new Error('Subject is required.')
  if (subject.length > 200) throw new Error('Subject name is too long.')
  if (!topic) throw new Error('Topic is required.')
  if (topic.length > 300) throw new Error('Topic name is too long.')
  if (!ALLOWED_DIFFICULTIES.includes(difficulty)) {
    throw new Error(`Difficulty must be one of: ${ALLOWED_DIFFICULTIES.join(', ')}.`)
  }
  if (!ALLOWED_QUESTION_COUNTS.includes(rawCount)) {
    throw new Error(`Question count must be one of: ${ALLOWED_QUESTION_COUNTS.join(', ')}.`)
  }

  return { subject, topic, difficulty, count: rawCount, notes }
}

// ─── Prompt builders ──────────────────────────────────────────────────────────

function buildQuizSystemInstruction(): string {
  return `You are a rigorous academic examination question author specialising in Indian university and competitive exam syllabuses.

STRICT RULES — follow all of them without exception:
1. Generate questions EXCLUSIVELY about the exact subject and topic provided. Do not include questions from any other subject.
2. Every question must directly test knowledge of the specified topic. Generic study-skill, thermodynamics, or kinetic energy questions are FORBIDDEN unless the topic explicitly requests them.
3. Return ONLY a valid JSON array — no markdown fences, no explanation outside the JSON.
4. Each element must conform exactly to: {"id": <integer>, "question": <string>, "options": [<string>, <string>, <string>, <string>], "correctIndex": <0-3>, "explanation": <string>, "revisionTip": <string>}
5. correctIndex is the zero-based index into the options array of the ONE correct answer.
6. All four options must be distinct and plausible. Do not repeat options within a question.
7. Questions must be distinct from each other — do not repeat a concept with only minor wording changes.
8. The explanation must reference why the correct option is right and why at least one wrong option is incorrect.
9. The revisionTip must suggest a specific study action relevant to the topic.
10. Difficulty definitions:
    - easy: recall, definition, identification of fundamental facts
    - medium: application, multi-step reasoning, comparison of related concepts
    - hard: analysis, synthesis, tricky edge cases, complex problem-solving
11. If the topic is narrow, generate distinct questions testing different sub-concepts within that topic.
12. Do not fabricate facts, invent citations, or use placeholder text.`
}

function buildQuizUserPrompt(
  subject: string,
  topic: string,
  difficulty: string,
  count: number,
  notes: string,
): string {
  const difficultyGuidance: Record<string, string> = {
    easy: 'straightforward recall, basic definition identification, and simple recognition questions',
    medium: 'application questions, multi-step reasoning, and comparison of closely related concepts',
    hard: 'complex analysis, edge-case reasoning, algorithm tracing, proof-based, or multi-concept synthesis questions',
  }

  let prompt =
    `Generate exactly ${count} multiple-choice questions.\n` +
    `Subject: ${subject}\n` +
    `Topic / Chapter: ${topic}\n` +
    `Difficulty: ${difficulty} (${difficultyGuidance[difficulty] || difficulty})\n\n` +
    `Every single question MUST be directly about "${topic}" in "${subject}". ` +
    `Do not generate questions about any other subject or unrelated area.\n\n` +
    `Return a JSON array of exactly ${count} question objects. No other text.`

  if (notes) {
    prompt +=
      `\n\nAdditional context / course material provided by the student (prioritise questions grounded in this material):\n"""\n${notes}\n"""`
  }

  return prompt
}

// ─── Response validator ───────────────────────────────────────────────────────

interface RawQuestion {
  id?: unknown
  question?: unknown
  options?: unknown
  correctIndex?: unknown
  explanation?: unknown
  revisionTip?: unknown
}

function coerceCorrectIndex(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value.trim()) : NaN
  if (!Number.isInteger(n) || n < 0 || n > 3) return null
  return n
}

function extractCandidateText(geminiResult: {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string; thought?: boolean }> } }>
}): string {
  const parts = geminiResult.candidates?.[0]?.content?.parts ?? []
  return parts
    .filter((p) => !p.thought && typeof p.text === 'string')
    .map((p) => p.text as string)
    .join('\n')
    .trim()
}

function parseGeminiJson(rawContent: string): unknown {
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
    if (start < 0) throw new Error('Gemini response did not contain JSON.')
    const closer = text[start] === '[' ? ']' : '}'
    const end = text.lastIndexOf(closer)
    if (end <= start) throw new Error('Gemini response did not contain JSON.')
    return JSON.parse(text.slice(start, end + 1))
  }
}

function unwrapQuizArray(parsed: unknown): unknown {
  if (Array.isArray(parsed)) return parsed
  if (parsed && typeof parsed === 'object') {
    const o = parsed as Record<string, unknown>
    for (const key of ['questions', 'quiz', 'items', 'data']) {
      if (Array.isArray(o[key])) return o[key]
    }
  }
  return parsed
}

function validateParsedQuizJson(parsed: unknown, expectedCount: number): void {
  if (!Array.isArray(parsed)) {
    throw new Error('Gemini response is not a JSON array.')
  }
  if (parsed.length < expectedCount) {
    throw new Error(`Gemini returned ${parsed.length} questions but ${expectedCount} were requested.`)
  }

  for (let i = 0; i < expectedCount; i++) {
    const q = parsed[i] as RawQuestion
    if (typeof q.question !== 'string' || q.question.trim() === '') {
      throw new Error(`Question ${i + 1} is missing question text.`)
    }
    if (!Array.isArray(q.options) || q.options.length < 4) {
      throw new Error(`Question ${i + 1} has fewer than 4 options.`)
    }
    if (q.options.some((opt) => typeof opt !== 'string' || opt.trim() === '')) {
      throw new Error(`Question ${i + 1} has an empty or non-string option.`)
    }
    if (coerceCorrectIndex(q.correctIndex) === null) {
      throw new Error(`Question ${i + 1} has invalid correctIndex: ${q.correctIndex}.`)
    }
    if (typeof q.explanation !== 'string' || q.explanation.trim() === '') {
      throw new Error(`Question ${i + 1} is missing an explanation.`)
    }
  }
}

// ─── Edge Function handler ────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ── Auth ────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY') ?? ''

    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY is not configured in Supabase Edge Function secrets.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const token = authHeader.replace('Bearer ', '')
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token)

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid or expired user session' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Parse body ──────────────────────────────────────────────────────────
    let body: { type?: string; data?: Record<string, unknown> }
    try {
      body = await req.json()
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON in request body.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { type, data } = body
    if (!type || typeof data !== 'object' || data === null) {
      return new Response(JSON.stringify({ error: 'Request body must include type and data fields.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Profile / tier check ────────────────────────────────────────────────
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('tier, premium_expires_at')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const isPremium =
      profile.tier === 'premium' &&
      (!profile.premium_expires_at || new Date(profile.premium_expires_at).getTime() > Date.now())

    // ── Type-specific access control ────────────────────────────────────────
    if (type === 'schedule') {
      if (!isPremium) {
        return new Response(
          JSON.stringify({ error: 'Premium subscription required for AI Study Planner.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
    }

    if (type === 'quiz') {
      if (!isPremium) {
        const startOfDay = new Date()
        startOfDay.setHours(0, 0, 0, 0)

        const { count, error: countError } = await supabase
          .from('quiz_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('taken_at', startOfDay.toISOString())

        if (!countError && (count ?? 0) >= 1) {
          return new Response(
            JSON.stringify({
              error:
                'Daily quiz limit reached. Free accounts get 1 quiz per day. Upgrade to Premium for unlimited quizzes.',
            }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          )
        }
      }
    }

    // ── Build prompts ───────────────────────────────────────────────────────
    let systemInstruction = ''
    let userPrompt = ''
    let quizMeta: { subject: string; topic: string; difficulty: string; count: number } | null = null

    if (type === 'schedule') {
      systemInstruction =
        'You are an expert academic curriculum and study timetable planner. Always respond with pure valid JSON only matching the schema: {"title": string, "summary": string, "dailyTargetHours": number, "schedule": [{"id": string, "day": string, "subject": string, "taskTitle": string, "durationMinutes": number, "timeSlot": string, "tips": string}]}'
      userPrompt = `Generate a realistic 7-day study plan with inputs: ${JSON.stringify(data)}`
    } else if (type === 'quiz') {
      // Validate and sanitise all quiz input fields
      let quizData: ReturnType<typeof validateQuizData>
      try {
        quizData = validateQuizData(data as Record<string, unknown>)
      } catch (validationError: unknown) {
        const msg = validationError instanceof Error ? validationError.message : 'Invalid quiz parameters.'
        return new Response(JSON.stringify({ error: msg }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      quizMeta = {
        subject: quizData.subject,
        topic: quizData.topic,
        difficulty: quizData.difficulty,
        count: quizData.count,
      }

      systemInstruction = buildQuizSystemInstruction()
      userPrompt = buildQuizUserPrompt(
        quizData.subject,
        quizData.topic,
        quizData.difficulty,
        quizData.count,
        quizData.notes,
      )
    } else {
      return new Response(JSON.stringify({ error: `Unknown type: ${type}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Official replacement for the shutdown gemini-2.0-flash model (retired 2026-06-01).
    const geminiModel = 'gemini-3.6-flash'
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`

    const maxAttempts = type === 'quiz' ? 2 : 1

    let lastError = ''
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const geminiResponse = await fetch(geminiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': geminiApiKey,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemInstruction }],
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: userPrompt }],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: type === 'quiz' ? 0.7 : 0.3,
            maxOutputTokens: type === 'quiz' ? 8192 : 4096,
          },
        }),
      })

      if (!geminiResponse.ok) {
        const errText = await geminiResponse.text()
        lastError = `Gemini API error (HTTP ${geminiResponse.status}): ${errText}`
        if (attempt < maxAttempts) continue
        return new Response(JSON.stringify({ error: lastError }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const geminiResult = await geminiResponse.json()
      const rawContent = extractCandidateText(geminiResult)

      if (!rawContent) {
        lastError = 'Empty response from Gemini'
        if (attempt < maxAttempts) continue
        return new Response(JSON.stringify({ error: lastError }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      let parsedJson: unknown
      try {
        parsedJson = parseGeminiJson(rawContent)
      } catch {
        lastError = `Gemini returned invalid JSON on attempt ${attempt}.`
        if (attempt < maxAttempts) continue
        return new Response(JSON.stringify({ error: lastError }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      if (type === 'quiz' && quizMeta) {
        try {
          parsedJson = unwrapQuizArray(parsedJson)
          validateParsedQuizJson(parsedJson, quizMeta.count)
          parsedJson = (parsedJson as RawQuestion[]).slice(0, quizMeta.count).map((q, i) => ({
            ...q,
            id: i + 1,
            correctIndex: coerceCorrectIndex(q.correctIndex),
          }))
        } catch (structErr: unknown) {
          const msg = structErr instanceof Error ? structErr.message : 'Invalid quiz structure.'
          lastError = `Quiz validation failed on attempt ${attempt}: ${msg}`
          if (attempt < maxAttempts) continue
          return new Response(JSON.stringify({ error: lastError }), {
            status: 502,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
      }

      return new Response(JSON.stringify(parsedJson), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Exhausted retries
    return new Response(
      JSON.stringify({ error: `Failed to generate valid content after ${maxAttempts} attempts. ${lastError}` }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
