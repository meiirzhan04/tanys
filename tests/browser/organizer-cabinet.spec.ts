import { expect, test } from '@playwright/test'
import type { BrowserContext } from '@playwright/test'

interface MockEvent {
  id: string
  name: string
  timeZone: string
  startsAt: string
  endsAt: string
  status: 'active' | 'closed'
}

interface MockBooth {
  id: string
  eventId: string
  name: string
  description: string
  topics: string[]
  published: boolean
}

function createOrganizerBackend() {
  const events = new Map<string, MockEvent>()
  const memberships = new Map<string, Array<{ userId: string; role: 'organizer' | 'participant'; name?: string; profileRole?: string; goal?: string; visible?: boolean }>>()
  const invites = new Map<string, { id: string; eventId: string; token: string; revoked: boolean }>()
  const booths = new Map<string, MockBooth>()
  const interestsByEvent = new Map<string, { topics: Array<{ name: string; count: number }>; profileCount: number }>()
  const authByContext = new Map<BrowserContext, string | null>()
  let seq = 0

  async function attach(context: BrowserContext) {
    authByContext.set(context, null)
    await context.route('**/api/v1/**', async route => {
      const req = route.request()
      const path = new URL(req.url()).pathname.replace(/^\/api\/v1/, '')
      const method = req.method()
      const raw = req.postData()
      const body = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
      const respond = (status: number, data?: unknown) =>
        route.fulfill({ status, contentType: 'application/json', body: status === 204 ? '' : JSON.stringify(data ?? {}) })

      if (method === 'POST' && path === '/auth/password') {
        const uid = String(body.username ?? '').toLowerCase() === 'org' ? 'org-1' : 'guest-1'
        authByContext.set(context, uid)
        return respond(200, { id: uid })
      }
      const viewerId = authByContext.get(context)
      if (!viewerId) return respond(401, { error: { code: 'session_required' } })
      if (method === 'GET' && path === '/me') return respond(200, { id: viewerId, canCreateEvents: viewerId === 'org-1' })

      if (method === 'POST' && path === '/events') {
        if (viewerId !== 'org-1') return respond(403, { error: { code: 'organizer_required' } })
        const id = `evt-${++seq}`
        const ev: MockEvent = {
          id,
          name: String(body.name),
          timeZone: String(body.timeZone || 'Asia/Almaty'),
          startsAt: String(body.startsAt),
          endsAt: String(body.endsAt),
          status: 'active',
        }
        events.set(id, ev)
        memberships.set(id, [{ userId: viewerId, role: 'organizer', name: 'Организатор', visible: false }])
        interestsByEvent.set(id, { topics: [], profileCount: 0 })
        return respond(201, ev)
      }

      if (method === 'GET' && path === '/events') {
        const items = [...events.values()]
          .filter(ev => (memberships.get(ev.id) ?? []).some(m => m.userId === viewerId))
          .map(ev => ({
            ...ev,
            role: (memberships.get(ev.id) ?? []).find(m => m.userId === viewerId)!.role,
          }))
        return respond(200, { items, nextCursor: null })
      }

      const evMatch = path.match(/^\/events\/([^/]+)(?:\/(.*))?$/)
      if (evMatch) {
        const eventId = evMatch[1]
        const action = evMatch[2] || ''
        const ev = events.get(eventId)
        if (!ev) return respond(404, { error: { code: 'not_found' } })
        const memberList = memberships.get(eventId) ?? []
        const myMembership = memberList.find(m => m.userId === viewerId)

        if (action === 'members/me' && method === 'PUT') {
          const inv = [...invites.values()].find(i => i.eventId === eventId && i.token === body.token && !i.revoked)
          if (!inv) return respond(404, { error: { code: 'invite_expired' } })
          if (!myMembership) {
            memberList.push({ userId: viewerId, role: 'participant', name: 'Алия', profileRole: 'Go Backend', goal: 'find_job', visible: true })
            interestsByEvent.set(eventId, { topics: [{ name: 'Go', count: 1 }], profileCount: 1 })
          }
          return respond(200, { role: 'participant' })
        }

        if (!myMembership) return respond(404, { error: { code: 'not_found' } })
        if (!action && method === 'GET') return respond(200, ev)
        if (!action && method === 'PATCH') {
          if (body.name) ev.name = String(body.name)
          if (body.status) ev.status = body.status as 'active' | 'closed'
          return respond(200, ev)
        }
        if (action === 'profile' && method === 'GET') {
          if (viewerId === 'guest-1') {
            return respond(200, {
              name: 'Алия', role: 'Go Backend', skills: ['Go'], experienceYears: 2,
              interests: ['Go'], about: 'Ищу команду', goal: 'find_job', visible: true, consentVersion: 'v1',
            })
          }
          return respond(404, { error: { code: 'not_found' } })
        }
        if (action === 'recommendations' && method === 'GET') return respond(200, { items: [] })
        if (action === 'introductions' && method === 'GET') return respond(200, { items: [] })
        if (action === 'meetings' && method === 'GET') return respond(200, { items: [] })

        if (action === 'invites' && method === 'POST') {
          const inv = { id: `inv-${++seq}`, eventId, token: `tok-${seq}`, revoked: false }
          invites.set(inv.id, inv)
          return respond(201, { id: inv.id, token: inv.token })
        }
        if (action.startsWith('invites/') && method === 'DELETE') {
          const invId = action.slice('invites/'.length)
          const inv = invites.get(invId)
          if (inv) inv.revoked = true
          return respond(204)
        }
        if (action === 'members' && method === 'GET') {
          return respond(200, { items: memberList, nextCursor: null })
        }
        if (action === 'interests' && method === 'GET') {
          return respond(200, interestsByEvent.get(eventId) ?? { topics: [], profileCount: 0 })
        }
        if (action === 'booths' && method === 'GET') {
          const list = [...booths.values()].filter(
            b => b.eventId === eventId && (myMembership.role === 'organizer' || b.published),
          )
          return respond(200, { items: list, nextCursor: null })
        }
        if (action === 'booths' && method === 'POST') {
          const booth: MockBooth = {
            id: `booth-${++seq}`,
            eventId,
            name: String(body.name),
            description: String(body.description ?? ''),
            topics: (body.topics as string[]) ?? [],
            published: body.published === undefined ? true : Boolean(body.published),
          }
          booths.set(booth.id, booth)
          return respond(201, booth)
        }
        if (action.startsWith('booths/') && method === 'PATCH') {
          const boothId = action.slice('booths/'.length)
          const booth = booths.get(boothId)
          if (!booth || booth.eventId !== eventId) return respond(404, { error: { code: 'not_found' } })
          if (body.name !== undefined) booth.name = String(body.name)
          if (body.description !== undefined) booth.description = String(body.description)
          if (body.topics !== undefined) booth.topics = body.topics as string[]
          if (body.published !== undefined) booth.published = Boolean(body.published)
          return respond(200, booth)
        }
      }

      return respond(404, { error: { code: 'not_found' } })
    })
  }

  return { attach }
}

