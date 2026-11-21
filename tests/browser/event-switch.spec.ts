import { expect, test } from '@playwright/test'
import type { Route } from '@playwright/test'

// A slow answer for the previous event must never overwrite the screen of the event the user switched to.
test('late introductions and matches of the previous event are dropped after switching events', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ viewport: testInfo.project.use.viewport ?? { width: 1280, height: 860 }, locale: 'ru-RU' })
  const start = new Date(Date.now() + 86400000).toISOString()
  const end = new Date(Date.now() + 86400000 + 36e6).toISOString()
  const events = [
    { id: 'evt-a', name: 'Event A', role: 'participant', status: 'active', timeZone: 'Asia/Almaty' },
    { id: 'evt-b', name: 'Event B', role: 'participant', status: 'active', timeZone: 'Asia/Almaty' },
  ]
  const profile = (name: string) => ({
    name, role: 'Backend-разработчик', skills: ['Python'], experienceYears: 3, interests: ['API'],
    about: 'Backend.', goal: 'find_job', lookingFor: [], visible: true, consentVersion: 'v1',
  })
  const intro = (event: string) => ({
    id: `intro-${event}`, status: 'pending', direction: 'incoming', participantId: `p-${event}`,
    participantName: `Person ${event}`, participantHandle: `person_${event}`, message: `Hello from ${event}`, contact: null,
  })
  const match = (event: string) => ({
    candidate: { id: `c-${event}`, name: `Match ${event}`, role: 'Тимлид', skills: ['Python'], experienceYears: 7, interests: ['API'], about: '', goal: 'hire' },
    explanation: `Подходит для ${event}.`, icebreaker: 'Привет!',
  })
  // Held answers for event A, released only after the user has switched to B.
  const held: Array<() => Promise<void>> = []
  let holdA = false
  await context.route('**/api/v1/**', async (route: Route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api\/v1/, '')
    const respond = (data: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) })
    const answer = (data: unknown) => {
      if (holdA && path.startsWith('/events/evt-a/')) {
        held.push(() => respond(data))
        return
      }
      return respond(data)
    }
    if (path === '/me') return respond({ id: 'u1', username: 'aliya', handle: 'aliya', canCreateEvents: false })
    if (path === '/me/contact') return respond({ value: '' })
    if (path === '/me/profile') return respond({ name: 'Алия', profession: '', about: '' })
    if (path === '/events') return respond({ items: events, nextCursor: null })
    const event = /^\/events\/evt-([ab])/.exec(path)?.[1]
    if (!event) return respond({ items: [], nextCursor: null })
    const base = `/events/evt-${event}`
    if (path === base) return respond({ ...events[event === 'a' ? 0 : 1], startsAt: start, endsAt: end })
    if (path === `${base}/profile`) return respond(profile(`Profile ${event.toUpperCase()}`))
    if (path === `${base}/introductions`) return answer({ items: [intro(event.toUpperCase())], nextCursor: null })
    if (path === `${base}/recommendations`) return answer({ items: [match(event.toUpperCase())] })
    return respond({ items: [], nextCursor: null })
  })
  try {
    const page = await context.newPage()
    await page.goto('/?mode=account')
    await expect(page.locator('[name=name]')).toHaveValue('Profile A')
    const nav = page.locator('.workspace-nav button')
    const picker = page.locator('.event-picker select')

    // Introductions: A's refresh hangs, the user moves to B, then A's old answer arrives.
    holdA = true
    await nav.filter({ hasText: 'Знакомства' }).click()
    await expect.poll(() => held.length).toBeGreaterThan(0)
    await picker.selectOption('evt-b')
    await expect(page.locator('[name=name]')).toHaveValue('Profile B')
    await nav.filter({ hasText: 'Знакомства' }).click()
    await expect(page.locator('[data-intro-id="intro-B"]')).toBeVisible()
    for (const release of held.splice(0)) await release()
    await expect(page.locator('[data-intro-id="intro-A"]')).toHaveCount(0)
    await expect(page.locator('[data-intro-id="intro-B"]')).toBeVisible()

    // Matches: A's recommendations hang; switching to B must not jump to A's results later.
    holdA = false
    await picker.selectOption('evt-a')
    await expect(page.locator('[name=name]')).toHaveValue('Profile A')
    holdA = true
    await nav.filter({ hasText: 'Рекомендации' }).click()
    await expect.poll(() => held.length).toBeGreaterThan(0)
    await picker.selectOption('evt-b')
    await expect(page.locator('[name=name]')).toHaveValue('Profile B')
    for (const release of held.splice(0)) await release()
    await nav.filter({ hasText: 'Рекомендации' }).click()
    await expect(page.locator('.result-card')).toContainText('Match B')
    await expect(page.locator('.result-card', { hasText: 'Match A' })).toHaveCount(0)
    await expect(picker).toHaveValue('evt-b')
  } finally {
    await context.close()
  }
})
