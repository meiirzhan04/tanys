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
  // 09:00 tomorrow on the Almaty clock (UTC+5), independent of the browser's device zone.
  const tomorrow = new Date(Date.now() + 86400000)
  const day = new Date(Date.UTC(tomorrow.getUTCFullYear(), tomorrow.getUTCMonth(), tomorrow.getUTCDate(), 4))
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
  // A device in Berlin still enters the Almaty event's own times.
  const context = await browser.newContext({ viewport: testInfo.project.use.viewport ?? { width: 1280, height: 860 }, locale: 'en-US', timezoneId: 'Europe/Berlin' })
  await mockApi(context, { legacySlot: true })
  const saved: Array<{ slots: Array<{ start: string; end: string }> }> = []
  context.on('request', request => {
    if (request.method() === 'PUT' && request.url().endsWith('/availability/me')) saved.push(request.postDataJSON())
  })
  try {
    const page = await context.newPage()
    await page.goto('/?mode=account')
    await expect(page.locator('#event-profile-title')).toBeVisible()
    await page.locator('.workspace-nav button').nth(3).click()
    const start = page.locator('select[name="availabilityStartTime"]')
    await expect(start).toBeVisible()
    const values = await start.locator('option:not([disabled])').evaluateAll(options => options.map(option => (option as HTMLOptionElement).value))
    // One-day event 08:00–19:00: the date is prefilled and starts are limited to the event window.
    expect(values[0]).toBe('08:00')
    expect(values.at(-1)).toBe('18:45')
    expect(values.every(value => /:(00|15|30|45)$/.test(value))).toBe(true)
    expect(values).toContain('09:15')
    expect(values).not.toContain('07:45')
    expect(values).not.toContain('09:46')
    await expect(page.locator('[data-event-window]')).toContainText('08:00')
    await expect(page.locator('[data-event-window]')).toContainText('19:00')
    await expect(page.locator('.availability-panel')).toContainText('Asia/Almaty')
    await expect(page.locator('.legacy-time-hint')).toContainText('outside the 15-minute steps')

    await start.click()
    const menu = page.locator('.custom-select__menu')
    await expect(menu).toBeVisible()
    // Hovering options must not scroll the list by itself.
    const before = await menu.evaluate(element => element.scrollTop)
    const box = await menu.boundingBox()
    if (box) {
      for (let y = box.y + 8; y < box.y + box.height - 8; y += 12) await page.mouse.move(box.x + box.width / 2, y)
    }
    expect(await menu.evaluate(element => element.scrollTop)).toBe(before)
    await page.keyboard.press('Escape')
    await expect(menu).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false)

    // A specific reason instead of a generic error: pick an end before the start is impossible, so try an overlap.
    await start.selectOption('12:00')
    await page.locator('select[name="availabilityEndTime"]').selectOption('12:30')
    await page.getByRole('button', { name: 'Add interval' }).click()
    await expect(page.locator('.availability-slots li')).toHaveCount(2)
    // 12:00–12:30 on the Almaty clock is 07:00–07:30 UTC, even from a Berlin device.
    const added = saved.at(-1)?.slots.find(slot => slot.start.endsWith('T07:00:00.000Z'))
    expect(added?.end.endsWith('T07:30:00.000Z')).toBe(true)
    await start.selectOption('12:15')
    await page.locator('select[name="availabilityEndTime"]').selectOption('13:00')
    await page.getByRole('button', { name: 'Add interval' }).click()
    await expect(page.getByRole('alert')).toContainText('overlaps an interval you already added')
  } finally {
    await context.close()
  }
})

test('selects a date inside the event and saves a slot above the compact empty meetings state', async ({ browser }, testInfo) => {
  const context = await browser.newContext({
    viewport: testInfo.project.use.viewport ?? { width: 360, height: 800 },
    locale: 'en-US',
  })
  const calls = await mockApi(context)
  try {
    const page = await context.newPage()
    await page.goto('/?mode=account')
    await expect(page.locator('#event-profile-title')).toBeVisible()
    await page.locator('.workspace-nav button').nth(3).click()
    await expect(page.locator('.meetings-panel--empty .meeting-empty-note')).toBeVisible()
    // A one-day event prefills the date; the calendar still opens and offers only that day.
    await expect(page.getByRole('button', { name: /^Start date / })).not.toHaveText('Choose a date')
    await page.getByRole('button', { name: /^Start date / }).click()
    const calendar = page.getByRole('dialog')
    await expect(calendar.locator('.availability-calendar__days button:not(:disabled)')).toHaveCount(1)
    await expect(calendar.getByRole('button', { name: 'Previous month' })).toBeDisabled()
    await expect(calendar.getByRole('button', { name: 'Next month' })).toBeDisabled()
    await calendar.locator('.availability-calendar__days button:not(:disabled)').click()
    await expect(calendar).toBeHidden()
    await expect(page.getByRole('button', { name: /^End date / })).not.toHaveText('Choose a date')
    await page.locator('select[name="availabilityStartTime"]').selectOption('09:15')
    await page.locator('select[name="availabilityEndTime"]').selectOption('10:00')
    await page.getByRole('button', { name: 'Add interval' }).click()
    await expect(page.locator('.availability-slots li')).toHaveCount(1)
    expect(calls).toContain('PUT /events/evt-a/availability/me')
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false)
  } finally {
    await context.close()
  }
})