test('organizer creates events without JSON, isolates second empty event, manages invites and booths (#55)', async ({
  browser,
}, testInfo) => {
  const backend = createOrganizerBackend()
  const viewport = testInfo.project.use.viewport ?? { width: 1280, height: 860 }
  const orgCtx = await browser.newContext({ viewport })
  const guestCtx = await browser.newContext({ viewport })
  await backend.attach(orgCtx)
  await backend.attach(guestCtx)

  try {
    const orgPage = await orgCtx.newPage()
    await orgPage.goto('/?mode=account')
    await orgPage.locator('input[name="username"]').fill('org')
    await orgPage.locator('input[name="password"]').fill('browser-test-password')
    await orgPage.locator('.auth-form button[type="submit"]').click()

    // Open Organizer cabinet and create Event 1
    await orgPage.locator('.workspace-nav button', { hasText: 'Организатор' }).click()
    await expect(orgPage.locator('#organizer-title')).toBeVisible()
    await orgPage.locator('input[name="eventName"]').fill('Almaty Go Conf')
    await orgPage.locator('button', { hasText: 'Создать событие' }).click()

    // Empty event 1 initially has zero synthetic booths & zero synthetic topics; CSV export is disabled
    await expect(orgPage.locator('text=В этом событии пока нет стендов.')).toBeVisible()
    await expect(orgPage.locator('.interest-map .empty-state')).toBeVisible()
    await expect(orgPage.locator('.interest-map button', { hasText: 'Скачать CSV' })).toBeDisabled()

    // Issue invite link & create a published booth in Event 1
    await orgPage.locator('button', { hasText: 'Выпустить приглашение' }).click()
    const inviteUrl = (await orgPage.locator('.invite-url').first().innerText()).trim()
    expect(inviteUrl).toContain('/invite/evt-1/')

    await orgPage.locator('input[name="boothName"]').fill('Сообщество Go')
    await orgPage.locator('input[name="boothTopics"]').fill('Go, Backend')
    await orgPage.locator('input[name="boothDescription"]').fill('Разбор Go сервисов.')
    await orgPage.locator('button', { hasText: 'Добавить стенд' }).click()
    await expect(orgPage.locator('[data-managed-booth-id]')).toHaveCount(1)

    // Participant joins Event 1 via invite link and sees the published booth (not demo booths!)
    const guestPage = await guestCtx.newPage()
    await guestPage.goto(new URL(inviteUrl).pathname)
    await guestPage.locator('input[name="username"]').fill('guest')
    await guestPage.locator('input[name="password"]').fill('browser-test-password')
    await guestPage.locator('.auth-form button[type="submit"]').click()
    await expect(guestPage.locator('#event-profile-title')).toBeVisible()
    // A participant never sees the organizer cabinet
    await expect(guestPage.locator('.workspace-nav button', { hasText: 'Организатор' })).toHaveCount(0)
    await guestPage.locator('.workspace-nav button').nth(1).click()
    await expect(guestPage.locator('[data-booth-id]')).toHaveCount(1)
    await expect(guestPage.locator('[data-booth-id]').first()).toContainText('Сообщество Go')

    // Organizer edits booth name and unpublishes it -> participant no longer sees it
    await orgPage.locator('[data-managed-booth-id] button', { hasText: 'Снять с публикации' }).click()
    await expect(orgPage.locator('[data-managed-booth-id] .status-badge')).toContainText('Снят с публикации')
    await guestPage.reload()
    await expect(guestPage.locator('#event-profile-title')).toBeVisible()
    await guestPage.locator('.workspace-nav button').nth(1).click()
    await expect(guestPage.locator('[data-booth-id]')).toHaveCount(0)

    // Search member by partial name (case-insensitive) in Event 1, then create Event 2 -> search resets and isolates events
    await orgPage.locator('input[name="memberSearch"]').fill('  организ  ')
    await expect(orgPage.locator('[data-member-id]')).toHaveCount(1)
    await orgPage.locator('input[name="memberSearch"]').fill('нет такого')
    await expect(orgPage.locator('text=По этому запросу участников не найдено.')).toBeVisible()

    // Organizer creates Event 2 -> completely isolated! No participant from Event 1, search reset, no booths from Event 1, empty interests
    await orgPage.locator('input[name="eventName"]').fill('Astana Design Meetup')
    await orgPage.locator('button', { hasText: 'Создать событие' }).click()
    await expect(orgPage.locator('input[name="memberSearch"]')).toHaveValue('')
    await expect(orgPage.locator('[data-managed-booth-id]')).toHaveCount(0)
    await expect(orgPage.locator('text=В этом событии пока нет стендов.')).toBeVisible()
    await expect(orgPage.locator('[data-member-id]')).toHaveCount(1)
    await expect(orgPage.locator('.interest-map .empty-state')).toBeVisible()
    await expect(orgPage.locator('.interest-map button', { hasText: 'Скачать CSV' })).toBeDisabled()
    await expect(orgPage.locator('input[name="editEventName"]')).toHaveValue('Astana Design Meetup')

    // Switching back through the event picker reloads that event's settings and members
    await orgPage.locator('.event-picker select').selectOption('evt-1')
    await expect(orgPage.locator('input[name="editEventName"]')).toHaveValue('Almaty Go Conf')
    await expect(orgPage.locator('[data-member-id]')).toHaveCount(2)
  } finally {
    await orgCtx.close()
    await guestCtx.close()
  }
})

