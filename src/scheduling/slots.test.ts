import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  bookSlot,
  cancelSlotBooking,
  EVENT_SLOTS,
  EVENT_TIMEZONE,
  getCandidateAvailableSlotIds,
  getCommonSlots,
  getSlotAvailabilityForCandidate,
  loadBookings,
  saveBookings,
  type StorageLike,
} from './slots.ts'

function createMemoryStorage(): StorageLike {
  const map = new Map<string, string>()
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value)
    },
  }
}

test('common slots use single event timezone and support empty intersection', () => {
  assert.equal(EVENT_TIMEZONE, 'Asia/Almaty')

  const validIds = new Set(EVENT_SLOTS.map((slot) => slot.id))
  for (const id of ['demo-001', 'demo-002', 'demo-003']) {
    const candidateSlots = getCandidateAvailableSlotIds(id)
    assert.ok(candidateSlots.length > 0)
    assert.ok(candidateSlots.every((slotId) => validIds.has(slotId)))
  }

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
  const candidateB = { id: 'demo-003', name: 'Сауле', role: 'Ментор' }
  const sharedSlots = ['14:00', '14:20']

  const first = bookSlot([], candidateA, '14:00', sharedSlots, sharedSlots)
  assert.equal(first.ok, true)
  assert.equal(first.bookings.length, 1)

  saveBookings(first.bookings, storage)
  const restored = loadBookings(storage)
  assert.equal(restored.length, 1)
  assert.equal(restored[0].slotId, '14:00')

  const duplicateSameCandidate = bookSlot(restored, candidateA, '14:00', sharedSlots, sharedSlots)
  assert.equal(duplicateSameCandidate.ok, false)
  assert.equal(duplicateSameCandidate.reason, 'slot_conflict')

  const duplicateOtherCandidate = bookSlot(restored, candidateB, '14:00', sharedSlots, sharedSlots)
  assert.equal(duplicateOtherCandidate.ok, false)
  assert.equal(duplicateOtherCandidate.reason, 'slot_conflict')

  const optionsA = getSlotAvailabilityForCandidate(candidateA.id, restored, sharedSlots, sharedSlots)
  assert.equal(optionsA.find((o) => o.slot.id === '14:00')?.status, 'booked_with_candidate')
  assert.equal(optionsA.find((o) => o.slot.id === '14:20')?.status, 'available')

  const optionsB = getSlotAvailabilityForCandidate(candidateB.id, restored, sharedSlots, sharedSlots)
  assert.equal(optionsB.find((o) => o.slot.id === '14:00')?.status, 'conflict')

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

test('loadBookings ignores corrupted storage payloads and rejects non-common slots', () => {
  const brokenStorage: StorageLike = {
    getItem: () => '{broken json',
    setItem: () => {},
  }
  assert.deepEqual(loadBookings(brokenStorage), [])

  const badSlot = bookSlot([], { id: 'demo-002', name: 'Данияр' }, '15:00', ['14:00'], ['15:00'])
  assert.equal(badSlot.ok, false)
  assert.equal(badSlot.reason, 'not_common_slot')
})
