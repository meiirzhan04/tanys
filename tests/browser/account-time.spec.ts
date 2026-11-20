import { expect, test } from '@playwright/test'
import type { BrowserContext } from '@playwright/test'

const profile = {
  name: 'Алия Нурланова',
  role: 'Backend-разработчик',
  skills: ['Python', 'FastAPI', 'PostgreSQL'],
  experienceYears: 3,
  interests: ['API', 'DevOps'],
  about: 'Пишу backend на Python.',
  goal: 'find_job',
  visible: true,
  consentVersion: 'v1',
}

interface MockOptions {
  role?: 'participant' | 'organizer'
  canCreateEvents?: boolean
  legacySlot?: boolean
}

async function mockApi(context: BrowserContext, { role = 'participant', canCreateEvents = false, legacySlot = false }: MockOptions = {}) {
  const calls: string[] = []
  let events = [
    { id: 'evt-a', name: 'Almaty Meetup', role, status: 'active', timeZone: 'Asia/Almaty' },
    { id: 'evt-b', name: 'Astana Conf', role: 'participant', status: 'active', timeZone: 'Asia/Almaty' },
  ]
  const day = new Date(Date.now() + 86400000)
  day.setHours(9, 0, 0, 0)
  const startsAt = new Date(+day - 3600000).toISOString()
  const endsAt = new Date(+day + 10 * 3600000).toISOString()
  const legacy = { start: new Date(+day + 46 * 60000).toISOString(), end: new Date(+day + 106 * 60000).toISOString() }
  await context.route('**/api/v1/**', async route => {
    const req = route.request()
    const path = new URL(req.url()).pathname.replace(/^\/api\/v1/, '')
    const method = req.method()
    if (method !== 'GET') calls.push(`${method} ${path}`)
    const respond = (status: number, data?: unknown) =>
      route.fulfill({ status, contentType: 'application/json', body: status === 204 ? '' : JSON.stringify(data ?? {}) })
    if (method === 'GET' && path === '/me') return respond(200, { id: 'user-1', username: 'aliya', canCreateEvents })
    if (method === 'DELETE' && path === '/auth/session') return respond(204)
    if (method === 'DELETE' && path === '/me') {
      return role === 'organizer' ? respond(409, { error: { code: 'organizer_owns_events' } }) : respond(204)
    }
    if (method === 'GET' && path === '/events') return respond(200, { items: events, nextCursor: null })
    const leave = path.match(/^\/events\/(evt-[ab])\/members\/me$/)
    if (leave && method === 'DELETE') {
      events = events.filter(item => item.id !== leave[1])
      return respond(204)
    }
    const detail = path.match(/^\/events\/(evt-[ab])$/)
    if (detail && method === 'GET') {
      const item = events.find(event => event.id === detail[1])
      return item ? respond(200, { ...item, startsAt, endsAt }) : respond(404, { error: { code: 'not_found' } })
    }
    if (/^\/events\/evt-[ab]\/profile$/.test(path) && method === 'GET') return respond(200, profile)
    if (/\/availability\/me$/.test(path) && method === 'GET') return respond(200, { slots: legacySlot ? [legacy] : [] })
    if (/\/availability\/me$/.test(path) && method === 'PUT') return respond(204)
    if (method === 'GET' && /\/(recommendations|introductions|meetings|booths|members|interests|reports)$/.test(path)) {
      return respond(200, { items: [], nextCursor: null, topics: [], profileCount: 0 })
    }
    return respond(404, { error: { code: 'not_found' } })
  })
  return calls
}

async function openProfileScreen(context: BrowserContext) {
  const page = await context.newPage()
  await page.goto('/?mode=account')
  await expect(page.locator('#event-profile-title')).toBeVisible()
  await page.locator('.nav-profile-btn').click()
  await expect(page.locator('#me-title')).toBeVisible()
  return page
}