test('event times follow the event zone, not the organizer device zone', async ({ browser }, testInfo) => {
  const backend = createOrganizerBackend()
  const viewport = testInfo.project.use.viewport ?? { width: 1280, height: 860 }
  // The organizer's device is in Berlin; the event runs in Almaty (UTC+5).
  const ctx = await browser.newContext({ viewport, timezoneId: 'Europe/Berlin' })
  await backend.attach(ctx)
  const created: Array<Record<string, unknown>> = []
  ctx.on('request', request => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/v1/events') created.push(request.postDataJSON())
  })
  try {
    const page = await ctx.newPage()
    expect(await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone)).toBe('Europe/Berlin')
    await page.goto('/?mode=account')
    await page.locator('input[name="username"]').fill('org')
    await page.locator('input[name="password"]').fill('browser-test-password')
    await page.locator('.auth-form button[type="submit"]').click()
    await page.locator('.workspace-nav button', { hasText: 'Организатор' }).click()
    await expect(page.locator('[data-zone-hint]').first()).toContainText('Asia/Almaty')
    await page.locator('input[name="eventName"]').fill('Almaty time')
    await page.locator('input[name="eventStartDate"]').fill('2027-03-10')
    await page.locator('select[name="eventStartTime"]').selectOption('09:00')
    await page.locator('input[name="eventEndDate"]').fill('2027-03-10')
    await page.locator('select[name="eventEndTime"]').selectOption('18:00')
    await page.locator('button', { hasText: 'Создать событие' }).click()
    await expect.poll(() => created.length).toBe(1)
    expect(created[0].startsAt).toBe('2027-03-10T04:00:00.000Z')
    expect(created[0].endsAt).toBe('2027-03-10T13:00:00.000Z')
    // The edit form shows the stored instant on the Almaty clock again.
    await expect(page.locator('select[name="editEventStartTime"]')).toHaveValue('09:00')
    await expect(page.locator('select[name="editEventEndTime"]')).toHaveValue('18:00')
    await expect(page.locator('input[name="editEventStartDate"]')).toHaveValue('2027-03-10')
  } finally {
    await ctx.close()
  }
})
