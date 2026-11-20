import { expect, test } from '@playwright/test'

test('detects system prefers-color-scheme on first visit and persists manual choice across reload & locale switch (#165)', async ({
  browser,
}, testInfo) => {
  const viewport = testInfo.project.use.viewport ?? { width: 1280, height: 860 }

  // 1. Clean browser profile with prefers-color-scheme: light starts in Light theme
  const lightCtx = await browser.newContext({ viewport, locale: 'ru-RU', colorScheme: 'light' })
  try {
    const page = await lightCtx.newPage()
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

    // Fill form fields before toggling theme and language
    const roleInput = page.locator('input[name="role"]')
    const skillsInput = page.locator('input[name="skills"]')
    await roleInput.fill('Frontend Engineer')
    await skillsInput.fill('React, TypeScript')

    // Manually toggle to Dark theme -> survives language switch & preserves form input
    await page.locator('.header-theme-btn').click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(roleInput).toHaveValue('Frontend Engineer')
    await expect(skillsInput).toHaveValue('React, TypeScript')

    await page.locator('.lang-switcher button[lang="en"]').click()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(roleInput).toHaveValue('Frontend Engineer')

    await page.locator('.lang-switcher button[lang="kk"]').click()
    await expect(page.locator('html')).toHaveAttribute('lang', 'kk')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(skillsInput).toHaveValue('React, TypeScript')

    // Reload -> saved manual Dark choice overrides system Light preference
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(page.locator('html')).toHaveAttribute('lang', 'kk')
  } finally {
    await lightCtx.close()
  }

  // 2. Clean browser profile with prefers-color-scheme: dark starts in Dark theme
  const darkCtx = await browser.newContext({ viewport, locale: 'ru-RU', colorScheme: 'dark' })
  try {
    const page = await darkCtx.newPage()
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

    // Manually toggle to Light -> persists across reload over system Dark
    await page.locator('.header-theme-btn').click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  } finally {
    await darkCtx.close()
  }

  // 3. Blocked localStorage still respects prefers-color-scheme and allows toggling without errors
  const restrictedCtx = await browser.newContext({ viewport, locale: 'ru-RU', colorScheme: 'light' })
  try {
    const page = await restrictedCtx.newPage()
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get() {
          throw new DOMException('Storage disabled', 'SecurityError')
        },
      })
    })
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await page.locator('.header-theme-btn').click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  } finally {
    await restrictedCtx.close()
  }
})
