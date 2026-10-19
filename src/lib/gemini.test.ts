import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  coerceCorrectIndex,
  parseGeminiJson,
  unwrapQuizArray,
  validateQuizResponse,
} from './quizJson.ts'

const sampleQuestion = (id: number, question = `What is concept ${id} of Operating Systems scheduling?`) => ({
  id,
  question,
  options: ['FCFS', 'SJF', 'Round Robin', 'Priority'],
  correctIndex: 0,
  explanation: 'FCFS serves requests in arrival order.',
  revisionTip: 'Draw a Gantt chart for FCFS vs SJF.',
})

test('parseGeminiJson strips markdown fences', () => {
  const parsed = parseGeminiJson('```json\n[{"ok":true}]\n```')
  assert.deepEqual(parsed, [{ ok: true }])
})

test('unwrapQuizArray accepts wrapped question objects', () => {
  const wrapped = { questions: [sampleQuestion(1)] }
  const unwrapped = unwrapQuizArray(wrapped)
  assert.equal(Array.isArray(unwrapped), true)
  assert.equal((unwrapped as unknown[]).length, 1)
})

test('coerceCorrectIndex accepts numeric strings', () => {
  assert.equal(coerceCorrectIndex('2'), 2)
  assert.equal(coerceCorrectIndex(3), 3)
  assert.equal(coerceCorrectIndex('9'), null)
})

test('validateQuizResponse accepts a valid array and trims to requested count', () => {
  const questions = [1, 2, 3, 4, 5, 6].map((id) => sampleQuestion(id, `Distinct operating systems question ${id} about CPU scheduling`))
  const result = validateQuizResponse(questions, 5, 'Operating Systems', 'CPU Scheduling')
  assert.equal(result.length, 5)
  assert.equal(result[0].correctIndex, 0)
})

test('validateQuizResponse unwraps { questions: [...] } payloads', () => {
  const questions = [1, 2, 3, 4, 5].map((id) =>
    sampleQuestion(id, `Distinct DBMS question ${id} about normalization`),
  )
  const result = validateQuizResponse(
    { questions },
    5,
    'Database Management Systems',
    'Normalization',
  )
  assert.equal(result.length, 5)
})

test('validateQuizResponse rejects duplicate options and too few questions', () => {
  assert.throws(
    () =>
      validateQuizResponse(
        [
          {
            ...sampleQuestion(1),
            options: ['A', 'A', 'B', 'C'],
          },
        ],
        5,
        'Physics',
        'Kinematics',
      ),
    /duplicate options/,
  )

  assert.throws(
    () => validateQuizResponse([sampleQuestion(1)], 5, 'Physics', 'Kinematics'),
    /1 valid questions but 5 were requested/,
  )
})

test('validateQuizResponse never invents hardcoded fallback questions', () => {
  assert.throws(
    () => validateQuizResponse({ error: 'Gemini API error (HTTP 404)' }, 5, 'Chemistry', 'Organic'),
    /unexpected response structure/,
  )
})
