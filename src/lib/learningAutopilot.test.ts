import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildAutopilotRecommendations, getEffectiveWeights, type AutopilotStudentState } from './learningAutopilot.ts'

const baseState = (overrides: Partial<AutopilotStudentState> = {}): AutopilotStudentState => ({ subjects: [{ id:'s1', user_id:'u1', name:'Mathematics', color:'#8b5cf6' }], tasks: [], sessions: [], quizzes: [], plans: [], feedback: [], settings: { dailyMinutes:120, preferredSessionMinutes:25, respectPlan:true, manualApply:true }, now: new Date('2026-10-30T12:00:00Z'), ...overrides })

test('ranks an overdue pending task above a neutral continuation', () => {
  const result = buildAutopilotRecommendations(baseState({ tasks:[{ id:'t1', user_id:'u1', subject_id:'s1', title:'Submit lab', description:null, deadline:'2026-10-29', status:'pending', estimated_hours:1 }] }))
  assert.equal(result.candidates[0]?.taskId, 't1')
  assert.equal(result.candidates[0]?.features.deadlineUrgency, 1)
})

test('uses actual weak quiz evidence and leaves missing quiz data unknown', () => {
  const result = buildAutopilotRecommendations(baseState({ quizzes:[{ id:'q1', user_id:'u1', subject:'Mathematics', topic:'Limits', difficulty:'medium', questions_json:[], score:2, total:5, taken_at:'2026-10-29T12:00:00Z' }] }))
  assert.equal(result.candidates[0]?.type, 'practice_topic')
  assert.equal(result.candidates[0]?.features.topicWeakness, .6)
  assert.equal(result.candidates[0]?.features.deadlineUrgency, 0)
})

test('respects available time and uses deterministic key tie breaking', () => {
  const result = buildAutopilotRecommendations(baseState({ settings:{ dailyMinutes:30, preferredSessionMinutes:25, respectPlan:true, manualApply:true }, tasks:[{ id:'b', user_id:'u1', subject_id:null, title:'B task', description:null, deadline:'2026-11-05', status:'pending', estimated_hours:1 },{ id:'a', user_id:'u1', subject_id:null, title:'A task', description:null, deadline:'2026-11-05', status:'pending', estimated_hours:1 }] }))
  assert.equal(result.sequence.length, 1)
  assert.equal(result.candidates[0]?.key, 'task:a')
})

test('does not personalize until sufficient outcome evidence exists and bounds updates', () => {
  const insufficient = getEffectiveWeights([])
  assert.equal(insufficient.ready, false)
  const feedback = Array.from({ length: 10 }, (_, index) => ({ eventType: index % 2 ? 'skipped' as const : 'completed' as const, candidateKey:`task:${index}`, features:{ deadlineUrgency:1, topicWeakness:0, revisionNeed:0, progression:1, planRelevance:0, timeFit:1, recentEvidence:0 }, createdAt:`2026-10-${String(index+1).padStart(2,'0')}T12:00:00Z` }))
  const learned = getEffectiveWeights(feedback)
  assert.equal(learned.ready, true)
  assert.ok(Object.values(learned.weights).every(weight => weight > 0 && weight < 1))
})
