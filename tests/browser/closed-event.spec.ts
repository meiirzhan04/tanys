import { expect, test } from '@playwright/test'

// A closed event is read-only everywhere: history stays visible, no button offers an action the server rejects.
test('closed event shows history but no write actions on matches, introductions or meetings', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ viewport: testInfo.project.use.viewport ?? { width: 1280, height: 860 }, locale: 'ru-RU' })
  const writes: string[] = []
  const start = new Date(Date.now() - 2 * 86400000)
  const iso = (minutes: number) => new Date(+start + minutes * 60000).toISOString()
  const profile = {
    name: 'Алия', role: 'Backend-разработчик', skills: ['Python'], experienceYears: 3, interests: ['API'],
    about: 'Backend.', goal: 'find_job', lookingFor: [], visible: true, consentVersion: 'v1',
  }
  await context.route('**/api/v1/**', route => {
    const request = route.request()
    const path = new URL(request.url()).pathname.replace(/^\/api\/v1/, '')
    const method = request.method()
    const respond = (status: number, data?: unknown) =>
      route.fulfill({ status, contentType: 'application/json', body: status === 204 ? '' : JSON.stringify(data ?? {}) })
    if (method !== 'GET') writes.push(`${method} ${path}`)
    if (path === '/me') return respond(200, { id: 'u1', username: 'aliya', handle: 'aliya', canCreateEvents: false })
    if (path === '/me/contact') return respond(200, { value: '@aliya' })
    if (path === '/me/profile') return respond(200, { name: 'Алия', profession: '', about: '' })
    if (path === '/events') return respond(200, { items: [{ id: 'e1', name: 'Done Meetup', role: 'participant', status: 'closed', timeZone: 'Asia/Almaty' }], nextCursor: null })
    if (path === '/events/e1') return respond(200, { id: 'e1', name: 'Done Meetup', role: 'participant', status: 'closed', timeZone: 'Asia/Almaty', startsAt: iso(0), endsAt: iso(600) })
    if (path === '/events/e1/profile') return respond(200, profile)
    if (path === '/events/e1/recommendations') {
      return respond(200, { items: [{ candidate: { id: 'c1', name: 'Данияр', role: 'Тимлид', skills: ['Python'], experienceYears: 7, interests: ['API'], about: '', goal: 'hire' }, explanation: 'Вы ищете работу, а этот участник нанимает.', icebreaker: 'Привет! Какие задачи в команде?' }] })
    }
    if (path === '/events/e1/introductions') {
      return respond(200, { items: [
        { id: 'i1', status: 'pending', direction: 'incoming', participantId: 'u2', participantName: 'Мадина', participantHandle: 'madina', message: 'Привет!', contact: null },
        { id: 'i2', status: 'accepted', direction: 'outgoing', participantId: 'u3', participantName: 'Тимур', participantHandle: 'timur', message: null, contact: '@timur' },
      ], nextCursor: null })
    }
    if (path === '/events/e1/meetings') {
      return respond(200, { items: [
        { id: 'm1', introductionId: 'i2', start: iso(60), end: iso(80), status: 'confirmed', direction: 'outgoing', participantName: 'Тимур' },
        { id: 'm2', introductionId: 'i2', start: iso(120), end: iso(140), status: 'pending', direction: 'incoming', participantName: 'Тимур' },
      ], nextCursor: null })
    }
    return respond(200, { items: [], nextCursor: null })
  })
  try {
    const page = await context.newPage()
    await page.goto('/?mode=account')
    const nav = page.locator('.workspace-nav button')

    await nav.filter({ hasText: 'Рекомендации' }).click()
    await expect(page.locator('.result-card')).toHaveCount(1)
    await expect(page.locator('[data-closed-banner]')).toBeVisible()
    await expect(page.locator('.result-card .intro-action-row button')).toHaveCount(0)

    await nav.filter({ hasText: 'Знакомства' }).click()
    await expect(page.locator('[data-closed-banner]')).toBeVisible()
    await expect(page.locator('[data-intro-id="i1"]')).toContainText('Привет!')
    await expect(page.getByRole('button', { name: 'Принять' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Отклонить' })).toHaveCount(0)
    await page.getByRole('tab', { name: /Отправленные/ }).click()
    await expect(page.locator('[data-intro-id="i2"]')).toContainText('@timur')
    // Only copying the revealed contact stays; proposing a time is gone.
    await expect(page.locator('[data-intro-id="i2"]').getByRole('button', { name: 'Предложить время' })).toHaveCount(0)
    await expect(page.locator('[data-intro-id="i2"] button:not(.chip-button)')).toHaveCount(0)

    await nav.filter({ hasText: 'Мои встречи' }).click()
    await expect(page.locator('[data-closed-banner]')).toBeVisible()
    await expect(page.locator('[data-meeting-id]')).toHaveCount(2)
    await expect(page.locator('[data-meeting-id] button')).toHaveCount(0)
    await expect(page.locator('.availability-panel')).toHaveCount(0)
    expect(writes).toEqual([])
  } finally {
    await context.close()
  }
})
