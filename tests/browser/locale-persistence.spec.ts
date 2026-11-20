import { expect, test } from '@playwright/test'

test('opens kk-KZ and en-US contexts in matching locale, including direct /invite links, and persists manual choice (#93)', async ({
  browser,
}, testInfo) => {
  const viewport = testInfo.project.use.viewport ?? { width: 1280, height: 860 }

  // 1. Fresh kk-KZ browser context -> opens in Kazakh on both / and /invite/...
  const kkCtx = await browser.newContext({ viewport, locale: 'kk-KZ' })
  await kkCtx.route('**/api/v1/me', route => route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }))
  try {
    const page = await kkCtx.newPage()
    await page.goto('/')
    await expect(page.locator('#profile-title')).toHaveText('Қатысушы анкетасы')
    await expect(page.locator('html')).toHaveAttribute('lang', 'kk')

    await page.goto('/invite/evt-demo/tok-123')
    await expect(page.locator('#auth-title')).toHaveText('Tanys жүйесіне кіру')
    await expect(page.locator('html')).toHaveAttribute('lang', 'kk')
  } finally {
    await kkCtx.close()
  }

  // 2. Fresh en-US browser context -> opens in English, manual switch to kk persists across reload
  const enCtx = await browser.newContext({ viewport, locale: 'en-US' })
  await enCtx.route('**/api/v1/me', route => route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }))
  try {
    const page = await enCtx.newPage()
    await page.goto('/')
    await expect(page.locator('#profile-title')).toHaveText('Participant profile')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')

    // Manual switch to Kazakh and reload -> choice & html[lang] persist
    await page.locator('.lang-switcher button[lang="kk"]').click()
    await expect(page.locator('#profile-title')).toHaveText('Қатысушы анкетасы')
    await expect(page.locator('html')).toHaveAttribute('lang', 'kk')

    await page.reload()
    await expect(page.locator('#profile-title')).toHaveText('Қатысушы анкетасы')
    await expect(page.locator('html')).toHaveAttribute('lang', 'kk')

    // Direct /invite route also respects persisted manual locale
    await page.goto('/invite/evt-demo/tok-123')
    await expect(page.locator('#auth-title')).toHaveText('Tanys жүйесіне кіру')
    await expect(page.locator('html')).toHaveAttribute('lang', 'kk')
  } finally {
    await enCtx.close()
  }

  // 3. Unsupported browser locale falls back to Russian, and blocked localStorage does not crash
  const deCtx = await browser.newContext({ viewport, locale: 'de-DE' })
  try {
    const page = await deCtx.newPage()
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get() {
          throw new DOMException('Storage disabled', 'SecurityError')
        },
      })
    })
    await page.goto('/')
    await expect(page.locator('#profile-title')).toHaveText('Анкета участника')
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru')

    // Switching language still works even when localStorage throws
    await page.locator('.lang-switcher button[lang="en"]').click()
    await expect(page.locator('#profile-title')).toHaveText('Participant profile')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  } finally {
    await deCtx.close()
  }
})
