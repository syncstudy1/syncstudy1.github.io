import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildHeatmapWeeks, getHeatmapMonthLabel, type HeatmapDay } from './heatmap.ts'

const day = (date: string): HeatmapDay => ({ date, minutes: 0, count: 0 })

test('maps dates to Monday-Sunday rows without shifting Sunday left', () => {
  const weeks = buildHeatmapWeeks([
    day('2026-08-30'),
    day('2026-08-31'),
    day('2026-09-01'),
    day('2026-09-02'),
    day('2026-09-03'),
    day('2026-09-04'),
    day('2026-09-05'),
  ])

  assert.equal(weeks.length, 2)
  assert.equal(weeks[0][6]?.date, '2026-08-30')
  assert.equal(weeks[1][0]?.date, '2026-08-31')
  assert.equal(weeks[1][1]?.date, '2026-09-01')
  assert.equal(weeks[0][0], null)
})

test('labels only the first week and actual month-boundary week', () => {
  const weeks = buildHeatmapWeeks([
    day('2026-08-28'),
    day('2026-08-29'),
    day('2026-08-30'),
    day('2026-08-31'),
    day('2026-09-01'),
    day('2026-09-02'),
    day('2026-09-03'),
  ])

  assert.equal(getHeatmapMonthLabel(weeks[0], 0), 'Aug')
  assert.equal(
    getHeatmapMonthLabel(weeks[1], 1),
    new Date('2026-09-01T12:00:00').toLocaleDateString(undefined, { month: 'short' })
  )
})
