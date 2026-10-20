import assert from 'node:assert/strict'
import { test } from 'node:test'
import { calculateStreakStats } from './activityStats.ts'

const day = (value: string) => new Date(`${value}T12:00:00`)

test('counts one qualifying activity day once', () => {
  assert.deepEqual(
    calculateStreakStats(['2026-10-20', '2026-10-20'], day('2026-10-20')),
    { recordDays: 1, currentStreak: 1, longestStreak: 1 },
  )
})

test('counts consecutive dates and preserves the longest streak', () => {
  assert.deepEqual(
    calculateStreakStats(
      ['2026-10-18', '2026-10-19', '2026-10-20'],
      day('2026-10-20'),
    ),
    { recordDays: 3, currentStreak: 3, longestStreak: 3 },
  )
})

test('resets current streak after a missed day while retaining history', () => {
  assert.deepEqual(
    calculateStreakStats(
      ['2026-10-16', '2026-10-17', '2026-10-20'],
      day('2026-10-20'),
    ),
    { recordDays: 3, currentStreak: 1, longestStreak: 2 },
  )
})

test('preserves yesterday streak during the current day', () => {
  assert.equal(
    calculateStreakStats(['2026-10-19'], day('2026-10-20')).currentStreak,
    1,
  )
})
