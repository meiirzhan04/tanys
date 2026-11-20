import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { createTanysApiClient } from '../api/client.ts'
import type { EventMemberItem } from '../api/client'
import { filterEventMembers } from './memberSearch.ts'

describe('organizer member search (#96)', () => {
  test('matches partial display names case-insensitively with trimmed spaces and Kazakh letters', () => {
    const members: EventMemberItem[] = [
      { userId: 'u-1', role: 'participant', name: 'Әйгерім Қайратқызы', visible: true },
      { userId: 'u-2', role: 'participant', name: 'Өмірзақ Ғалымжан', visible: true },
      { userId: 'u-3', role: 'participant', name: 'Іңкәр Ұланқызы', visible: true },
      { userId: 'u-4', role: 'participant', name: 'Нұрсұлтан Үсен', visible: true },
    ]

    assert.deepEqual(
      filterEventMembers(members, '  әйгерім  ').map(item => item.userId),
      ['u-1'],
    )
    assert.deepEqual(
      filterEventMembers(members, '  ҚАЙРАТ ').map(item => item.userId),
      ['u-1'],
    )
    assert.deepEqual(
      filterEventMembers(members, 'өмірзақ').map(item => item.userId),
      ['u-2'],
    )
    assert.deepEqual(
      filterEventMembers(members, 'іңкәр').map(item => item.userId),
      ['u-3'],
    )
    assert.deepEqual(
      filterEventMembers(members, 'үсен').map(item => item.userId),
      ['u-4'],
    )
  })

  test('keeps duplicate display names and returns empty list when no participant matches', () => {
    const members: EventMemberItem[] = [
      { userId: 'u-1', role: 'participant', name: 'Алия Н.', visible: true },
      { userId: 'u-2', role: 'participant', name: 'Алия Н.', visible: true },
      { userId: 'u-3', role: 'participant', name: 'Данияр', visible: true },
    ]

    assert.deepEqual(
      filterEventMembers(members, ' алия ').map(item => item.userId),
      ['u-1', 'u-2'],
    )
    assert.deepEqual(filterEventMembers(members, 'несуществующее имя'), [])
    assert.deepEqual(
      filterEventMembers(members, '   ').map(item => item.userId),
      ['u-1', 'u-2', 'u-3'],
    )
  })

  test('loads paginated page 2 members via nextCursor and isolates two events', async () => {
    const seenUrls: string[] = []
    const api = createTanysApiClient('/api/v1', async input => {
      const url = String(input)
      seenUrls.push(url)
      if (url === '/api/v1/events/evt-1/members') {
        return new Response(
          JSON.stringify({
            items: [{ userId: 'u-1', role: 'organizer', name: 'Айдос' }],
            nextCursor: 'u-1',
          }),
          { status: 200 },
        )
      }
      if (url === '/api/v1/events/evt-1/members?cursor=u-1') {
        return new Response(
          JSON.stringify({
            items: [
              { userId: 'u-2', role: 'participant', name: 'Қанат Серікұлы', visible: true },
              { userId: 'u-3', role: 'participant', name: 'Қанат Бекжан', visible: true },
            ],
            nextCursor: null,
          }),
          { status: 200 },
        )
      }
      if (url === '/api/v1/events/evt-2/members') {
        return new Response(
          JSON.stringify({
            items: [{ userId: 'u-9', role: 'participant', name: 'Жанель', visible: true }],
            nextCursor: null,
          }),
          { status: 200 },
        )
      }
      return new Response(null, { status: 404 })
    })

    const event1Members = await api.listEventMembers('evt-1')
    const event2Members = await api.listEventMembers('evt-2')

    assert.deepEqual(seenUrls, [
      '/api/v1/events/evt-1/members',
      '/api/v1/events/evt-1/members?cursor=u-1',
      '/api/v1/events/evt-2/members',
    ])
    assert.deepEqual(
      filterEventMembers(event1Members, 'қанат').map(item => item.userId),
      ['u-2', 'u-3'],
    )
    assert.deepEqual(filterEventMembers(event2Members, 'қанат'), [])
    assert.deepEqual(
      filterEventMembers(event2Members, 'жанель').map(item => item.userId),
      ['u-9'],
    )
  })
})
