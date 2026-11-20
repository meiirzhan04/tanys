import { expect, test } from '@playwright/test'
import type { BrowserContext } from '@playwright/test'

const profile = {
  name: 'Алия', role: 'Backend-разработчик', skills: ['Go'], experienceYears: 3, interests: ['API'],
  about: 'Пишу на Go.', goal: 'find_job', visible: true, consentVersion: 'v1',
}

interface Intro { id: string; status: string; direction: string; participantId: string; participantName: string; participantRole: string; participantHandle: string; message: string | null; contact: string | null }

async function mockApi(context: BrowserContext, { failFirstSend = false } = {}) {
  const calls: string[] = []
  let failNext = failFirstSend
  const intros: Intro[] = [
    { id: 'in-1', status: 'pending', direction: 'incoming', participantId: 'u-4', participantName: 'Данияр Ахметов', participantRole: 'Тимлид', participantHandle: 'daniyar', message: 'Обсудим вакансию?', contact: null },
  ]
  await context.route('**/api/v1/**', async route => {
    const req = route.request()
    const url = new URL(req.url())
    const path = url.pathname.replace(/^\/api\/v1/, '')
    const method = req.method()
    calls.push(`${method} ${path}${url.search}`)
    const respond = (status: number, data?: unknown) =>
      route.fulfill({ status, contentType: 'application/json', body: status === 204 ? '' : JSON.stringify(data ?? {}) })
    if (path === '/me') return respond(200, { id: 'u-1', username: 'aliya', handle: 'aliya', canCreateEvents: true })
    if (path === '/me/contact') return respond(200, { value: '@aliya_tg' })
    if (path === '/events') return respond(200, { items: [{ id: 'evt-1', name: 'Almaty Meetup', role: 'organizer', status: 'active', timeZone: 'Asia/Almaty' }], nextCursor: null })
    if (path === '/events/evt-1') return respond(200, { id: 'evt-1', name: 'Almaty Meetup', status: 'active', timeZone: 'Asia/Almaty', startsAt: new Date().toISOString(), endsAt: new Date(Date.now() + 9e6).toISOString() })
    if (path === '/events/evt-1/profile') return respond(200, profile)
    if (path === '/events/evt-1/participants') {
      const q = (url.searchParams.get('q') ?? '').toLowerCase()
      const items = q.startsWith('par')
        ? [{ userId: 'u-2', handle: 'parasat', name: 'Parasat Dauletbai', role: 'iOS-разработчик', goal: 'find_job', introduction: intros.find(i => i.participantId === 'u-2') ?? null }]
        : []
      return respond(200, { items, query: q, minLength: 2 })
    }
    if (path === '/events/evt-1/introductions' && method === 'POST') {
      if (failNext) { failNext = false; return route.abort('failed') }
      const body = JSON.parse(req.postData() || '{}')
      const created = { id: 'out-1', status: 'pending', direction: 'outgoing', participantId: body.recipientId, participantName: 'Parasat Dauletbai', participantRole: 'iOS-разработчик', participantHandle: 'parasat', message: body.message ?? null, contact: null }
      intros.unshift(created)
      return respond(201, created)
    }
    if (path === '/events/evt-1/introductions') return respond(200, { items: intros, nextCursor: null })
    const patch = path.match(/^\/events\/evt-1\/introductions\/([^/]+)$/)
    if (patch && method === 'PATCH') {
      const intro = intros.find(i => i.id === patch[1])!
      intro.status = JSON.parse(req.postData() || '{}').status
      if (intro.status === 'accepted') intro.contact = 'https://t.me/daniyar_lead'
      return respond(200, intro)
    }
    if (path === '/events/evt-1/members') {
      return respond(200, { items: [{ userId: 'u-2', role: 'participant', name: 'Parasat Dauletbai', handle: 'parasat', profileRole: 'iOS', goal: 'find_job', visible: true }], nextCursor: null, total: 1 })
    }
    return respond(200, { items: [], nextCursor: null, topics: [], profileCount: 0 })
  })
  return calls
}

async function openIntros(context: BrowserContext) {
  const page = await context.newPage()
  await page.goto('/?mode=account')
  await expect(page.locator('#event-profile-title')).toBeVisible()
  await page.locator('.workspace-nav button').nth(2).click()
  await expect(page.locator('#introductions-title')).toBeVisible()
  return page
}

