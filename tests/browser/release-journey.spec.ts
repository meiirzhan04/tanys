import { expect, test } from '@playwright/test'
import type { BrowserContext, Page } from '@playwright/test'

interface MockUser {
  id: string
  email: string
  contact: string
  profile: Record<string, unknown> | null
}

interface MockIntro {
  id: string
  senderId: string
  recipientId: string
  status: 'pending' | 'accepted' | 'declined' | 'withdrawn'
}

interface MockMeeting {
  id: string
  introductionId: string
  slotId: string
  start: string
  end: string
  status: 'pending' | 'confirmed' | 'declined' | 'cancelled'
  proposerId: string
}

/**
 * Stateful in-memory implementation of the docs/service-v1.md contract
 * shared across multiple BrowserContexts to verify organizer invite + 2-user journeys.
 */
function createMockReleaseBackend(options: { emptyRecommendations?: boolean } = {}) {
  const eventId = 'evt-release-1'
  const validInviteToken = 'a'.repeat(64)
  const expiredInviteToken = 'b'.repeat(64)
  const users = new Map<string, MockUser>([
    ['user-a', { id: 'user-a', email: 'aliya@example.org', contact: '@aliya_dev', profile: null }],
    ['user-b', { id: 'user-b', email: 'daniyar@example.org', contact: '@daniyar_lead', profile: null }],
  ])
  const memberships = new Map<string, Set<string>>([
    ['user-a', new Set()],
    ['user-b', new Set()],
  ])
  const introductions: (MockIntro & { icebreaker?: string })[] = []
  const meetings: MockMeeting[] = []
  const commonSlots = [
    { id: 'slot-busy', start: '2027-02-01T09:00:00Z', end: '2027-02-01T09:20:00Z', busy: true },
    { id: 'slot-open', start: '2027-02-01T09:20:00Z', end: '2027-02-01T09:40:00Z', busy: false },
  ]
  const authByContext = new Map<BrowserContext, string | null>()
  let failNextProfileSaveFor: string | null = 'user-a'

  async function attachContext(context: BrowserContext) {
    authByContext.set(context, null)

    await context.route('**/api/v1/**', async route => {
      const req = route.request()
      const url = new URL(req.url())
      const path = url.pathname.replace(/^\/api\/v1/, '')
      const method = req.method()
      const rawBody = req.postData()
      const body = rawBody ? (JSON.parse(rawBody) as Record<string, unknown>) : {}

      const respond = (status: number, data?: unknown) =>
        route.fulfill({
          status,
          contentType: 'application/json',
          body: status === 204 ? '' : JSON.stringify(data ?? {}),
        })

      // Auth endpoints
      if (method === 'POST' && path === '/auth/password') {
        const login = String(body.username ?? '').toLowerCase()
        const uid = login === 'aliya' ? 'user-a' : 'user-b'
        authByContext.set(context, uid)
        return respond(200, { id: uid })
      }

      if (method === 'DELETE' && path === '/auth/session') {
        authByContext.set(context, null)
        return respond(204)
      }

      const viewerId = authByContext.get(context)
      if (!viewerId) {
        return respond(401, { error: { code: 'session_required', message: 'Session required' } })
      }
      const viewer = users.get(viewerId)!

      if (method === 'GET' && path === '/me') return respond(200, { id: viewerId })
      if (method === 'PUT' && path === '/me/contact') {
        viewer.contact = String(body.value ?? '')
        return respond(204)
      }

      // Events & invites
      if (method === 'GET' && path === '/events') {
        const items = [...(memberships.get(viewerId) ?? [])].map(id => ({
          id,
          name: 'Qazaq IT Meetup',
          role: 'participant',
          status: 'active',
          timeZone: 'Asia/Almaty',
        }))
        return respond(200, { items, nextCursor: null })
      }

      if (method === 'PUT' && path === `/events/${eventId}/members/me`) {
        if (body.token === expiredInviteToken) {
          return respond(410, { error: { code: 'invite_expired', message: 'Invite expired' } })
        }
        if (body.token !== validInviteToken) {
          return respond(404, { error: { code: 'not_found', message: 'Not found' } })
        }
        memberships.get(viewerId)!.add(eventId)
        return respond(200, { role: 'participant' })
      }

      if (method === 'GET' && path === `/events/${eventId}`) {
        return respond(200, {
          id: eventId,
          name: 'Qazaq IT Meetup',
          status: 'active',
          timeZone: 'Asia/Almaty',
        })
      }

      // Profiles
      if (method === 'GET' && path === `/events/${eventId}/profile`) {
        if (!viewer.profile) return respond(404, { error: { code: 'not_found', message: 'No profile' } })
        return respond(200, viewer.profile)
      }

      if (method === 'PUT' && path === `/events/${eventId}/profile`) {
        if (failNextProfileSaveFor === viewerId) {
          failNextProfileSaveFor = null
          return route.abort('failed')
        }
        viewer.profile = body
        return respond(200, viewer.profile)
      }

      // Recommendations
      if (method === 'GET' && path === `/events/${eventId}/recommendations`) {
        if (options.emptyRecommendations) {
          return respond(200, { items: [] })
        }
        const locale = url.searchParams.get('locale') || 'ru'
        const otherId = viewerId === 'user-a' ? 'user-b' : 'user-a'
        const other = users.get(otherId)!
        const otherName = String(other.profile?.name ?? (otherId === 'user-a' ? 'Алия' : 'Данияр'))
        const otherRole = String(other.profile?.role ?? (otherId === 'user-a' ? 'Backend-разработчик' : 'Тимлид'))
        const otherGoal = String(other.profile?.goal ?? (otherId === 'user-a' ? 'find_job' : 'hire'))
        const explanation =
          locale === 'kk'
            ? 'Өзара мақсаттар мен ортақ Python дағдысы сәйкес келеді.'
            : locale === 'en'
              ? 'Mutual networking goals and shared Python stack.'
              : 'Взаимные цели и общий стек Python.'
        const icebreaker =
          locale === 'kk'
            ? `Сәлем, ${otherName}! Python туралы сөйлесейік пе?`
            : locale === 'en'
              ? `Hi ${otherName}! Would you like to talk about Python?`
              : `Привет, ${otherName}! Обсудим задачи на Python?`

        return respond(200, {
          items: [
            {
              candidate: {
                id: otherId,
                name: otherName,
                role: otherRole,
                skills: ['Python', 'FastAPI'],
                experienceYears: otherId === 'user-a' ? 1 : 7,
                interests: ['API'],
                about: 'Demo profile',
                goal: otherGoal,
              },
              explanation,
              icebreaker,
            },
          ],
        })
      }

      // Introductions
      if (method === 'POST' && path === `/events/${eventId}/introductions`) {
        const recipientId = String(body.recipientId ?? '')
        let intro = introductions.find(
          item =>
            (item.senderId === viewerId && item.recipientId === recipientId) ||
            (item.senderId === recipientId && item.recipientId === viewerId),
        )
        if (!intro) {
          intro = {
            id: `intro-${introductions.length + 1}`, senderId: viewerId, recipientId, status: 'pending',
            icebreaker: typeof body.icebreaker === 'string' ? body.icebreaker : undefined,
          }
          introductions.push(intro)
        }
        const other = users.get(intro.senderId === viewerId ? intro.recipientId : intro.senderId)!
        return respond(201, {
          id: intro.id,
          status: intro.status,
          direction: intro.senderId === viewerId ? 'outgoing' : 'incoming',
          participantId: other.id,
          participantName: String(other.profile?.name ?? other.id),
          participantRole: String(other.profile?.role ?? ''),
        })
      }

      if (method === 'GET' && path === `/events/${eventId}/introductions`) {
        const items = introductions
          .filter(item => item.senderId === viewerId || item.recipientId === viewerId)
          .map(item => {
            const other = users.get(item.senderId === viewerId ? item.recipientId : item.senderId)!
            return {
              id: item.id,
              status: item.status,
              icebreaker: item.status === 'accepted' ? item.icebreaker : null,
              direction: item.senderId === viewerId ? 'outgoing' : 'incoming',
              participantId: other.id,
              participantName: String(other.profile?.name ?? other.id),
              participantRole: String(other.profile?.role ?? ''),
            }
          })
        return respond(200, { items, nextCursor: null })
      }

      const introMatch = path.match(new RegExp(`^/events/${eventId}/introductions/([^/]+)$`))
      if (introMatch && (method === 'GET' || method === 'PATCH')) {
        const intro = introductions.find(item => item.id === introMatch[1])
        if (!intro) return respond(404, { error: { code: 'not_found', message: 'Not found' } })
        if (method === 'PATCH') {
          intro.status = body.status as MockIntro['status']
        }
        const other = users.get(intro.senderId === viewerId ? intro.recipientId : intro.senderId)!
        return respond(200, {
          id: intro.id,
          status: intro.status,
          direction: intro.senderId === viewerId ? 'outgoing' : 'incoming',
          participantId: other.id,
          participantName: String(other.profile?.name ?? other.id),
          participantRole: String(other.profile?.role ?? ''),
          contact: intro.status === 'accepted' ? other.contact : null,
          icebreaker: intro.status === 'accepted' ? intro.icebreaker : null,
        })
      }

      const slotsMatch = path.match(new RegExp(`^/events/${eventId}/introductions/([^/]+)/slots$`))
      if (slotsMatch && method === 'GET') {
        return respond(200, { items: commonSlots.map(({ id, start, end }) => ({ id, start, end })) })
      }

      // Meetings
      if (method === 'GET' && path === `/events/${eventId}/meetings`) {
        const items = meetings.map(meeting => {
          const intro = introductions.find(item => item.id === meeting.introductionId)!
          const other = users.get(intro.senderId === viewerId ? intro.recipientId : intro.senderId)!
          return {
            ...meeting,
            direction: meeting.proposerId === viewerId ? 'outgoing' : 'incoming',
            participantName: String(other.profile?.name ?? other.id),
            participantRole: String(other.profile?.role ?? ''),
          }
        })
        return respond(200, { items, nextCursor: null })
      }

      if (method === 'POST' && path === `/events/${eventId}/meetings`) {
        const slot = commonSlots.find(item => item.id === body.slotId)
        if (!slot) return respond(404, { error: { code: 'not_found', message: 'Slot not found' } })
        if (slot.busy) {
          return respond(409, { error: { code: 'slot_conflict', message: 'Slot already taken' } })
        }
        const created: MockMeeting = {
          id: `meeting-${meetings.length + 1}`,
          introductionId: String(body.introductionId ?? ''),
          slotId: slot.id,
          start: slot.start,
          end: slot.end,
          status: 'pending',
          proposerId: viewerId,
        }
        meetings.push(created)
        return respond(201, created)
      }

      const meetingMatch = path.match(new RegExp(`^/events/${eventId}/meetings/([^/]+)$`))
      if (meetingMatch && method === 'PATCH') {
        const meeting = meetings.find(item => item.id === meetingMatch[1])
        if (!meeting) return respond(404, { error: { code: 'not_found', message: 'Not found' } })
        meeting.status = body.status as MockMeeting['status']
        return respond(200, meeting)
      }

      return respond(404, { error: { code: 'not_found', message: `Unhandled ${method} ${path}` } })
    })
  }

  return {
    eventId,
    validInvitePath: `/invite/${eventId}/${validInviteToken}`,
    expiredInvitePath: `/invite/${eventId}/${expiredInviteToken}`,
    attachContext,
  }
}

