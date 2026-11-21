import { expect, test } from '@playwright/test'

for (const isAdmin of [true, false]) {
  test(`the admin shortcut is shown only to administrators (${isAdmin ? 'admin' : 'participant'})`, async ({ browser }, testInfo) => {
    const context = await browser.newContext({ viewport: testInfo.project.use.viewport ?? { width: 1280, height: 860 }, locale: 'ru-RU' })
    await context.route('**/api/v1/**', route => {
      const path = new URL(route.request().url()).pathname.replace(/^\/api\/v1/, '')
      const me = { id: 'u1', username: 'meiirzhan', handle: 'meiirzhan', canCreateEvents: isAdmin, ...(isAdmin ? { isAdmin: true } : {}) }
      const body = path === '/me' ? me : path === '/me/contact' ? { value: '' } : path === '/me/profile' ? { name: '', profession: '', about: '' } : { items: [], nextCursor: null }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
    })
    try {
      const page = await context.newPage()
      await page.goto('/?mode=account')
      await expect(page.locator('.nav-profile-btn')).toBeVisible()
      const link = page.locator('.nav-admin-btn')
      if (isAdmin) {
        await expect(link).toHaveText('Админка')
        await expect(link).toHaveAttribute('href', '/admin')
      } else {
        await expect(link).toHaveCount(0)
      }
    } finally {
      await context.close()
    }
  })
}
