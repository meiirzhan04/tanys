import { expect, test } from '@playwright/test'
import { getMessages } from '../../src/i18n/messages'
import type { BrowserContext, Page } from '@playwright/test'

function createInviteQrBackend() {
  const eventId = 'evt-qr-1'
  const invites = new Map<string, { id: string; token: string; revoked: boolean }>()
  const authByContext = new Map<BrowserContext, string | null>()
  let seq = 0

  async function attach(context: BrowserContext, initialUser: string | null = null) {
    authByContext.set(context, initialUser)
    await context.route('**/api/v1/**', async route => {
      const req = route.request()
      const path = new URL(req.url()).pathname.replace(/^\/api\/v1/, '')
      const method = req.method()
      const raw = req.postData()
      const body = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
      const respond = (status: number, data?: unknown) =>
        route.fulfill({ status, contentType: 'application/json', body: status === 204 ? '' : JSON.stringify(data ?? {}) })

      if (method === 'POST' && (path === '/auth/password' || path === '/auth/register')) {
        const uid = String(body.username ?? '').toLowerCase() === 'org' ? 'org-1' : 'guest-1'
        authByContext.set(context, uid)
        return respond(200, { id: uid })
      }
      const viewerId = authByContext.get(context)
      if (!viewerId) return respond(401, { error: { code: 'session_required' } })
      if (method === 'GET' && path === '/me') return respond(200, { id: viewerId, canCreateEvents: viewerId === 'org-1' })

      if (method === 'GET' && path === '/me/profile') return respond(200, { name: '', profession: '', about: '' })
      if (method === 'GET' && path === '/events') {
        const items = viewerId === 'org-1'
          ? [{ id: eventId, name: 'Almaty QR Meetup', role: 'organizer', status: 'active', timeZone: 'Asia/Almaty' }]
          : []
        return respond(200, { items, nextCursor: null })
      }
      if (method === 'GET' && path === `/events/${eventId}`) {
        return respond(200, {
          id: eventId,
          name: 'Almaty QR Meetup', role: viewerId === 'org-1' ? 'organizer' : 'participant',
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
    const exported = await dialog.locator('a[download]').getAttribute('href')
    expect(decodeURIComponent(exported!.split(',').slice(1).join(','))).toContain('<svg')
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

    // Follow the generated URL after registration, including a reload before registration.
    const entrant = await guestCtx.newPage()
    await entrant.goto('/join')
    await entrant.locator('input[inputmode=url]').fill(inviteUrl)
    await entrant.locator('button[type=submit]').click()
    await entrant.reload()
    await entrant.locator('.purpose-toggle button').last().click()
    await entrant.locator('input[name=username]').fill('newuser')
    await entrant.locator('input[name=password]').fill('browser-test-password')
    await entrant.locator('.auth-form button[type=submit]').click()
    await expect(entrant.locator('#event-profile-title')).toBeVisible()
    await expect(entrant).toHaveURL(/\/events\/evt-qr-1$/)

    // Revoke invite -> QR action disappears and old scanned URL is rejected by server
    await orgPage.locator('.invite-row button', { hasText: 'Revoke' }).click()
    await expect(orgPage.locator('.invite-row button', { hasText: 'Show QR' })).toHaveCount(0)

    const guestPage = await guestCtx.newPage()
    await guestPage.goto(new URL(inviteUrl).pathname)
    await expect(guestPage.locator('#expired-invite-title')).toBeVisible()
  } finally {
    await orgCtx.close()
    await guestCtx.close()
  }
})

async function fitsViewport(page: Page, selector: string) {
  const bounds = await page.locator(selector).boundingBox()
  const viewport = page.viewportSize()!
  expect(bounds).not.toBeNull()
  expect(bounds!.x).toBeGreaterThanOrEqual(0)
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width + 1)
  expect(bounds!.height).toBeLessThanOrEqual(viewport.height)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width)
}

for (const locale of ['kk', 'ru', 'en'] as const) {
  for (const theme of ['light', 'dark'] as const) {
    for (const organizer of [false, true]) {
      test(`account, logout and invite layout: ${locale}, ${theme}, ${organizer ? 'organizer' : 'user'}`, async ({ page, context }, info) => {
        test.skip(info.project.name !== 'desktop-chrome', 'Explicit viewport matrix in Chromium')
        await createInviteQrBackend().attach(context, organizer ? 'org-1' : 'guest-1')
        await page.addInitScript(({ locale, theme }) => {
          localStorage.setItem('tanys.locale.v1', locale)
          localStorage.setItem('tanys.theme.v3', theme)
        }, { locale, theme })
        await page.goto('/login')
        const t = getMessages(locale)
        await page.locator('.nav-profile-btn').click()
        await expect(page.locator('html')).toHaveAttribute('lang', locale)
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
        await expect(page.locator('.nav-organizer-btn')).toHaveCount(organizer ? 1 : 0)
        const widths = [320, 390, 768, 1024, 1440, 1920]
        for (const width of widths) {
          await page.setViewportSize({ width, height: 800 })
          await fitsViewport(page, '.account-settings__header')
          await page.locator('.header-link-btn').click()
          await expect(page.getByRole('alertdialog')).toBeVisible()
          await fitsViewport(page, '[role=alertdialog]')
          await page.keyboard.press('Escape')
          await expect(page.locator('#me-title')).toBeVisible()
        }
        if (organizer) {
          await page.locator('.nav-organizer-btn').click()
          await page.getByRole('button', { name: t.organizer.createInviteButton }).click()
          await page.getByRole('button', { name: t.organizer.showQr }).click()
          await expect(page.locator('.qr-svg-box svg')).toBeVisible()
          for (const width of widths) {
            await page.setViewportSize({ width, height: 800 })
            await fitsViewport(page, '[role=dialog]')
            await fitsViewport(page, '.qr-svg-box')
          }
        }
      })
    }
  }
}
