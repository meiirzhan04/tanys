import { expect, test } from '@playwright/test'
import type { BrowserContext } from '@playwright/test'

function createModerationBackend() {
  const eventId = 'evt-mod-1'
  const blocks = new Set<string>()
  const restricted = new Set<string>()
  const reports: Array<{
    id: string
    subjectId: string
    subjectName: string
    reason: 'spam' | 'harassment' | 'fake_profile' | 'other'
    details: string
    status: 'open' | 'resolved'
    action: 'dismiss' | 'warn' | 'restrict' | null
    resolvedBy: string | null
  }> = []
  const authByContext = new Map<BrowserContext, string | null>()

  const isPairBlocked = (a: string, b: string) =>
    blocks.has(`${a}->${b}`) || blocks.has(`${b}->${a}`) || restricted.has(a) || restricted.has(b)

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
        const login = String(body.username ?? '').toLowerCase()
        const uid = login === 'org' ? 'org-1' : login === 'aliya' ? 'user-a' : 'user-b'
        authByContext.set(context, uid)
        return respond(200, { id: uid })
      }
      const viewerId = authByContext.get(context)
      if (!viewerId) return respond(401, { error: { code: 'session_required' } })
      if (method === 'GET' && path === '/me') return respond(200, { id: viewerId })

      if (method === 'GET' && path === '/events') {
        return respond(200, {
          items: [{
            id: eventId,
            name: 'Moderation Test Event',
            role: viewerId === 'org-1' ? 'organizer' : 'participant',
            status: 'active',
            timeZone: 'Asia/Almaty',
          }],
          nextCursor: null,
        })
      }
      if (method === 'GET' && path === `/events/${eventId}`) {
        return respond(200, { id: eventId, name: 'Moderation Test Event', status: 'active', timeZone: 'Asia/Almaty' })
      }
      if (method === 'GET' && path === `/events/${eventId}/profile`) {
        return respond(200, {
          name: viewerId === 'user-a' ? 'Алия' : viewerId === 'user-b' ? 'Спам-аккаунт' : 'Организатор',
          role: 'Backend',
          skills: ['Python'],
          experienceYears: 2,
          interests: ['API'],
          about: 'Bio',
          goal: viewerId === 'user-a' ? 'find_job' : 'hire',
          visible: true,
          consentVersion: 'v1',
        })
      }
      if (method === 'GET' && path === `/events/${eventId}/recommendations`) {
        const otherId = viewerId === 'user-a' ? 'user-b' : 'user-a'
        if (isPairBlocked(viewerId, otherId)) return respond(200, { items: [] })
        return respond(200, {
          items: [{
            candidate: {
              id: otherId,
              name: otherId === 'user-b' ? 'Спам-аккаунт' : 'Алия',
              role: 'Recruiter',
              skills: ['Python'],
              experienceYears: 3,
              interests: ['API'],
              about: 'Promo',
              goal: otherId === 'user-b' ? 'hire' : 'find_job',
            },
            explanation: 'Взаимные цели.',
            icebreaker: 'Привет!',
          }],
        })
      }
      if (method === 'POST' && path === `/events/${eventId}/introductions`) {
        const recipientId = String(body.recipientId ?? '')
        if (isPairBlocked(viewerId, recipientId)) {
          return respond(403, { error: { code: 'interaction_blocked', message: 'Blocked' } })
        }
        return respond(201, { id: 'i-1', status: 'pending', direction: 'outgoing', participantId: recipientId })
      }
      if (method === 'PUT' && path.startsWith(`/events/${eventId}/blocks/`)) {
        const targetId = path.slice(`/events/${eventId}/blocks/`.length)
        blocks.add(`${viewerId}->${targetId}`)
        return respond(204)
      }
      if (method === 'POST' && path === `/events/${eventId}/reports`) {
        const id = `rep-${reports.length + 1}`
        reports.push({
          id,
          subjectId: String(body.subjectId),
          subjectName: 'Спам-аккаунт',
          reason: (body.reason as 'spam') || 'spam',
          details: String(body.details ?? ''),
          status: 'open',
          action: null,
          resolvedBy: null,
        })
        return respond(201, { id, status: 'open' })
      }
      if (method === 'GET' && path === `/events/${eventId}/reports`) {
        if (viewerId !== 'org-1') return respond(403, { error: { code: 'organizer_required' } })
        // Notice: reporter identity is never exposed to the subject or in the public payload!
        return respond(200, { items: reports, nextCursor: null })
      }
      if (method === 'PATCH' && path.startsWith(`/events/${eventId}/reports/`)) {
        if (viewerId !== 'org-1') return respond(403, { error: { code: 'organizer_required' } })
        const repId = path.slice(`/events/${eventId}/reports/`.length)
        const rep = reports.find(r => r.id === repId)
        if (!rep) return respond(404, { error: { code: 'not_found' } })
        rep.status = 'resolved'
        rep.action = body.action as 'restrict' | 'warn' | 'dismiss'
        rep.resolvedBy = viewerId
        if (rep.action === 'restrict') restricted.add(rep.subjectId)
        return respond(200, rep)
      }
      if (method === 'GET' && (path.endsWith('/introductions') || path.endsWith('/meetings') || path.endsWith('/booths') || path.endsWith('/members'))) {
        return respond(200, { items: [], nextCursor: null })
      }
      if (method === 'GET' && path.endsWith('/interests')) {
        return respond(200, { topics: [], profileCount: 0 })
      }
      return respond(404, { error: { code: 'not_found' } })
    })
  }

  return { attach, eventId, isPairBlocked }
}

