import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  ApiError,
  createTanysApiClient,
  isInviteExpiredError,
  isNetworkError,
  isSlotConflictError,
} from './client.ts'
import {
  isAccountRoute,
  loadAccountModePreference,
  loadPendingInvite,
  parseInviteLocation,
  saveAccountModePreference,
  savePendingInvite,
} from './inviteRoute.ts'

describe('parseInviteLocation & pending invite storage', () => {
  it('parses /invite/:eventId/:token, /events/:eventId?invite=..., and query params', () => {
    assert.deepEqual(parseInviteLocation('/invite/evt-1/tok-abc', ''), {
      eventId: 'evt-1',
      token: 'tok-abc',
    })
    assert.deepEqual(parseInviteLocation('/events/evt-2', '?invite=tok-xyz'), {
      eventId: 'evt-2',
      token: 'tok-xyz',
    })
    assert.deepEqual(parseInviteLocation('/', '?event=evt-3&token=tok-999'), {
      eventId: 'evt-3',
      token: 'tok-999',
    })
    assert.equal(parseInviteLocation('/', ''), null)
    assert.equal(isAccountRoute('/', ''), false)
    assert.equal(isAccountRoute('/', '?mode=account'), true)
    assert.equal(isAccountRoute('/invite/evt-1/tok-1', ''), true)
  })

  it('persists and clears pending invite cleanly', () => {
    const map = new Map<string, string>()
    const storage = {
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, value: string) => { map.set(key, value) },
      removeItem: (key: string) => { map.delete(key) },
    }

    savePendingInvite({ eventId: 'evt-1', token: 'tok-1' }, storage)
    assert.deepEqual(loadPendingInvite(storage), { eventId: 'evt-1', token: 'tok-1' })

    savePendingInvite(null, storage)
    assert.equal(loadPendingInvite(storage), null)
  })

  it('persists account mode across page reloads and clears on exit to demo (#117)', () => {
    const map = new Map<string, string>()
    const storage = {
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, value: string) => { map.set(key, value) },
      removeItem: (key: string) => { map.delete(key) },
    }

    assert.equal(loadAccountModePreference(storage), false)
    assert.equal(isAccountRoute('/', '', storage), false)

    saveAccountModePreference(true, storage)
    assert.equal(loadAccountModePreference(storage), true)
    assert.equal(isAccountRoute('/', '', storage), true)
    assert.equal(isAccountRoute('/', '', null), false)

    saveAccountModePreference(false, storage)
    assert.equal(loadAccountModePreference(storage), false)
    assert.equal(isAccountRoute('/', '', storage), false)
  })
})

