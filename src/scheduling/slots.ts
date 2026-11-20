export const EVENT_TIMEZONE = 'Asia/Almaty'
export const EVENT_TIMEZONE_LABEL = 'Asia/Almaty (UTC+5)'
export const MEETINGS_STORAGE_KEY = 'tanys.meetings.v1'

export interface TimeSlot {
  id: string
  start: string
  end: string
  label: string
}

export interface MeetingBooking {
  slotId: string
  candidateId: string
  candidateName: string
  candidateRole?: string
  timezone: string
  bookedAt: string
}

export type SlotStatus = 'available' | 'booked_with_candidate' | 'conflict'

export interface SlotOption {
  slot: TimeSlot
  status: SlotStatus
  conflictBooking?: MeetingBooking
}

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export interface BookSlotResult {
  ok: boolean
  reason?: 'invalid_slot' | 'not_common_slot' | 'slot_conflict'
  bookings: MeetingBooking[]
}

export const EVENT_SLOTS: readonly TimeSlot[] = [
  { id: '14:00', start: '14:00', end: '14:20', label: '14:00–14:20' },
  { id: '14:20', start: '14:20', end: '14:40', label: '14:20–14:40' },
  { id: '14:40', start: '14:40', end: '15:00', label: '14:40–15:00' },
  { id: '15:00', start: '15:00', end: '15:20', label: '15:00–15:20' },
  { id: '15:20', start: '15:20', end: '15:40', label: '15:20–15:40' },
  { id: '15:40', start: '15:40', end: '16:00', label: '15:40–16:00' },
  { id: '16:00', start: '16:00', end: '16:20', label: '16:00–16:20' },
  { id: '16:20', start: '16:20', end: '16:40', label: '16:20–16:40' },
]

export const DEFAULT_USER_SLOT_IDS: readonly string[] = [
  '14:00',
  '14:20',
  '14:40',
  '15:20',
  '15:40',
  '16:00',
]

// Patterns 0..6 overlap with DEFAULT_USER_SLOT_IDS; pattern 7 intentionally has no overlap.
const CANDIDATE_SLOT_PATTERNS: readonly (readonly string[])[] = [
  ['14:00', '14:40', '15:20', '16:00'],
  ['14:00', '14:20', '15:40'],
  ['14:20', '14:40', '15:00', '16:00'],
  ['14:40', '15:20', '15:40'],
  ['14:00', '15:20', '16:00'],
  ['14:20', '15:40', '16:20'],
  ['14:00', '14:20', '14:40', '15:20'],
  ['15:00', '16:20'],
]

function hashId(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }
  return hash
}

/** Return synthetic availability slot IDs for a participant in the event timezone. */
export function getCandidateAvailableSlotIds(candidateId: string): string[] {
  const index = hashId(candidateId) % CANDIDATE_SLOT_PATTERNS.length
  return [...CANDIDATE_SLOT_PATTERNS[index]]
}

/** Compute intersecting time slots between the current user and a candidate. */
export function getCommonSlots(
  candidateId: string,
  userSlotIds: readonly string[] = DEFAULT_USER_SLOT_IDS,
  candidateSlotIds: readonly string[] = getCandidateAvailableSlotIds(candidateId),
): TimeSlot[] {
  const userSet = new Set(userSlotIds)
  const candidateSet = new Set(candidateSlotIds)
  return EVENT_SLOTS.filter((slot) => userSet.has(slot.id) && candidateSet.has(slot.id))
}

/** Annotate each common slot with whether it is free, booked here, or conflicted. */
export function getSlotAvailabilityForCandidate(
  candidateId: string,
  bookings: readonly MeetingBooking[],
  userSlotIds: readonly string[] = DEFAULT_USER_SLOT_IDS,
  candidateSlotIds?: readonly string[],
): SlotOption[] {
  const commonSlots = getCommonSlots(candidateId, userSlotIds, candidateSlotIds)
  const bySlotId = new Map(bookings.map((booking) => [booking.slotId, booking]))

  return commonSlots.map((slot) => {
    const existing = bySlotId.get(slot.id)
    if (!existing) {
      return { slot, status: 'available' }
    }
    if (existing.candidateId === candidateId) {
      return { slot, status: 'booked_with_candidate', conflictBooking: existing }
    }
    return { slot, status: 'conflict', conflictBooking: existing }
  })
}

/** Book a common free slot unless that time slot is already occupied. */
export function bookSlot(
  bookings: readonly MeetingBooking[],
  candidate: { id: string; name: string; role?: string },
  slotId: string,
  userSlotIds: readonly string[] = DEFAULT_USER_SLOT_IDS,
  candidateSlotIds?: readonly string[],
): BookSlotResult {
  const validSlot = EVENT_SLOTS.find((slot) => slot.id === slotId)
  if (!validSlot) {
    return { ok: false, reason: 'invalid_slot', bookings: [...bookings] }
  }

  const common = getCommonSlots(candidate.id, userSlotIds, candidateSlotIds)
  if (!common.some((slot) => slot.id === slotId)) {
    return { ok: false, reason: 'not_common_slot', bookings: [...bookings] }
  }

  if (bookings.some((booking) => booking.slotId === slotId)) {
    return { ok: false, reason: 'slot_conflict', bookings: [...bookings] }
  }

  const nextBooking: MeetingBooking = {
    slotId,
    candidateId: candidate.id,
    candidateName: candidate.name,
    candidateRole: candidate.role,
    timezone: EVENT_TIMEZONE,
    bookedAt: new Date().toISOString(),
  }

  const slotOrder = new Map(EVENT_SLOTS.map((slot, index) => [slot.id, index]))
  const next = [...bookings, nextBooking].sort(
    (a, b) => (slotOrder.get(a.slotId) ?? 0) - (slotOrder.get(b.slotId) ?? 0),
  )

  return { ok: true, bookings: next }
}

/** Cancel a booked meeting by slot ID and free the slot. */
export function cancelSlotBooking(
  bookings: readonly MeetingBooking[],
  slotId: string,
): MeetingBooking[] {
  return bookings.filter((booking) => booking.slotId !== slotId)
}

export function formatSlotLabel(slotId: string): string {
  return EVENT_SLOTS.find((slot) => slot.id === slotId)?.label ?? slotId
}

function getDefaultStorage(): StorageLike | null {
  if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) {
    return null
  }
  try {
    return globalThis.localStorage
  } catch {
    return null
  }
}

/** Load saved 1:1 bookings from localStorage safely. */
export function loadBookings(storage: StorageLike | null = getDefaultStorage()): MeetingBooking[] {
  if (!storage) return []
  try {
    const raw = storage.getItem(MEETINGS_STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    const validSlotIds = new Set(EVENT_SLOTS.map((slot) => slot.id))
    return parsed.filter((item): item is MeetingBooking => {
      if (!item || typeof item !== 'object') return false
      const record = item as Record<string, unknown>
      return (
        typeof record.slotId === 'string' &&
        validSlotIds.has(record.slotId) &&
        typeof record.candidateId === 'string' &&
        typeof record.candidateName === 'string'
      )
    })
  } catch {
    return []
  }
}

/** Persist 1:1 bookings to localStorage safely. */
export function saveBookings(
  bookings: readonly MeetingBooking[],
  storage: StorageLike | null = getDefaultStorage(),
): void {
  if (!storage) return
  try {
    storage.setItem(MEETINGS_STORAGE_KEY, JSON.stringify(bookings))
  } catch {
    // Ignore quota/storage errors in private browsing mode.
  }
}
