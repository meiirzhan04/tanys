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

test('converts event wall-clock time in its own zone, whatever the device zone is', async () => {
  const { fromZonedParts, toZonedParts } = await import('./timeStep.ts')
  // Almaty is UTC+5: 09:00 there is 04:00 UTC.
  assert.equal(fromZonedParts('2026-11-22', '09:00', 'Asia/Almaty').toISOString(), '2026-11-22T04:00:00.000Z')
  assert.deepEqual(toZonedParts('2026-11-22T04:00:00.000Z', 'Asia/Almaty'), { date: '2026-11-22', time: '09:00' })
  // Half- and quarter-hour offsets.
  assert.equal(fromZonedParts('2026-11-22', '09:00', 'Asia/Kolkata').toISOString(), '2026-11-22T03:30:00.000Z')
  assert.equal(fromZonedParts('2026-11-22', '09:00', 'Asia/Kathmandu').toISOString(), '2026-11-22T03:15:00.000Z')
  // Daylight saving in Berlin: +2 in summer, +1 in winter, a skipped hour, and the date line around midnight.
  assert.equal(fromZonedParts('2026-07-01', '09:00', 'Europe/Berlin').toISOString(), '2026-07-01T07:00:00.000Z')
  assert.equal(fromZonedParts('2026-12-01', '09:00', 'Europe/Berlin').toISOString(), '2026-12-01T08:00:00.000Z')
  assert.equal(fromZonedParts('2026-03-29', '02:30', 'Europe/Berlin').toISOString(), '2026-03-29T01:30:00.000Z')
  assert.deepEqual(toZonedParts('2026-11-21T22:30:00.000Z', 'Asia/Almaty'), { date: '2026-11-22', time: '03:30' })
  for (const zone of ['Asia/Almaty', 'Europe/Berlin', 'America/New_York', 'UTC']) {
    const instant = fromZonedParts('2026-10-25', '13:45', zone)
    assert.deepEqual(toZonedParts(instant, zone), { date: '2026-10-25', time: '13:45' }, zone)
  }
  assert.ok(Number.isNaN(+fromZonedParts('2026-11-22', '', 'Asia/Almaty')))
})