test('find a participant by @username with the keyboard and send a request only after the server confirms (#connections)', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ viewport: testInfo.project.use.viewport ?? { width: 1280, height: 860 }, locale: 'ru-RU' })
  const calls = await mockApi(context, { failFirstSend: true })
  try {
    const page = await openIntros(context)
    await expect(page.locator('.how-steps li')).toHaveCount(3)
    const search = page.locator('input[name="participantSearch"]')
    await search.fill('p')
    await expect(page.locator('.people-search__status')).toContainText('минимум 2')
    await search.fill('@PAR')
    await expect(page.locator('.people-search__list').getByRole('option')).toHaveCount(1)
    await expect(page.locator('.people-search__list').getByRole('option')).toContainText('@parasat')
    await search.press('ArrowDown')
    await search.press('Enter')
    const card = page.locator('.person-card')
    await expect(card).toContainText('Контакт скрыт до взаимного согласия')
    await expect(card.locator('.person-card__id p')).toContainText('@parasat')
    await expect(card.locator('.contact-value')).toHaveCount(0)
    await card.locator('textarea[name="introMessage"]').fill('Привет! Обсудим SwiftUI?')

    // Network failure: no success state, error shown, the message stays.
    await card.locator('[data-action="connect"]').click()
    await expect(card.locator('[role="alert"]')).toBeVisible()
    await expect(card).not.toContainText('Запрос отправлен')
    await expect(card.locator('textarea[name="introMessage"]')).toHaveValue('Привет! Обсудим SwiftUI?')

    await card.locator('[data-action="connect"]').click()
    await expect(card).toContainText('Запрос отправлен · ждём ответа')
    expect(calls.filter(call => call.startsWith('POST /events/evt-1/introductions'))).toHaveLength(2)
    expect(calls.some(call => call.toLowerCase().includes('/participants?q=par'))).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false)
  } finally {
    await context.close()
  }
})

test('accepting an incoming request unlocks the contact with safe Copy and Open actions (#connections)', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ viewport: testInfo.project.use.viewport ?? { width: 1280, height: 860 }, locale: 'ru-RU' })
  await mockApi(context)
  try {
    const page = await openIntros(context)
    await expect(page.getByRole('tab', { name: /Входящие/ })).toHaveAttribute('aria-selected', 'true')
    const incoming = page.locator('[data-intro-id="in-1"]')
    await expect(incoming).toContainText('Обсудим вакансию?')
    await expect(incoming.locator('.contact-reveal')).toHaveCount(0)
    await incoming.getByRole('button', { name: 'Принять' }).click()
    await expect(incoming.locator('.contact-reveal')).toContainText('https://t.me/daniyar_lead')
    await expect(incoming.getByRole('link', { name: 'Открыть' })).toHaveAttribute('href', 'https://t.me/daniyar_lead')
    await expect(incoming.getByRole('button', { name: 'Предложить время' })).toBeVisible()
    await page.getByRole('tab', { name: /Отправленные/ }).press('ArrowLeft')
    await expect(page.getByRole('tab', { name: /Отправленные/ })).toHaveAttribute('aria-selected', 'true')
    await expect(page.locator('.requests__empty')).toContainText('Найдите участника')
  } finally {
    await context.close()
  }
})

test('organizer filters reach the server, the footer support dialog and back-to-top work (#connections)', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ viewport: testInfo.project.use.viewport ?? { width: 1280, height: 860 }, locale: 'ru-RU' })
  const calls = await mockApi(context)
  try {
    const page = await context.newPage()
    await page.goto('/?mode=account')
    await expect(page.locator('#event-profile-title')).toBeVisible()
    await page.locator('.nav-organizer-btn').click()
    await page.locator('input[name="memberSearch"]').fill('@par')
    await page.locator('select[name="memberGoal"]').selectOption('find_job')
    await expect.poll(() => calls.some(call => call.includes('/members?') && call.includes('q=%40par') && call.includes('goal=find_job'))).toBe(true)
    await expect(page.locator('.members-panel')).toContainText('Найдено 1 участник')

    await page.locator('[data-footer="support"]').click()
    await expect(page.getByRole('dialog')).toContainText('tanys.hrr@gmail.com')
    await expect(page.getByRole('dialog')).not.toContainText('рабочих дней')
    await page.keyboard.press('Escape')

    const backToTop = page.getByRole('button', { name: 'Наверх' })
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await expect(backToTop).toBeVisible()
    await backToTop.click()
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(5)
  } finally {
    await context.close()
  }
})
