import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isSideLooking } from './faceDistraction.ts'

test('downward pitch alone is never a distraction', () => {
  assert.equal(isSideLooking({ yaw: 0, pitch: 45 }, 0, 25), false)
})

test('sideways yaw still triggers at the existing threshold', () => {
  assert.equal(isSideLooking({ yaw: 25, pitch: 0 }, 0, 25), true)
  assert.equal(isSideLooking({ yaw: 24, pitch: 0 }, 0, 25), false)
})

