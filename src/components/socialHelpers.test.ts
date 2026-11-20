import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  countActionableMeetings,
  countPendingIncomingIntros,
  diffSocialEvents,
  formatMeetingInterval,
} from './socialHelpers.ts'

describe('diffSocialEvents', () => {
  it('detects new incoming intros, accepted intros, and meeting state transitions', () => {
    const prevIntros = [
      { id: 'i-1', status: 'pending' as const, direction: 'outgoing' as const, participantName: 'Данияр' },
    ]
    const nextIntros = [
      { id: 'i-1', status: 'accepted' as const, direction: 'outgoing' as const, participantName: 'Данияр' },
      { id: 'i-2', status: 'pending' as const, direction: 'incoming' as const, participantName: 'Алия' },
    ]
    const prevMeetings = [
      { id: 'm-1', introductionId: 'i-1', status: 'pending' as const, direction: 'outgoing' as const, participantName: 'Данияр' },
    ]
    const nextMeetings = [
      { id: 'm-1', introductionId: 'i-1', status: 'confirmed' as const, direction: 'outgoing' as const, participantName: 'Данияр' },
      { id: 'm-2', introductionId: 'i-2', status: 'pending' as const, direction: 'incoming' as const, participantName: 'Алия' },
    ]

    const events = diffSocialEvents(prevIntros, nextIntros, prevMeetings, nextMeetings)
    assert.deepEqual(events.map(e => e.kind), [
      'intro_accepted',
      'new_incoming_intro',
      'meeting_confirmed',
      'new_meeting_invite',
    ])
    assert.equal(countPendingIncomingIntros(nextIntros), 1)
    assert.equal(countActionableMeetings(nextMeetings), 2)
  })
})

describe('formatMeetingInterval', () => {
  it('formats UTC ISO slots in the event timezone', () => {
    const formatted = formatMeetingInterval(
      '2027-02-01T09:00:00Z',
      '2027-02-01T09:20:00Z',
      'Asia/Almaty',
      'ru',
    )
    assert.match(formatted, /14:00–14:20 \(Asia\/Almaty\)/)
  })
})