test('leaving an event asks first, cancel changes nothing, confirm hides only that event (#account)', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ viewport: testInfo.project.use.viewport ?? { width: 1280, height: 860 }, locale: 'ru-RU' })
  const calls = await mockApi(context)
  try {
    const page = await openProfileScreen(context)
    await expect(page.locator('.nav-organizer-btn')).toHaveCount(0)
    await page.locator('[data-action="leave"]').click()
    const dialog = page.getByRole('alertdialog')
    await expect(dialog).toContainText('«Almaty Meetup»')
    await dialog.getByRole('button', { name: 'Отмена' }).click()
    await expect(dialog).toHaveCount(0)
    expect(calls).toEqual([])

    await page.locator('[data-action="leave"]').click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Выйти из мероприятия' }).click()
    await expect(page.getByRole('alertdialog')).toHaveCount(0)
    expect(calls).toEqual(['DELETE /events/evt-a/members/me'])
    await expect(page.locator('.event-picker select')).toHaveValue('evt-b')
    await expect(page.locator('.event-picker option')).toHaveCount(1)
  } finally {
    await context.close()
  }
})

test('deleting an account explains the consequences and needs the server to confirm (#account)', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ viewport: testInfo.project.use.viewport ?? { width: 1280, height: 860 }, locale: 'kk-KZ' })
  const calls = await mockApi(context)
  try {
    const page = await openProfileScreen(context)
    await expect(page.locator('.profile-danger h2')).toHaveText('Аккаунтты басқару')
    await expect(page.locator('.profile-danger')).toContainText('Іс-шарадан шығу анкетаңызды жасырады. Аккаунтты жою қайтарылмайды.')
    await page.locator('[data-action="delete"]').click()
    const dialog = page.getByRole('alertdialog')
    await expect(dialog).toContainText('қалпына келтіру мүмкін болмайды')
    await dialog.getByRole('button', { name: 'Болдырмау' }).click()
    expect(calls).toEqual([])
    await page.locator('[data-action="delete"]').click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Аккаунтты өшіру' }).click()
    await expect.poll(() => calls).toEqual(['DELETE /me'])
    await expect(page.locator('#landing-title')).toBeVisible()
  } finally {
    await context.close()
  }
})

test('an organizer sees the cabinet but cannot leave their event or delete the account yet (#account)', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ viewport: testInfo.project.use.viewport ?? { width: 1280, height: 860 }, locale: 'ru-RU' })
  const calls = await mockApi(context, { role: 'organizer', canCreateEvents: true })
  try {
    const page = await openProfileScreen(context)
    await expect(page.locator('.nav-organizer-btn')).toHaveCount(1)
    await expect(page.locator('[data-action="leave"]')).toHaveCount(0)
    await expect(page.locator('.profile-danger__note')).toContainText('Организатор не может выйти')
    await page.locator('[data-action="delete"]').click()
    const dialog = page.getByRole('alertdialog')
    await expect(dialog.locator('.confirm-dialog__blocked')).toContainText('передача мероприятий')
    await expect(dialog.getByRole('button', { name: 'Удалить аккаунт' })).toHaveCount(0)
    await dialog.getByRole('button', { name: 'Отмена' }).click()
    expect(calls).toEqual([])
  } finally {
    await context.close()
  }
})

test('availability times offer only 15-minute steps and flag a saved off-grid slot (#time)', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ viewport: testInfo.project.use.viewport ?? { width: 1280, height: 860 }, locale: 'en-US' })
  await mockApi(context, { legacySlot: true })
  try {
    const page = await context.newPage()
    await page.goto('/?mode=account')
    await expect(page.locator('#event-profile-title')).toBeVisible()
    await page.locator('.workspace-nav button').nth(3).click()
    const start = page.locator('select[name="availabilityStartTime"]')
    await expect(start).toBeVisible()
    const values = await start.locator('option:not([disabled])').evaluateAll(options => options.map(option => (option as HTMLOptionElement).value))
    expect(values).toHaveLength(96)
    expect(values.every(value => /:(00|15|30|45)$/.test(value))).toBe(true)
    expect(values).toContain('09:15')
    expect(values).not.toContain('09:46')
    await expect(page.locator('.legacy-time-hint')).toContainText('outside the 15-minute steps')

    await start.click()
    await expect(page.locator('.custom-select__menu')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator('.custom-select__menu')).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false)
  } finally {
    await context.close()
  }
})
