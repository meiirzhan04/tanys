import { expect, test } from '@playwright/test'
import type { BrowserContext } from '@playwright/test'

async function mockAccountApi(context: BrowserContext, profile: Record<string, unknown> | null) {
  const state = { loggedIn: true, contact: '' }
  await context.route('**/api/v1/**', async route => {
    const req = route.request()
    const path = new URL(req.url()).pathname.replace(/^\/api\/v1/, '')
    const method = req.method()
    const respond = (status: number, data?: unknown) =>
      route.fulfill({ status, contentType: 'application/json', body: status === 204 ? '' : JSON.stringify(data ?? {}) })

    if (method === 'GET' && path === '/me') {
      return state.loggedIn ? respond(200, { id: 'user-1', username: 'aliya' }) : respond(401, { error: { code: 'unauthorized' } })
    }
    if (method === 'DELETE' && path === '/auth/session') {
      state.loggedIn = false
      return respond(204)
    }
    if (method === 'PUT' && path === '/me/contact') {
      state.contact = JSON.parse(req.postData() || '{}').contact ?? ''
      return respond(204)
    }
    if (method === 'GET' && path === '/events') {
      return respond(200, {
        items: [{ id: 'evt-1', name: 'Almaty Meetup', role: 'participant', status: 'active', timeZone: 'Asia/Almaty' }],
        nextCursor: null,
      })
    }
    if (method === 'GET' && path === '/events/evt-1') {
      return respond(200, { id: 'evt-1', name: 'Almaty Meetup', status: 'active', timeZone: 'Asia/Almaty' })
    }
    if (method === 'GET' && path === '/events/evt-1/profile') {
      return profile ? respond(200, profile) : respond(404, { error: { code: 'not_found' } })
    }
    if (method === 'GET' && /\/(recommendations|introductions|meetings|booths)$/.test(path)) {
      return respond(200, { items: [], nextCursor: null })
    }
    return respond(404, { error: { code: 'not_found' } })
  })
}

test('landing goal card pre-selects the goal and brings the form into view (#redesign)', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('#landing-title')).toBeVisible()
  await page.locator('.landing-goal').nth(1).click()
  await expect(page.locator('select[name="goal"]')).toHaveValue('hire')
  await expect(page.locator('input[name="lookingFor"]')).toBeVisible()
  await expect(page.locator('#profile-title')).toBeInViewport()

  await page.evaluate(() => window.scrollTo(0, 0))
  await page.locator('[data-landing-start]').click()
  await expect(page.locator('#profile-title')).toBeInViewport()
  await expect(page.locator('#profile-title')).toBeFocused()
})

test('demo profile screen shows an empty state, then the submitted card with completeness tips (#redesign)', async ({ page }) => {
  await page.goto('/')
  await page.locator('.nav-profile-btn').click()
  await expect(page.locator('#me-title')).toBeVisible()
  await expect(page.locator('.profile-empty')).toBeVisible()

  await page.locator('.profile-empty .primary-button').click()
  await page.locator('select[name="goal"]').selectOption('find_job')
  await page.locator('input[name="role"]').fill('Backend-разработчик')
  await page.locator('input[name="experience"]').fill('2')
  await page.locator('input[name="skills"]').fill('Python, FastAPI')
  await page.locator('input[name="interests"]').fill('API')
  await page.locator('textarea[name="about"]').fill('Ищу работу в backend-команде.')
  await page.locator('form button[type="submit"]').click()
  await expect(page.locator('.result-card').first()).toBeVisible()

  await page.locator('.nav-profile-btn').click()
  await expect(page.locator('.profile-hero h2')).toHaveText('Backend-разработчик')
  await expect(page.locator('.profile-score__ring strong')).toHaveText(/%$/)
  await expect(page.locator('.profile-tips li').first()).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false)
})

test('account profile tab: hidden warning, contact save and logout back to sign-in (#redesign)', async ({ browser }, testInfo) => {
  const viewport = testInfo.project.use.viewport ?? { width: 1280, height: 860 }
  const context = await browser.newContext({ viewport, locale: 'ru-RU' })
  await mockAccountApi(context, {
    name: 'Алия Нурланова',
    role: 'Backend-разработчик',
    skills: ['Python', 'FastAPI', 'PostgreSQL'],
    experienceYears: 3,
    interests: ['API', 'DevOps'],
    about: 'Пишу backend на Python и ищу команду с сильной инженерной культурой и ревью кода.',
    goal: 'exchange_experience',
    visible: false,
    consentVersion: 'v1',
  })
  try {
    const page = await context.newPage()
    await page.goto('/?mode=account')
    await expect(page.locator('#event-profile-title')).toBeVisible()

    await page.locator('.nav-profile-btn').click()
    await expect(page.locator('#me-title')).toBeVisible()
    await expect(page.locator('.profile-hero h2')).toHaveText('Алия Нурланова')
    await expect(page.locator('.profile-hero__warning')).toBeVisible()
    await expect(page.locator('.profile-score__ring strong')).toHaveText('100%')
    await expect(page.locator('.profile-card').first()).toContainText('aliya')

    await page.locator('input[name="profileContact"]').fill('@aliya_dev')
    await page.locator('.profile-contact-form button[type="submit"]').click()
    await expect(page.locator('.profile-contact-form [role="status"]')).toBeVisible()
    await expect(page.locator('.profile-card').nth(1)).toContainText('@aliya_dev')
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false)

    await page.locator('.profile-danger .secondary-button').click()
    await expect(page.locator('#auth-title')).toBeVisible()
  } finally {
    await context.close()
  }
})

test('account profile tab shows the empty state before any profile is saved (#redesign)', async ({ browser }, testInfo) => {
  const viewport = testInfo.project.use.viewport ?? { width: 1280, height: 860 }
  const context = await browser.newContext({ viewport, locale: 'ru-RU' })
  await mockAccountApi(context, null)
  try {
    const page = await context.newPage()
    await page.goto('/?mode=account')
    await expect(page.locator('#event-profile-title')).toBeVisible()
    await page.locator('.nav-profile-btn').click()
    await expect(page.locator('.profile-empty')).toBeVisible()
    await expect(page.locator('.profile-danger')).toBeVisible()
    await page.locator('.profile-empty .primary-button').click()
    await expect(page.locator('#event-profile-title')).toBeVisible()
  } finally {
    await context.close()
  }
})
