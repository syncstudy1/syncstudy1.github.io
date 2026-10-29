import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildAnalyticsPdf } from './analyticsPdf.ts'

test('builds a multi-page dashboard PDF with all analytics sections', async () => {
  const subject = { id: 'subject-1', user_id: 'user-1', name: 'Physics', color: '#6366f1' }
  const session = {
    id: 'session-1',
    user_id: 'user-1',
    subject_id: subject.id,
    started_at: '2026-10-30T10:00:00Z',
    ended_at: '2026-10-30T10:25:00Z',
    planned_duration_s: 1800,
    actual_duration_s: 1500,
    warning_count: 1,
    auto_paused: false,
    notes: 'Reviewed vectors',
    subject,
  }
  const dailyData = Array.from({ length: 14 }, (_, index) => ({
    date: `2026-10-${String(index + 17).padStart(2, '0')}`,
    dateLabel: `Oct ${index + 17}`,
    totalSeconds: index === 13 ? 1500 : 0,
    plannedSeconds: 1800,
    minutes: index === 13 ? 25 : 0,
    plannedMinutes: 30,
  }))

  const blob = buildAnalyticsPdf({
    date: '2026-10-30',
    selectedSessions: [session],
    selectedTasks: [],
    selectedQuizzes: [],
    activityCount: 1,
    activityTypes: ['study session'],
    streakDaysThroughDate: 2,
    sessions: [session],
    dailyData,
    weeklyData: Array.from({ length: 8 }, (_, index) => ({ week: `W-${index + 1}`, totalSeconds: 3600, hours: 1 })),
    quizScores: [{ date: 'Oct 30', score: 8, total: 10, percentage: 80, subject: 'Physics', difficulty: 'medium' }],
    warningStats: dailyData.map((point) => ({ date: point.dateLabel, warnings: point.date.endsWith('30') ? 1 : 0 })),
    bestDayThisWeek: { label: 'Friday', minutes: 25 },
  })
  const pdf = await blob.text()
  const readablePdf = pdf.replaceAll('\\', '')

  assert.equal(blob.type, 'application/pdf')
  assert.equal(pdf.startsWith('%PDF-1.4'), true)
  assert.equal((pdf.match(/\/Type \/Page /g) || []).length, 3)
  for (const section of [
    'TOTAL TIME (ALL TIME)',
    'SESSIONS COMPLETED',
    'AVG. SESSION LENGTH',
    'BEST DAY THIS WEEK',
    'Daily Focus Time',
    'Planned vs. Actual Study',
    'Weekly Study Hours Trend',
    'Quiz Score Performance',
    'Distraction Frequency & Posture Shifts',
    'Focus Sessions Record',
    'Reviewed vectors',
  ]) {
    assert.equal(readablePdf.includes(section), true, `missing PDF section: ${section}`)
  }
})

test('renders an explicit empty state when planned targets are unavailable', async () => {
  const blob = buildAnalyticsPdf({
    date: '2026-10-30',
    selectedSessions: [],
    selectedTasks: [],
    selectedQuizzes: [],
    activityCount: 0,
    activityTypes: [],
    streakDaysThroughDate: 0,
    sessions: [],
    dailyData: [],
    weeklyData: [],
    quizScores: [],
    warningStats: [],
    bestDayThisWeek: { label: 'None', minutes: 0 },
  })
  const readablePdf = (await blob.text()).replaceAll('\\', '')
  assert.equal(readablePdf.includes('Unavailable: no planned-study targets were recorded in this reporting window.'), true)
})

