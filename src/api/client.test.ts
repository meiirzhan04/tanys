import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  ApiError,
  createTanysApiClient,
  isInviteExpiredError,
  isNetworkError,
} from './client.ts'
import {
  isAccountRoute,
  loadPendingInvite,
  parseInviteLocation,
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

    assert.equal(calls.every(call => call.credentials === 'same-origin'), true)
    assert.equal(calls[0].url, '/api/v1/auth/challenges')
    assert.equal(calls[0].body, '{"email":"user@example.org","purpose":"login"}')
    assert.equal(calls[1].body, '{"challengeId":"chg-1","code":"123456"}')
    assert.equal(calls[2].url, '/api/v1/events/evt-1/members/me')
    assert.equal(calls[4].url, '/api/v1/events/evt-1/recommendations?locale=kk')
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
  })
})