async function assertNoHorizontalOverflow(page: Page) {
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
  expect(hasOverflow).toBe(false)
}

async function signInByInvite(page: Page, invitePath: string, username: string) {
  await page.goto(invitePath)
  await expect(page.locator('#auth-title')).toBeVisible()
  await assertNoHorizontalOverflow(page)
  await page.locator('input[name="username"]').fill(username)
  await page.locator('input[name="password"]').fill('browser-test-password')
  await page.locator('.auth-form button[type="submit"]').click()
}

test('full 2-participant server journey: invite, network retry, intro, contact exchange, slot conflict, meeting & reload', async ({
  browser,
}, testInfo) => {
  const backend = createMockReleaseBackend()
  const viewport = testInfo.project.use.viewport ?? { width: 360, height: 800 }

  const contextA = await browser.newContext({ viewport })
  const contextB = await browser.newContext({ viewport })
  await backend.attachContext(contextA)
  await backend.attachContext(contextB)

  try {
    const pageA = await contextA.newPage()
    const pageB = await contextB.newPage()

    // 1. Participant A opens organizer invite, signs in, hits network error on save -> input preserved -> retries -> recommendations
    await signInByInvite(pageA, backend.validInvitePath, 'aliya')
    await expect(pageA.locator('#event-profile-title')).toBeVisible()
    await assertNoHorizontalOverflow(pageA)

    await pageA.locator('input[name="name"]').fill('Алия')
    await pageA.locator('select[name="goal"]').selectOption('find_job')
    await pageA.locator('input[name="role"]').fill('Backend-разработчик')
    await pageA.locator('input[name="experience"]').fill('1')
    await pageA.locator('input[name="skills"]').fill('Python, FastAPI')
    await pageA.locator('input[name="interests"]').fill('API')
    await pageA.locator('textarea[name="about"]').fill('Ищу команду backend.')
    await pageA.locator('input[name="visible"]').check()
    await pageA.locator('input[name="consent"]').check()

    await pageA.locator('form button[type="submit"]').click()
    // The simulated outage can also fail a background request; assert the form's own save error with Retry.
    await expect(pageA.locator('form .error-banner--actions')).toBeVisible()
    // Network failure preserves user input on screen
    await expect(pageA.locator('input[name="name"]')).toHaveValue('Алия')
    await expect(pageA.locator('input[name="role"]')).toHaveValue('Backend-разработчик')

    // Retry succeeds and loads first recommendations
    await pageA.locator('form .error-banner--actions button').click()
    await expect(pageA.locator('#results-title')).toBeVisible()
    await assertNoHorizontalOverflow(pageA)

    // 2. Participant B enters via invite in a separate browser context and saves profile
    await signInByInvite(pageB, backend.validInvitePath, 'daniyar')
    await expect(pageB.locator('#event-profile-title')).toBeVisible()
    await pageB.locator('input[name="name"]').fill('Данияр')
    await pageB.locator('select[name="goal"]').selectOption('hire')
    await pageB.locator('input[name="role"]').fill('Тимлид')
    await pageB.locator('input[name="experience"]').fill('7')
    await pageB.locator('input[name="skills"]').fill('Python, FastAPI')
    await pageB.locator('input[name="interests"]').fill('API')
    await pageB.locator('textarea[name="about"]').fill('Нанимаю в backend.')
    await pageB.locator('input[name="visible"]').check()
    await pageB.locator('input[name="consent"]').check()
    await pageB.locator('form button[type="submit"]').click()
    await expect(pageB.locator('#results-title')).toBeVisible()

    // 3. Participant A requests introduction with Participant B
    await pageA.locator('.row-toggle').first().click()
    const suggestedPhrase = await pageA.locator('.icebreaker p').innerText()
    await pageA.locator('.intro-action-row button').click()
    await expect(pageA.locator('.intro-action-row .status-badge')).toBeVisible()

    // 4. Participant B returns to tab (focus) -> gets notification -> accepts -> sees @aliya_dev
    await pageB.evaluate(() => window.dispatchEvent(new Event('focus')))
    await expect(pageB.locator('.notification-banner')).toBeVisible()
    await pageB.locator('.workspace-nav button').nth(2).click()
    await expect(pageB.locator('.social-card')).toBeVisible()
    await expect(pageB.locator('.request-card__message')).toHaveCount(0)
    await pageB.locator('.social-card .primary-button').click()
    await expect(pageB.locator('.contact-reveal')).toContainText('@aliya_dev')
    await expect(pageB.locator('.request-card__message')).toContainText(suggestedPhrase)
    await assertNoHorizontalOverflow(pageB)

    // 5. Participant A returns to tab -> sees accepted contact @daniyar_lead -> handles 409 slot_conflict -> proposes open slot
    await pageA.evaluate(() => window.dispatchEvent(new Event('focus')))
    await expect(pageA.locator('.notification-banner')).toBeVisible()
    await pageA.locator('.workspace-nav button').nth(2).click()
    await expect(pageA.locator('.contact-reveal')).toContainText('@daniyar_lead')
    await expect(pageA.locator('.request-card__message')).toContainText(suggestedPhrase)
    await pageA.locator('.social-card__accepted .secondary-button').click()
    await expect(pageA.locator('.meeting-slot-btn')).toHaveCount(2)
    // Taken slot returns 409 slot_conflict
    await pageA.locator('.meeting-slot-btn').nth(0).click()
    await expect(pageA.locator('.error-banner')).toBeVisible()
    // Free slot sends meeting invite
    await pageA.locator('.meeting-slot-btn').nth(1).click()
    await expect(pageA.locator('.info-banner')).toBeVisible()

    // 6. Participant B sees meeting invite and confirms it
    await pageB.evaluate(() => window.dispatchEvent(new Event('focus')))
    await pageB.locator('.workspace-nav button').nth(3).click()
    await expect(pageB.locator('[data-meeting-id]')).toBeVisible()
    await pageB.locator('[data-meeting-id] .primary-button').click()
    await expect(pageB.locator('[data-meeting-id] .status-badge')).toContainText('Подтверждено')

    // 7. Reload both browsers and verify persisted confirmed status + kk/en translations
    await pageA.reload()
    await pageB.reload()
    await expect(pageA.locator('#event-profile-title')).toBeVisible()
    await expect(pageB.locator('#event-profile-title')).toBeVisible()
    await pageA.locator('.workspace-nav button').nth(3).click()
    await pageB.locator('.workspace-nav button').nth(3).click()
    await expect(pageA.locator('[data-meeting-id] .status-badge')).toContainText('Подтверждено')
    await expect(pageB.locator('[data-meeting-id] .status-badge')).toContainText('Подтверждено')

    // Verify kk and en switch seamlessly on server meetings view
    await pageA.locator('.lang-switcher button[lang="kk"]').click()
    await expect(pageA.locator('[data-meeting-id] .status-badge')).toContainText('Расталды')
    await assertNoHorizontalOverflow(pageA)
    await pageA.locator('.lang-switcher button[lang="en"]').click()
    await expect(pageA.locator('[data-meeting-id] .status-badge')).toContainText('Confirmed')
    await assertNoHorizontalOverflow(pageA)
  } finally {
    await contextA.close()
    await contextB.close()
  }
})