async function signIn(page: import('@playwright/test').Page, username: string) {
  await page.goto('/?mode=account')
  await page.locator('input[name="username"]').fill(username)
  await page.locator('input[name="password"]').fill('browser-test-password')
  await page.locator('.auth-form button[type="submit"]').click()
  await expect(page.locator('#event-profile-title')).toBeVisible()
}

test('block hides pair & rejects requests; report stays hidden from subject and organizer restricts violator (#56)', async ({
  browser,
}, testInfo) => {
  const backend = createModerationBackend()
  const viewport = testInfo.project.use.viewport ?? { width: 1280, height: 860 }
  const ctxA = await browser.newContext({ viewport })
  const ctxB = await browser.newContext({ viewport })
  const ctxOrg = await browser.newContext({ viewport })
  await backend.attach(ctxA)
  await backend.attach(ctxB)
  await backend.attach(ctxOrg)

  try {
    const pageA = await ctxA.newPage()
    const pageB = await ctxB.newPage()
    const pageOrg = await ctxOrg.newPage()

    await signIn(pageA, 'aliya')
    await signIn(pageB, 'spam')
    await signIn(pageOrg, 'org')

    // Support channel is visible to participants
    await expect(pageA.locator('.support-footer')).toContainText('support@tanys.kz')

    // 1. Participant A opens Recommendations, reports Participant B (author stays hidden from B)
    await pageA.locator('.workspace-nav button').nth(1).click()
    await expect(pageA.locator('.result-card')).toHaveCount(1)
    await pageA.locator('.row-toggle').first().click()
    await pageA.locator('button', { hasText: 'Пожаловаться' }).click()
    await pageA.locator('select[name="reportReason"]').selectOption('spam')
    await pageA.locator('input[name="reportDetails"]').fill('Навязчивая рассылка')
    await pageA.locator('button', { hasText: 'Отправить жалобу' }).click()
    await expect(pageA.locator('.info-banner')).toContainText('Ваше имя скрыто от второй стороны')

    // Participant B cannot access organizer reports queue (403)
    const bReportsStatus = await pageB.evaluate(async () => {
      const r = await fetch('/api/v1/events/evt-mod-1/reports')
      return r.status
    })
    expect(bReportsStatus).toBe(403)

    // 2. Participant A blocks Participant B -> B immediately disappears from A's recommendations
    await pageA.locator('button', { hasText: 'Заблокировать' }).click()
    await expect(pageA.locator('.info-banner')).toContainText('Участник заблокирован')
    await expect(pageA.locator('.result-card')).toHaveCount(0)

    // 3. Participant B tries to send introduction to A -> rejected with 403 blocked error!
    await pageB.locator('.workspace-nav button').nth(1).click()
    await expect(pageB.locator('.result-card')).toHaveCount(0)
    const bIntroStatus = await pageB.evaluate(async () => {
      const r = await fetch('/api/v1/events/evt-mod-1/introductions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: 'user-a' }),
      })
      return r.status
    })
    expect(bIntroStatus).toBe(403)

    // 4. Organizer opens closed moderation queue -> sees report -> restricts violator
    await pageOrg.locator('.workspace-nav button', { hasText: 'Организатор' }).click()
    await expect(pageOrg.locator('[data-report-id]')).toHaveCount(1)
    await expect(pageOrg.locator('[data-report-id]')).toContainText('Навязчивая рассылка')
    await pageOrg.locator('[data-report-id] button', { hasText: 'Ограничить в событии' }).click()
    await expect(pageOrg.locator('[data-report-id] .status-badge')).toContainText('Рассмотрено')
    await expect(pageOrg.locator('[data-report-id]')).toContainText('Решение: Ограничить в событии')
  } finally {
    await ctxA.close()
    await ctxB.close()
    await ctxOrg.close()
  }
})
