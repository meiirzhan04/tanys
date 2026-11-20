import { expect, test } from '@playwright/test'

test('marks original-language profile fields clearly across kk/ru/en and light/dark without horizontal overflow (#153)', async ({
  browser,
}, testInfo) => {
  const viewport = testInfo.project.use.viewport ?? { width: 1440, height: 900 }

  for (const theme of ['light', 'dark'] as const) {
    const ctx = await browser.newContext({ viewport, locale: 'ru-RU', colorScheme: theme })
    try {
      const page = await ctx.newPage()
      await page.goto('/')
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme)

      // 1. Russian-matched pool: clean in RU, clearly marked "as in profile · RU" in KK & EN
      await page.locator('select[name="goal"]').selectOption('find_job')
      await page.locator('input[name="role"]').fill('Backend-разработчик')
      await page.locator('input[name="experience"]').fill('1')
      await page.locator('input[name="skills"]').fill('Python, FastAPI')
      await page.locator('input[name="interests"]').fill('API')
      await page.locator('textarea[name="about"]').fill('Ищу стажировку в backend-команде.')
      await page.locator('form button[type="submit"]').click()

      const cards = page.locator('section[aria-labelledby="results-title"] .result-card')
      await expect(cards).toHaveCount(5)
      const firstCard = cards.first()
      const firstName = await firstCard.locator('h2').innerText()
      const firstRole = await firstCard.locator('.candidate-role').innerText()

      // In RU UI, Russian profile cards do not show foreign-language badges
      await expect(firstCard.locator('.profile-origin-badge')).toHaveCount(0)
      await expect(page.locator('.results-language-note')).toHaveCount(0)

      // Switch to KK -> UI & templates in Kazakh, original Russian role preserved with lang="ru" + badge
      await page.locator('.lang-switcher button[lang="kk"]').click()
      await expect(page.locator('#results-title')).toHaveText('Ұсыныстар')
      await expect(firstCard.locator('h2')).toHaveText(firstName)
      await expect(firstCard.locator('.candidate-role')).toHaveText(firstRole)
      await expect(firstCard.locator('.candidate-role')).toHaveAttribute('lang', 'ru')
      await expect(firstCard.locator('.profile-origin-badge')).toHaveText('анкетадағыдай · RU')
      await expect(page.locator('.results-language-note')).toContainText('Анкетадағыдай')

      let overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
      expect(overflow, `kk ${theme} overflow`).toBe(false)

      // Switch to EN -> UI & templates in English, original Russian role preserved with lang="ru" + badge
      await page.locator('.lang-switcher button[lang="en"]').click()
      await expect(page.locator('#results-title')).toHaveText('Matches')
      await expect(firstCard.locator('h2')).toHaveText(firstName)
      await expect(firstCard.locator('.candidate-role')).toHaveText(firstRole)
      await expect(firstCard.locator('.candidate-role')).toHaveAttribute('lang', 'ru')
      await expect(firstCard.locator('.profile-origin-badge')).toHaveText('as in profile · RU')
      await expect(page.locator('.results-language-note')).toContainText('as in profile')

      overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
      expect(overflow, `en ${theme} overflow`).toBe(false)

      // 2. English-matched pool (iOS/Swift): clean in EN, clearly marked "как в анкете · EN" in RU
      await page.getByRole('button', { name: 'Edit profile' }).click()
      await page.locator('input[name="role"]').fill('iOS Developer')
      await page.locator('input[name="skills"]').fill('Swift, SwiftUI')
      await page.locator('input[name="interests"]').fill('Mobile')
      await page.locator('form button[type="submit"]').click()

      const iosCard = page.locator('section[aria-labelledby="results-title"] .result-card').first()
      await expect(iosCard).toBeVisible()
      await expect(iosCard.locator('.candidate-role')).toHaveAttribute('lang', 'en')
      await expect(iosCard.locator('.profile-origin-badge')).toHaveCount(0)

      await page.locator('.lang-switcher button[lang="ru"]').click()
      await expect(iosCard.locator('.profile-origin-badge')).toHaveText('как в анкете · EN')
      await expect(page.locator('.results-language-note')).toContainText('как в анкете')

      overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
      expect(overflow, `ru ${theme} overflow`).toBe(false)
    } finally {
      await ctx.close()
    }
  }
})
