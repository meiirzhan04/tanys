import { expect, test } from '@playwright/test'

interface Rgba {
  r: number
  g: number
  b: number
  a: number
}

function parseRgba(value: string): Rgba {
  const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
  if (!match) return { r: 0, g: 0, b: 0, a: 0 }
  return {
    r: Number(match[1]),
    g: Number(match[2]),
    b: Number(match[3]),
    a: match[4] === undefined ? 1 : Number(match[4]),
  }
}

function blendOver(fg: Rgba, bg: Rgba): Rgba {
  const a = fg.a + bg.a * (1 - fg.a)
  if (a === 0) return { r: 0, g: 0, b: 0, a: 0 }
  return {
    r: (fg.r * fg.a + bg.r * bg.a * (1 - fg.a)) / a,
    g: (fg.g * fg.a + bg.g * bg.a * (1 - fg.a)) / a,
    b: (fg.b * fg.a + bg.b * bg.a * (1 - fg.a)) / a,
    a,
  }
}

function relativeLuminance({ r, g, b }: Rgba): number {
  const channel = (v: number) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function contrastRatio(fg: Rgba, bg: Rgba): number {
  const l1 = relativeLuminance(fg)
  const l2 = relativeLuminance(bg)
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
}

function compositeBg(layers: string[], theme: 'light' | 'dark'): Rgba {
  let bg: Rgba =
    theme === 'light'
      ? { r: 245, g: 245, b: 247, a: 1 }
      : { r: 8, g: 8, b: 11, a: 1 }
  for (const raw of [...layers].reverse()) {
    bg = blendOver(parseRgba(raw), bg)
  }
  return bg
}

test('meets WCAG AA >= 4.5:1 contrast for goals, copy, primary buttons, and booked slots in light & dark themes (#158)', async ({
  browser,
}, testInfo) => {
  const width = testInfo.project.use.viewport?.width ?? 1440
  const viewport = { width, height: 900 }

  for (const theme of ['light', 'dark'] as const) {
    const ctx = await browser.newContext({ viewport, locale: 'ru-RU', colorScheme: theme })
    try {
      const page = await ctx.newPage()
      await page.goto('/')
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme)

      const measure = async (selector: string) =>
        page.evaluate(sel => {
          const el = document.querySelector<HTMLElement>(sel)
          if (!el) return null
          const layers: string[] = []
          let cur: HTMLElement | null = el
          while (cur) {
            const bg = getComputedStyle(cur).backgroundColor
            if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') layers.push(bg)
            cur = cur.parentElement
          }
          const cs = getComputedStyle(el)
          return { color: cs.color, bgLayers: layers, outlineColor: cs.outlineColor, outlineStyle: cs.outlineStyle }
        }, selector)

      for (const selector of ['form button[type="submit"]', '.header-link-btn', '.gcore-pill', '.gcore-hero__cta']) {
        const sample = await measure(selector)
        expect(sample, `missing ${selector} in ${theme}`).not.toBeNull()
        const bg = compositeBg(sample!.bgLayers, theme)
        const fg = blendOver(parseRgba(sample!.color), bg)
        expect(contrastRatio(fg, bg), `${selector} contrast in ${theme} @ ${width}px`).toBeGreaterThanOrEqual(4.5)
      }

      // Check focus-visible outline on header button via keyboard Tab
      await page.locator('.header-link-btn').focus()
      const headerFocus = await page.evaluate(() => {
        const header = document.querySelector<HTMLElement>('.header-inner')
        const btn = document.querySelector<HTMLElement>('.header-link-btn')
        return {
          headerBg: header ? getComputedStyle(header).backgroundColor : '',
          outlineColor: btn ? getComputedStyle(btn).outlineColor : '',
        }
      })
      const headerBg = compositeBg([headerFocus.headerBg], theme)
      const headerOutline = blendOver(parseRgba(headerFocus.outlineColor), headerBg)
      expect(contrastRatio(headerOutline, headerBg), `header focus outline in ${theme}`).toBeGreaterThanOrEqual(3.0)

      // Submit profile and expand first match card
      await page.locator('select[name="goal"]').selectOption('find_job')
      await page.locator('input[name="role"]').fill('Backend-разработчик')
      await page.locator('input[name="experience"]').fill('1')
      await page.locator('input[name="skills"]').fill('Python, FastAPI')
      await page.locator('input[name="interests"]').fill('API')
      await page.locator('textarea[name="about"]').fill('Ищу работу в backend-команде.')
      await page.locator('form button[type="submit"]').click()

      await page.locator('.result-card .row-toggle').first().click()
      await page.locator('.icebreaker .text-button').first().click()
      await page.locator('.meeting-slot-btn').first().click()

      for (const selector of [
        '.result-card .goal-label',
        '.icebreaker .text-button',
        '.copy-status',
        '.meeting-picker__tz',
        '.meeting-slot-btn--booked',
        '.nav-count',
        '.booth-demo-badge',
      ]) {
        const sample = await measure(selector)
        expect(sample, `missing ${selector} in ${theme}`).not.toBeNull()
        const bg = compositeBg(sample!.bgLayers, theme)
        const fg = blendOver(parseRgba(sample!.color), bg)
        expect(contrastRatio(fg, bg), `${selector} contrast in ${theme} @ ${width}px`).toBeGreaterThanOrEqual(4.5)
      }

      await page.locator('.workspace-nav button').nth(2).click()
      const schedSample = await measure('.schedule-panel__meta strong')
      expect(schedSample).not.toBeNull()
      const schedBg = compositeBg(schedSample!.bgLayers, theme)
      const schedFg = blendOver(parseRgba(schedSample!.color), schedBg)
      expect(contrastRatio(schedFg, schedBg), `schedule time contrast in ${theme}`).toBeGreaterThanOrEqual(4.5)
    } finally {
      await ctx.close()
    }
  }
})
