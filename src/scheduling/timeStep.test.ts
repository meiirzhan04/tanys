import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  QUARTER_HOUR_TIMES,
  fromLocalParts,
  isQuarterHourInstant,
  isQuarterHourTime,
  roundUpToQuarterHour,
  toLocalParts,
} from './timeStep.ts'

test('offers only :00, :15, :30 and :45 for every hour of the day', () => {
  assert.equal(QUARTER_HOUR_TIMES.length, 96)
  assert.equal(QUARTER_HOUR_TIMES[0], '00:00')
  assert.equal(QUARTER_HOUR_TIMES.at(-1), '23:45')
  assert.ok(QUARTER_HOUR_TIMES.every(time => /:(00|15|30|45)$/.test(time)))
})

test('accepts 09:15 and rejects 09:46 or malformed values', () => {
  assert.equal(isQuarterHourTime('09:15'), true)
  assert.equal(isQuarterHourTime('09:46'), false)
  assert.equal(isQuarterHourTime('9:15'), false)
  assert.equal(isQuarterHourInstant('2026-11-21T04:15:00.000Z'), true)
  assert.equal(isQuarterHourInstant('2026-11-21T04:46:00.000Z'), false)
  assert.equal(isQuarterHourInstant('2026-11-21T04:15:30.000Z'), false)
  assert.equal(isQuarterHourInstant('not a date'), false)
})

test('rounds a default start up to the next quarter hour and keeps aligned instants', () => {
  assert.equal(roundUpToQuarterHour(new Date('2026-11-21T04:46:10Z')).toISOString(), '2026-11-21T05:00:00.000Z')
  assert.equal(roundUpToQuarterHour(new Date('2026-11-21T04:45:00Z')).toISOString(), '2026-11-21T04:45:00.000Z')
})

test('round-trips local date and time parts without rounding legacy minutes', () => {
  const parts = toLocalParts(fromLocalParts('2026-11-21', '09:46'))
  assert.deepEqual(parts, { date: '2026-11-21', time: '09:46' })
  assert.deepEqual(toLocalParts(undefined), { date: '', time: '' })
  assert.ok(Number.isNaN(+fromLocalParts('2026-11-21', '')))
})
