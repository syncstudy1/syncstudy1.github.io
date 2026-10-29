import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  buildStudyCalendarDays,
  getLocalDateKeyForCalendar,
  shiftCalendarMonth,
} from './studyCalendar.ts'

test('builds a Monday-first calendar with adjacent dates', () => {
  const days = buildStudyCalendarDays(new Date(2026, 9, 1, 12))
  assert.equal(days[0].date, '2026-09-28')
  assert.equal(days[0].isCurrentMonth, false)
  assert.equal(days.find((day) => day.date === '2026-10-01')?.isCurrentMonth, true)
  assert.equal(days.at(-1)?.date, '2026-11-01')
})

test('handles leap-year February correctly', () => {
  const leapYear = buildStudyCalendarDays(new Date(2028, 1, 1, 12))
  const nonLeapYear = buildStudyCalendarDays(new Date(2027, 1, 1, 12))
  assert.equal(leapYear.filter((day) => day.isCurrentMonth).length, 29)
  assert.equal(nonLeapYear.filter((day) => day.isCurrentMonth).length, 28)
})

test('shifts months without changing the local-date convention', () => {
  const next = shiftCalendarMonth(new Date(2026, 11, 15, 12), 1)
  assert.equal(getLocalDateKeyForCalendar(next), '2027-01-01')
  assert.equal(shiftCalendarMonth(next, -1).getMonth(), 11)
})

