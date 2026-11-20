import { expect, test } from '@playwright/test'
import type { BrowserContext } from '@playwright/test'

async function mockAccountApi(context: BrowserContext, profile: Record<string, unknown> | null) {
  const events = profile ? ['A', 'B', 'C', 'D'].map(id => ({
    id, name: 'Meetup ' + id, role: 'participant', status: 'active', timeZone: 'Asia/Almaty',
  })) : []
  const profiles = new Map(events.slice(0, 3).map(e => [e.id, {
    ...profile, name: 'Name ' + e.id, role: 'Role ' + e.id, about: 'About ' + e.id,
  }]))
  const state = { loggedIn: true, contact: '', account: { name: '', profession: '', about: '' } }
  await context.route('**/api/v1/**', async route => {
    const req = route.request()
    const path = new URL(req.url()).pathname.replace(/^\/api\/v1/, '')
    const method = req.method()
    const respond = (status: number, data?: unknown) =>
      route.fulfill({ status, contentType: 'application/json', body: status === 204 ? '' : JSON.stringify(data ?? {}) })

    if (method === 'GET' && path === '/me') {
      return state.loggedIn ? respond(200, { id: 'user-1', username: 'aliya' }) : respond(401, { error: { code: 'unauthorized' } })
    }
    if (path === '/me/profile') {
      if (method === 'PUT') state.account = req.postDataJSON()
      return respond(200, state.account)
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
      return respond(200, { items: events })
    }
    const [, , eventId, action] = path.split('/')
    if (path.startsWith('/events/') && !action) return respond(200, events.find(e => e.id === eventId))
    if (action === 'profile') {
      if (method === 'PUT') profiles.set(eventId, req.postDataJSON())
      return profiles.has(eventId) ? respond(200, profiles.get(eventId)) : respond(404)
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

test('account profile and three event questionnaires stay independent after reload', async ({ browser }, testInfo) => {
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
    visible: true,
    consentVersion: 'v1',
  })
  try {
    const page = await context.newPage()
    await page.goto('/?mode=account')
    await expect(page.locator('#event-profile-title')).toBeVisible()

    await page.locator('.nav-profile-btn').click()
    await expect(page.locator('#me-title')).toBeVisible()
    const name = page.locator('[name=accountName]')
    const profession = page.locator('[name=accountProfession]')
    const picker = page.locator('.event-picker select')
    await picker.selectOption('B')
    await page.getByRole('button', { name: /Meetup B/ }).click()
    await expect(name).toHaveValue('Name B')
    await page.reload()
    await page.locator('.nav-profile-btn').click()
    await expect(name).toHaveValue('')
    await name.fill('Парасат')
    await profession.fill('Software Engineer')
    await page.locator('[name=accountAbout]').fill('My account bio')
    await page.locator('form:has([name=accountName]) button[type=submit]').click()
    await expect(page.locator('form:has([name=accountName]) [role=status]')).toBeVisible()
    await page.reload()
    for (const id of ['A', 'B', 'C', 'D']) {
      await picker.selectOption(id)
      await page.locator('.workspace-nav button').first().click()
      await expect(page.locator('[name=name]')).toHaveValue(id === 'D' ? 'Парасат' : 'Name ' + id)
      await expect(page.locator('[name=role]')).toHaveValue(id === 'D' ? 'Software Engineer' : 'Role ' + id)
      if (id === 'D') {
        await expect(page.locator('[name=about]')).toHaveValue('My account bio')
        await expect(page.locator('[name=visible]')).not.toBeChecked()
      }
      if (id === 'A') {
        await page.locator('[name=name]').fill('New event name')
        await page.locator('form.profile-form button[type=submit]').click()
        await expect(page.locator('form.profile-form')).toHaveCount(0)
      }
      await page.locator('.nav-profile-btn').click()
      await expect(name).toHaveValue('Парасат')
      await expect(profession).toHaveValue('Software Engineer')
    }
    await picker.selectOption('A')
    await expect(page.getByRole('button', { name: /Meetup A/ })).toBeVisible()
    await page.locator('.workspace-nav button').first().click()
    await expect(page.locator('[name=name]')).toHaveValue('New event name')
    await page.locator('.nav-profile-btn').click()
    // Contact is edited in a modal from the read-only card; Cancel keeps the old value
    await page.locator('[data-edit="contact"]').click()
    await page.getByRole('dialog').locator('input[name="profileContact"]').fill('@nope')
    await page.getByRole('dialog').getByRole('button', { name: 'Отмена' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.locator('[data-contact-value]')).not.toContainText('@nope')
    await page.locator('[data-edit="contact"]').click()
    await page.getByRole('dialog').locator('input[name="profileContact"]').fill('@aliya_dev')
    await page.getByRole('dialog').getByRole('button', { name: 'Сохранить' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.locator('[data-contact-value]')).toHaveText('@aliya_dev')
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false)

    // Cancel keeps the session; confirming signs out to the sign-in screen
    await page.locator('[data-action="logout"]').click()
    await expect(page.getByRole('alertdialog')).toContainText('Вы уверены, что хотите выйти?')
    await page.getByRole('alertdialog').getByRole('button', { name: 'Отмена' }).click()
    await expect(page.getByRole('alertdialog')).toHaveCount(0)
    await expect(page.locator('#me-title')).toBeVisible()
    await page.locator('[data-action="logout"]').click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Выйти', exact: true }).click()
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
    await page.locator('.nav-profile-btn').click()
    await page.locator('[name=accountName]').fill('No events')
    await page.locator('form:has([name=accountName]) button[type=submit]').click()
    await expect(page.locator('form:has([name=accountName]) [role=status]')).toBeVisible()
    await page.reload()
    await page.locator('.nav-profile-btn').click()
    await expect(page.locator('[name=accountName]')).toHaveValue('No events')
  } finally {
    await context.close()
  }
})
