import { expect, test } from '@playwright/test'
import type { BrowserContext } from '@playwright/test'

function createInviteQrBackend() {
  const eventId = 'evt-qr-1'
  const invites = new Map<string, { id: string; token: string; revoked: boolean }>()
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
      if (method === 'GET' && path === '/me') return respond(200, { id: viewerId })

      if (method === 'GET' && path === '/events') {
        const items = viewerId === 'org-1'
          ? [{ id: eventId, name: 'Almaty QR Meetup', role: 'organizer', status: 'active', timeZone: 'Asia/Almaty' }]
          : []
        return respond(200, { items, nextCursor: null })
      }
      if (method === 'GET' && path === `/events/${eventId}`) {
        return respond(200, {
          id: eventId,
          name: 'Almaty QR Meetup',
          status: 'active',
          timeZone: 'Asia/Almaty',
          endsAt: new Date(Date.now() + 8 * 3600_000).toISOString(),
        })
      }
      if (method === 'POST' && path === `/events/${eventId}/invites`) {
        const id = `inv-${++seq}`
        const token = `${'f'.repeat(60)}${String(seq).padStart(4, '0')}`
        invites.set(id, { id, token, revoked: false })
        return respond(201, { id, token })
      }
      if (method === 'DELETE' && path.startsWith(`/events/${eventId}/invites/`)) {
        const id = path.slice(`/events/${eventId}/invites/`.length)
        const inv = invites.get(id)
        if (inv) inv.revoked = true
        return respond(204)
      }
      if (method === 'PUT' && path === `/events/${eventId}/members/me`) {
        const inv = [...invites.values()].find(item => item.token === body.token && !item.revoked)
        if (!inv) return respond(404, { error: { code: 'invite_revoked', message: 'Revoked' } })
        return respond(200, { role: 'participant' })
      }
      if (method === 'GET' && path === `/events/${eventId}/profile`) {
        return respond(404, { error: { code: 'not_found' } })
      }
      if (method === 'GET' && (path.endsWith('/members') || path.endsWith('/booths') || path.endsWith('/reports') || path.endsWith('/introductions') || path.endsWith('/meetings'))) {
        return respond(200, { items: [], nextCursor: null })
      }
      if (method === 'GET' && path.endsWith('/interests')) {
        return respond(200, { topics: [], profileCount: 0 })
      }
      return respond(404, { error: { code: 'not_found' } })
    })
  }

  return { attach }
}

test('generates invite QR locally without external requests, closes with Escape, localizes ru/kk/en, and rejects revoked QR (#91)', async ({
  browser,
}, testInfo) => {
  const backend = createInviteQrBackend()
  const viewport = testInfo.project.use.viewport ?? { width: 360, height: 800 }
  const orgCtx = await browser.newContext({ viewport, locale: 'ru-RU' })
  const guestCtx = await browser.newContext({ viewport, locale: 'ru-RU' })
  await backend.attach(orgCtx)
  await backend.attach(guestCtx)

  const externalRequests: string[] = []
  try {
    const orgPage = await orgCtx.newPage()
    orgPage.on('request', req => {
      const reqUrl = new URL(req.url())
      if (reqUrl.hostname !== '127.0.0.1' && reqUrl.hostname !== 'localhost') {
        externalRequests.push(req.url())
      }
    })

    await orgPage.goto('/?mode=account')
    await orgPage.locator('input[name="username"]').fill('org')
    await orgPage.locator('input[name="password"]').fill('browser-test-password')
    await orgPage.locator('.auth-form button[type="submit"]').click()

    await orgPage.locator('.workspace-nav button', { hasText: 'Организатор' }).click()
    await orgPage.locator('button', { hasText: 'Выпустить приглашение' }).click()

    const inviteUrl = (await orgPage.locator('.invite-url').first().innerText()).trim()
    expect(inviteUrl).toContain('/invite/evt-qr-1/')

    // Open QR dialog next to Copy button
    const showQrBtn = orgPage.locator('.invite-row button', { hasText: 'Показать QR' })
    await expect(showQrBtn).toBeVisible()
    await showQrBtn.click()

    const dialog = orgPage.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.locator('svg')).toBeVisible()
    await expect(dialog.locator('.invite-url')).toHaveText(inviteUrl)

    // Verify no horizontal overflow inside mobile viewport
    const hasOverflow = await orgPage.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
    expect(hasOverflow).toBe(false)

    // Close via Escape key and check focus returns to trigger button
    await orgPage.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(showQrBtn).toBeFocused()

    // Check kk and en labels for QR button & modal
    await orgPage.locator('.lang-switcher button[lang="kk"]').click()
    await orgPage.locator('.invite-row button', { hasText: 'QR көрсету' }).click()
    await expect(orgPage.locator('#invite-qr-title')).toHaveText('Шақыру QR-коды')
    await orgPage.keyboard.press('Escape')

    await orgPage.locator('.lang-switcher button[lang="en"]').click()
    await orgPage.locator('.invite-row button', { hasText: 'Show QR' }).click()
    await expect(orgPage.locator('#invite-qr-title')).toHaveText('Invite QR code')
    await orgPage.keyboard.press('Escape')

    // Assert zero external QR API requests were ever made
    expect(externalRequests).toEqual([])

    // Revoke invite -> QR action disappears and old scanned URL is rejected by server
    await orgPage.locator('.invite-row button', { hasText: 'Revoke' }).click()
    await expect(orgPage.locator('.invite-row button', { hasText: 'Show QR' })).toHaveCount(0)

    const guestPage = await guestCtx.newPage()
    await guestPage.goto(new URL(inviteUrl).pathname)
    await guestPage.locator('input[name="username"]').fill('guest')
    await guestPage.locator('input[name="password"]').fill('browser-test-password')
    await guestPage.locator('.auth-form button[type="submit"]').click()
    await expect(guestPage.locator('#expired-invite-title')).toBeVisible()
  } finally {
    await orgCtx.close()
    await guestCtx.close()
  }
})