test('kk/ru/en switching, empty recommendations, expired invite, and keyboard focus recovery', async ({
  browser,
}, testInfo) => {
  const backend = createMockReleaseBackend({ emptyRecommendations: true })
  const viewport = testInfo.project.use.viewport ?? { width: 360, height: 800 }
  const context = await browser.newContext({ viewport })
  await backend.attachContext(context)

  try {
    const page = await context.newPage()

    // 1. Demo flow: verify kk/ru/en preserve input and candidate IDs, and keyboard slot booking/cancel recovers focus
    await page.goto('/')
    await assertNoHorizontalOverflow(page)
    await page.locator('select[name="goal"]').selectOption('find_job')
    await page.locator('input[name="role"]').fill('Backend-разработчик')
    await page.locator('input[name="experience"]').fill('2')
    await page.locator('input[name="skills"]').fill('Python, FastAPI, PostgreSQL')
    await page.locator('input[name="interests"]').fill('API, Архитектура')
    await page.locator('textarea[name="about"]').fill('Разрабатываю сервисы на Python и ищу команду.')
    await page.locator('form button[type="submit"]').click()
    await expect(page.locator('.result-card')).toHaveCount(5)

    const ruIds = await page.locator('.result-card').evaluateAll(els => els.map(el => el.getAttribute('data-candidate-id')))
    await page.locator('.lang-switcher button[lang="kk"]').click()
    const kkIds = await page.locator('.result-card').evaluateAll(els => els.map(el => el.getAttribute('data-candidate-id')))
    await expect(page.locator('#results-title')).toHaveText('Ұсыныстар')
    expect(kkIds).toEqual(ruIds)
    await assertNoHorizontalOverflow(page)

    await page.locator('.lang-switcher button[lang="en"]').click()
    const enIds = await page.locator('.result-card').evaluateAll(els => els.map(el => el.getAttribute('data-candidate-id')))
    await expect(page.locator('#results-title')).toHaveText('Matches')
    expect(enIds).toEqual(ruIds)
    await assertNoHorizontalOverflow(page)

    // Keyboard booking & cancelling focus recovery
    await page.locator('.row-toggle').first().click()
    const firstSlot = page.locator('.meeting-slot-btn:not(:disabled)').first()
    await firstSlot.focus()
    await page.keyboard.press('Enter')
    await expect(page.locator('.meeting-slot-cancel').first()).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('.meeting-slot-btn:not(:disabled)').first()).toBeFocused()

    // 2. Expired invite state across languages
    await signInByInvite(page, backend.expiredInvitePath, 'daniyar')
    await expect(page.locator('#expired-invite-title')).toBeVisible()
    await assertNoHorizontalOverflow(page)

    // 3. Empty recommendations state across ru / kk / en
    await page.goto(backend.validInvitePath)
    await expect(page.locator('#event-profile-title')).toBeVisible()
    await page.locator('input[name="name"]').fill('Данияр')
    await page.locator('select[name="goal"]').selectOption('hire')
    await page.locator('input[name="role"]').fill('Тимлид')
    await page.locator('input[name="experience"]').fill('7')
    await page.locator('input[name="skills"]').fill('Python')
    await page.locator('input[name="interests"]').fill('API')
    await page.locator('textarea[name="about"]').fill('Ищу инженера.')
    await page.locator('input[name="consent"]').check()
    await page.locator('form button[type="submit"]').click()

    const emptyState = page.locator('section[aria-labelledby="results-title"] .empty-state')
    await expect(emptyState).toBeVisible()
    await page.locator('.lang-switcher button[lang="ru"]').click()
    await expect(emptyState).toContainText('Список рекомендаций пуст')
    await page.locator('.lang-switcher button[lang="kk"]').click()
    await expect(emptyState).toContainText('Ұсыныстар тізімі бос')
    await page.locator('.lang-switcher button[lang="en"]').click()
    await expect(emptyState).toContainText('No matches found')
    await assertNoHorizontalOverflow(page)
  } finally {
    await context.close()
  }
})
