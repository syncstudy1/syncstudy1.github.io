import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildLearningAutopilot, type AutopilotData } from './learningAutopilot.ts'

const now = new Date('2026-10-30T12:00:00Z')
const subject = { id: 'subject-1', user_id: 'user-1', name: 'Physics', color: '#6366f1' }

const baseData = (overrides: Partial<AutopilotData> = {}): AutopilotData => ({
  subjects: [subject],
  tasks: [],
  studySessions: [],
  studyPlans: [],
  quizSessions: [],
  now,
  ...overrides,
})

test('ranks a task with an imminent deadline above a generic subject action', () => {
  const result = buildLearningAutopilot(baseData({
    tasks: [{
      id: 'task-1', user_id: 'user-1', subject_id: subject.id, title: 'Lab report', description: null,
      deadline: '2026-10-30', status: 'pending', estimated_hours: 1, subject,
    }],
  }))
  assert.equal(result.nextAction?.id, 'task:task-1')
  assert.equal(result.nextAction?.features.deadlineUrgency, 1)
})

test('ranks an evidenced weak quiz topic and does not treat an invalid score as zero', () => {
  const result = buildLearningAutopilot(baseData({
    quizSessions: [
      { id: 'quiz-1', user_id: 'user-1', subject: 'Physics', topic: 'Kinematics', difficulty: 'medium', questions_json: [], score: 2, total: 10, taken_at: '2026-10-29T12:00:00Z' },
      { id: 'quiz-invalid', user_id: 'user-1', subject: 'Physics', topic: 'Missing Score', difficulty: 'medium', questions_json: [], score: 0, total: 0, taken_at: '2026-10-29T12:00:00Z' },
    ],
  }))
  assert.equal(result.actions.some((action) => action.topic === 'Kinematics' && action.type === 'weak-topic'), true)
  assert.equal(result.actions.some((action) => action.topic === 'Missing Score'), false)
})

test('falls back to a subject-level recommendation when quiz topic detail is absent', () => {
  const result = buildLearningAutopilot(baseData({
    quizSessions: [{ id: 'quiz-subject', user_id: 'user-1', subject: 'Physics', topic: '', difficulty: 'medium', questions_json: [], score: 3, total: 10, taken_at: '2026-10-29T12:00:00Z' }],
  }))
  const action = result.actions.find((candidate) => candidate.type === 'weak-topic')
  assert.equal(action?.subjectName, 'Physics')
  assert.equal(action?.topic, null)
})

test('creates a revision opportunity from older real learning evidence', () => {
  const result = buildLearningAutopilot(baseData({
    quizSessions: [{ id: 'quiz-1', user_id: 'user-1', subject: 'Physics', topic: 'Optics', difficulty: 'medium', questions_json: [], score: 8, total: 10, taken_at: '2026-10-15T12:00:00Z' }],
  }))
  assert.equal(result.actions.some((action) => action.type === 'revision' && action.topic === 'Optics'), true)
})

test('does not recommend completed tasks and sequences only eligible actions within time', () => {
  const result = buildLearningAutopilot(baseData({
    tasks: [
      { id: 'done', user_id: 'user-1', subject_id: subject.id, title: 'Finished', description: null, deadline: '2026-10-30', status: 'done', estimated_hours: 1, subject },
      { id: 'open', user_id: 'user-1', subject_id: subject.id, title: 'Open', description: null, deadline: '2026-11-10', status: 'pending', estimated_hours: 0.5, subject },
    ],
  }), { availableMinutes: 30, preferredSessionMinutes: 25 })
  assert.equal(result.actions.some((action) => action.id === 'task:done'), false)
  assert.equal(result.sequence.reduce((sum, item) => sum + item.durationMinutes, 0) <= 30, true)
})

test('uses deterministic tie-breaking for identical inputs', () => {
  const first = buildLearningAutopilot(baseData())
  const second = buildLearningAutopilot(baseData())
  assert.deepEqual(first.actions.map((action) => action.id), second.actions.map((action) => action.id))
})

test('keeps prerequisites unavailable instead of inventing them', () => {
  const result = buildLearningAutopilot(baseData())
  assert.equal(result.actions.every((action) => action.prerequisiteStatus !== 'unmet'), true)
  assert.equal(result.notes.some((note) => note.includes('not represented')), true)
})

test('applies bounded personalization adjustments without changing the baseline contract', () => {
  const baseline = buildLearningAutopilot(baseData())
  const personalized = buildLearningAutopilot(baseData(), {}, {
    ready: true,
    observationCount: 6,
    adjustments: { progression: 1.15 },
  })
  assert.equal(personalized.mode, 'personalized')
  assert.equal(personalized.actions.length, baseline.actions.length)
  assert.equal(personalized.actions.every((action) => action.score >= 0 && action.score <= 1), true)
})