describe('createTanysApiClient', () => {
  it('sends contract-compliant auth, join, profile, and recommendation requests', async () => {
    const calls: Array<{ url: string; method: string; body?: string; credentials?: RequestCredentials }> = []
    const mockFetch: typeof fetch = async (input, init) => {
      const url = String(input)
      const method = init?.method ?? 'GET'
      calls.push({ url, method, body: init?.body ? String(init.body) : undefined, credentials: init?.credentials })

      if (url.endsWith('/auth/challenges')) {
        return new Response(JSON.stringify({ challengeId: 'chg-1' }), { status: 202 })
      }
      if (url.endsWith('/auth/sessions')) {
        return new Response(JSON.stringify({ id: 'usr-1' }), { status: 200 })
      }
      if (url.endsWith('/events/evt-1/members/me') && method === 'PUT') {
        return new Response(JSON.stringify({ role: 'participant' }), { status: 200 })
      }
      if (url.endsWith('/events/evt-1/profile') && method === 'PUT') {
        return new Response(String(init?.body), { status: 200 })
      }
      if (url.includes('/events/evt-1/recommendations?locale=kk')) {
        return new Response(JSON.stringify({ items: [] }), { status: 200 })
      }
      return new Response(null, { status: 204 })
    }

    const api = createTanysApiClient('/api/v1', mockFetch)
    const challenge = await api.requestAuthChallenge('  user@example.org ', 'login')
    assert.equal(challenge.challengeId, 'chg-1')

    const user = await api.verifyAuthChallenge('chg-1', ' 123456 ')
    assert.equal(user.id, 'usr-1')

    const joined = await api.joinEvent('evt-1', 'tok-1')
    assert.equal(joined.role, 'participant')

    const saved = await api.saveEventProfile('evt-1', {
      name: 'Алия',
      role: 'Backend',
      skills: ['Go'],
      experienceYears: 2,
      interests: ['API'],
      about: 'Ищу команду',
      goal: 'find_job',
      visible: true,
      consentVersion: 'v1',
    })
    assert.equal(saved.visible, true)
    assert.equal(saved.consentVersion, 'v1')

    const recs = await api.getEventRecommendations('evt-1', 'kk')
    assert.deepEqual(recs, [])
    await api.logout()
    await api.deleteAccount({ confirm: true })

    assert.equal(calls.every(call => call.credentials === 'same-origin'), true)
    assert.equal(calls[0].url, '/api/v1/auth/challenges')
    assert.equal(calls[0].body, '{"email":"user@example.org","purpose":"login"}')
    assert.equal(calls[1].body, '{"challengeId":"chg-1","code":"123456"}')
    assert.equal(calls[2].url, '/api/v1/events/evt-1/members/me')
    assert.equal(calls[4].url, '/api/v1/events/evt-1/recommendations?locale=kk')
    const deleteMeCall = calls.find(call => call.url === '/api/v1/me' && call.method === 'DELETE')
    assert.ok(deleteMeCall)
    assert.equal(deleteMeCall?.body, '{"confirm":true}')
  })

  it('classifies 401, expired invites, and network failures accurately', async () => {
    const api401 = createTanysApiClient('/api/v1', async () =>
      new Response(JSON.stringify({ error: { code: 'unauthorized', message: 'Expired' } }), { status: 401 }),
    )
    assert.equal(await api401.getMe(), null)

    const api404 = createTanysApiClient('/api/v1', async () =>
      new Response(JSON.stringify({ error: { code: 'invite_expired', message: 'Expired invite' } }), { status: 404 }),
    )
    await assert.rejects(
      () => api404.joinEvent('evt-1', 'old-token'),
      error => isInviteExpiredError(error),
    )

    const apiNet = createTanysApiClient('/api/v1', async () => {
      throw new TypeError('Failed to fetch')
    })
    await assert.rejects(
      () => apiNet.listEvents(),
      error => error instanceof ApiError && isNetworkError(error),
    )

    const apiConflict = createTanysApiClient('/api/v1', async () =>
      new Response(JSON.stringify({ error: { code: 'slot_conflict', message: 'Слот занят' } }), { status: 409 }),
    )
    await assert.rejects(
      () => apiConflict.createMeeting('evt-1', 'i-1', 's-1'),
      error => isSlotConflictError(error),
    )
  })

  it('calls introduction, contact, slot, and meeting endpoints per service-v1 contract', async () => {
    const seen: string[] = []
    const api = createTanysApiClient('/api/v1', async (input, init) => {
      const url = String(input)
      const method = init?.method ?? 'GET'
      seen.push(`${method} ${url}`)
      if (url.endsWith('/introductions') && method === 'POST') {
        return new Response(JSON.stringify({ id: 'i-1', status: 'pending', direction: 'outgoing' }), { status: 201 })
      }
      if (url.endsWith('/introductions/i-1') && method === 'PATCH') {
        return new Response(JSON.stringify({ id: 'i-1', status: 'accepted', direction: 'incoming', contact: '@aliya' }), { status: 200 })
      }
      if (url.endsWith('/introductions/i-1/slots')) {
        return new Response(JSON.stringify({ items: [{ id: 's-1', start: '2027-02-01T09:00:00Z', end: '2027-02-01T09:20:00Z' }] }), { status: 200 })
      }
      if (url.endsWith('/meetings') && method === 'POST') {
        return new Response(JSON.stringify({ id: 'm-1', introductionId: 'i-1', status: 'pending' }), { status: 201 })
      }
      if (url.endsWith('/meetings/m-1') && method === 'PATCH') {
        return new Response(JSON.stringify({ id: 'm-1', introductionId: 'i-1', status: 'confirmed' }), { status: 200 })
      }
      return new Response(null, { status: 204 })
    })

    await api.saveContact('@aliya')
    const intro = await api.createIntroduction('evt-1', 'u-2')
    assert.equal(intro.status, 'pending')
    const accepted = await api.updateIntroduction('evt-1', 'i-1', 'accepted')
    assert.equal(accepted.contact, '@aliya')
    const slots = await api.listCommonSlots('evt-1', 'i-1')
    assert.equal(slots.length, 1)
    const meeting = await api.createMeeting('evt-1', 'i-1', 's-1')
    assert.equal(meeting.status, 'pending')
    const confirmed = await api.updateMeeting('evt-1', 'm-1', 'confirmed')
    assert.equal(confirmed.status, 'confirmed')

    assert.deepEqual(seen, [
      'PUT /api/v1/me/contact',
      'POST /api/v1/events/evt-1/introductions',
      'PATCH /api/v1/events/evt-1/introductions/i-1',
      'GET /api/v1/events/evt-1/introductions/i-1/slots',
      'POST /api/v1/events/evt-1/meetings',
      'PATCH /api/v1/events/evt-1/meetings/m-1',
    ])
  })

  it('calls organizer event, invite, member, interest, and booth endpoints', async () => {
    const seen: string[] = []
    const api = createTanysApiClient('/api/v1', async (input, init) => {
      const url = String(input)
      const method = init?.method ?? 'GET'
      seen.push(`${method} ${url}`)
      if (url.endsWith('/events') && method === 'POST') {
        return new Response(JSON.stringify({ id: 'e-1', name: 'IT Meetup', status: 'active' }), { status: 201 })
      }
      if (url.endsWith('/events/e-1/invites') && method === 'POST') {
        return new Response(JSON.stringify({ id: 'inv-1', token: 'tok-abc' }), { status: 201 })
      }
      if (url.endsWith('/events/e-1/members')) {
        return new Response(JSON.stringify({ items: [{ userId: 'u-1', role: 'organizer' }], nextCursor: null }), { status: 200 })
      }
      if (url.endsWith('/events/e-1/interests')) {
        return new Response(JSON.stringify({ topics: [{ name: 'API', count: 3 }], profileCount: 5 }), { status: 200 })
      }
      if (url.endsWith('/events/e-1/booths') && method === 'POST') {
        return new Response(JSON.stringify({ id: 'b-1', name: 'Go Hub', topics: ['Go'], published: true }), { status: 201 })
      }
      if (url.endsWith('/events/e-1/booths/b-1') && method === 'PATCH') {
        return new Response(JSON.stringify({ id: 'b-1', name: 'Go Hub', topics: ['Go'], published: false }), { status: 200 })
      }
      if (url.endsWith('/events/e-1/booths')) {
        return new Response(JSON.stringify({ items: [{ id: 'b-1', name: 'Go Hub', topics: ['Go'], published: false }] }), { status: 200 })
      }
      return new Response(null, { status: 204 })
    })

    const created = await api.createEvent({
      name: 'IT Meetup',
      timeZone: 'Asia/Almaty',
      startsAt: '2027-02-01T05:00:00Z',
      endsAt: '2027-02-01T12:00:00Z',
    })
    assert.equal(created.id, 'e-1')
    const inv = await api.createInvite('e-1', '2027-02-01T12:00:00Z')
    assert.equal(inv.token, 'tok-abc')
    await api.revokeInvite('e-1', 'inv-1')
    assert.equal((await api.listEventMembers('e-1')).length, 1)
    assert.equal((await api.getEventInterests('e-1')).topics[0].name, 'API')
    const booth = await api.createEventBooth('e-1', { name: 'Go Hub', topics: ['Go'], published: true })
    assert.equal(booth.id, 'b-1')
    const unpublished = await api.updateEventBooth('e-1', 'b-1', { published: false })
    assert.equal(unpublished.published, false)
    assert.equal((await api.listEventBooths('e-1')).length, 1)

    assert.deepEqual(seen, [
      'POST /api/v1/events',
      'POST /api/v1/events/e-1/invites',
      'DELETE /api/v1/events/e-1/invites/inv-1',
      'GET /api/v1/events/e-1/members',
      'GET /api/v1/events/e-1/interests',
      'POST /api/v1/events/e-1/booths',
      'PATCH /api/v1/events/e-1/booths/b-1',
      'GET /api/v1/events/e-1/booths',
    ])
  })

  it('calls block, report, moderation queue, and resolve endpoints', async () => {
    const seen: string[] = []
    const api = createTanysApiClient('/api/v1', async (input, init) => {
      const url = String(input)
      const method = init?.method ?? 'GET'
      seen.push(`${method} ${url}`)
      if (url.endsWith('/reports') && method === 'POST') {
        return new Response(JSON.stringify({ id: 'rep-1', status: 'open' }), { status: 201 })
      }
      if (url.endsWith('/reports') && method === 'GET') {
        return new Response(JSON.stringify({ items: [{ id: 'rep-1', subjectId: 'u-2', reason: 'spam', status: 'open' }] }), { status: 200 })
      }
      if (url.endsWith('/reports/rep-1') && method === 'PATCH') {
        return new Response(JSON.stringify({ id: 'rep-1', subjectId: 'u-2', reason: 'spam', status: 'resolved', action: 'restrict' }), { status: 200 })
      }
      return new Response(null, { status: 204 })
    })

    await api.blockParticipant('e-1', 'u-2')
    const submitted = await api.submitReport('e-1', { subjectId: 'u-2', reason: 'spam', details: 'Unwanted promo' })
    assert.equal(submitted.id, 'rep-1')
    const queue = await api.listEventReports('e-1')
    assert.equal(queue.length, 1)
    const resolved = await api.resolveEventReport('e-1', 'rep-1', 'restrict')
    assert.equal(resolved.action, 'restrict')

    assert.deepEqual(seen, [
      'PUT /api/v1/events/e-1/blocks/u-2',
      'POST /api/v1/events/e-1/reports',
      'GET /api/v1/events/e-1/reports',
      'PATCH /api/v1/events/e-1/reports/rep-1',
    ])
  })

  it('throws api_unavailable when server responds with HTML fallback instead of JSON', async () => {
    const htmlFetch: typeof fetch = async () =>
      new Response('<!doctype html><html></html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    const api = createTanysApiClient('/api/v1', htmlFetch)

    await assert.rejects(
      () => api.signInWithPassword('meiirzhan', 'secret12'),
      (error: unknown) => error instanceof ApiError && error.status === 503 && error.code === 'api_unavailable',
    )
    await assert.rejects(
      () => api.getMe(),
      (error: unknown) => error instanceof ApiError && error.status === 503 && error.code === 'api_unavailable',
    )
  })
})

describe('connections API contract', () => {
  it('searches participants by handle with a limit and sends the optional request message', async () => {
    const calls: Array<{ url: string; method: string; body?: string }> = []
    const api = createTanysApiClient('/api/v1', async (input, init) => {
      const url = String(input)
      calls.push({ url, method: init?.method ?? 'GET', body: init?.body as string | undefined })
      if (url.includes('/participants?')) {
        return new Response(JSON.stringify({ items: [{ userId: 'u-2', handle: 'parasat', name: 'Parasat', role: 'iOS', goal: 'find_job', introduction: null }], query: 'parasat', minLength: 2 }), { status: 200 })
      }
      if (url.endsWith('/members?limit=50&q=ali&goal=hire&visibility=visible')) {
        return new Response(JSON.stringify({ items: [{ userId: 'u-3', role: 'participant', handle: 'ali' }], nextCursor: 'u-3', total: 120 }), { status: 200 })
      }
      if (url.endsWith('/me/handle')) return new Response(JSON.stringify({ handle: 'parasat' }), { status: 200 })
      return new Response(JSON.stringify({ id: 'i-1', status: 'pending', direction: 'outgoing', message: 'Hi' }), { status: 201 })
    })
    const found = await api.searchParticipants('evt 1', '@Parasat')
    assert.equal(found.items[0].handle, 'parasat')
    assert.equal(calls[0].url, '/api/v1/events/evt%201/participants?q=%40Parasat&limit=8')
    await api.createIntroduction('evt-1', 'u-2', '  Hi  ')
    assert.deepEqual(JSON.parse(calls[1].body ?? '{}'), { recipientId: 'u-2', message: 'Hi' })
    await api.createIntroduction('evt-1', 'u-2', '   ')
    assert.deepEqual(JSON.parse(calls[2].body ?? '{}'), { recipientId: 'u-2' })
    const page = await api.pageEventMembers('evt-1', { q: ' ali ', goal: 'hire', visibility: 'visible' })
    assert.deepEqual([page.total, page.nextCursor, page.items.length], [120, 'u-3', 1])
    assert.deepEqual(await api.updateHandle('@Parasat'), { handle: 'parasat' })
  })
})
