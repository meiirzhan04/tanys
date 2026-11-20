import assert from 'node:assert/strict'
import test from 'node:test'
import {
  bookSlot,
  cancelSlotBooking,
  EVENT_TIMEZONE,
  getCommonSlots,
  getSlotAvailabilityForCandidate,
  loadBookings,
  saveBookings,
} from '../src/scheduling/slots.ts'

function createMemoryStorage() {
  const map = new Map()
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, value),
  }
}

test('common slots use single event timezone and support empty intersection', () => {
  assert.equal(EVENT_TIMEZONE, 'Asia/Almaty')

  const common = getCommonSlots('demo-002', ['14:00', '14:20', '15:20'], ['14:20', '15:00', '15:20'])
  assert.deepEqual(
    common.map((s) => s.id),
    ['14:20', '15:20'],
  )

  const noOverlap = getCommonSlots('demo-no-overlap', ['14:00', '14:20'], ['15:00', '16:20'])
  assert.deepEqual(noOverlap, [])
})

test('booking blocks conflicting second meeting and cancelling frees the slot', () => {
  const storage = createMemoryStorage()
  const candidateA = { id: 'demo-002', name: 'Данияр', role: 'Тимлид' }
  const candidateB = { id: 'demo-003', name: 'Сауле', role: 'Mentor' }
  const sharedSlots = ['14:00', '14:20']

  const first = bookSlot([], candidateA, '14:00', sharedSlots, sharedSlots)
  assert.equal(first.ok, true)
  assert.equal(first.bookings.length, 1)

  saveBookings(first.bookings, storage)
  const restored = loadBookings(storage)
  assert.equal(restored.length, 1)
  assert.equal(restored[0].slotId, '14:00')

  // Same participant cannot occupy the booked slot a second time
  const duplicateSameCandidate = bookSlot(restored, candidateA, '14:00', sharedSlots, sharedSlots)
  assert.equal(duplicateSameCandidate.ok, false)
  assert.equal(duplicateSameCandidate.reason, 'slot_conflict')

  // Another participant also sees conflict on that occupied slot
  const duplicateOtherCandidate = bookSlot(restored, candidateB, '14:00', sharedSlots, sharedSlots)
  assert.equal(duplicateOtherCandidate.ok, false)
  assert.equal(duplicateOtherCandidate.reason, 'slot_conflict')

  const optionsA = getSlotAvailabilityForCandidate(candidateA.id, restored, sharedSlots, sharedSlots)
  assert.equal(optionsA.find((o) => o.slot.id === '14:00')?.status, 'booked_with_candidate')
  assert.equal(optionsA.find((o) => o.slot.id === '14:20')?.status, 'available')

  const optionsB = getSlotAvailabilityForCandidate(candidateB.id, restored, sharedSlots, sharedSlots)
  assert.equal(optionsB.find((o) => o.slot.id === '14:00')?.status, 'conflict')

  // Cancelling frees the slot for everyone again
  const afterCancel = cancelSlotBooking(restored, '14:00')
  assert.equal(afterCancel.length, 0)
  const optionsAfterCancel = getSlotAvailabilityForCandidate(
    candidateA.id,
    afterCancel,
    sharedSlots,
    sharedSlots,
  )
  assert.equal(optionsAfterCancel.find((o) => o.slot.id === '14:00')?.status, 'available')
})
