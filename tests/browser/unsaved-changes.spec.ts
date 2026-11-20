import { expect, test } from '@playwright/test'

test('warns on unsaved edits to saved event profile, supports stay/discard/Escape/kk/ru/en, and clears after save or revert (#95)', async ({
  browser,
}, testInfo) => {
  const viewport = testInfo.project.use.viewport ?? { width: 1280, height: 860 }
  const context = await browser.newContext({ viewport, locale: 'ru-RU' })

  let failNextSave = true
  const profiles: Record<string, Record<string, unknown>> = {
    'evt-1': {
      name: 'Алия',
      role: 'Backend-разработчик',
      skills: ['Python', 'FastAPI'],
      experienceYears: 2,
      interests: ['API'],
      about: 'Ищу команду.',
      goal: 'find_job',
      visible: true,
      consentVersion: 'v1',
    },
    'evt-2': {
      name: 'Алия',
      role: 'Go Engineer',
      skills: ['Go'],
      experienceYears: 2,
      interests: ['Cloud'],
      about: 'Второе событие.',
      goal: 'exchange_experience',
      visible: true,
      consentVersion: 'v1',
    },
  }

  await context.route('**/api/v1/**', async route => {
    const req = route.request()
    const path = new URL(req.url()).pathname.replace(/^\/api\/v1/, '')
    const method = req.method()
    const respond = (status: number, data?: unknown) =>
      route.fulfill({ status, contentType: 'application/json', body: status === 204 ? '' : JSON.stringify(data ?? {}) })

    if (method === 'GET' && path === '/me') return respond(200, { id: 'user-1' })
    if (method === 'GET' && path === '/events') {
      return respond(200, {
        items: [
          { id: 'evt-1', name: 'Almaty Meetup', role: 'participant', status: 'active', timeZone: 'Asia/Almaty' },
          { id: 'evt-2', name: 'Astana Conf', role: 'participant', status: 'active', timeZone: 'Asia/Almaty' },
        ],
        nextCursor: null,
      })
    }
    if (method === 'GET' && (path === '/events/evt-1' || path === '/events/evt-2')) {
      const id = path.endsWith('evt-1') ? 'evt-1' : 'evt-2'
      return respond(200, { id, name: id === 'evt-1' ? 'Almaty Meetup' : 'Astana Conf', status: 'active', timeZone: 'Asia/Almaty' })
    }
    const profMatch = path.match(/^\/events\/(evt-[12])\/profile$/)
    if (profMatch && method === 'GET') {
      return respond(200, profiles[profMatch[1]])
    }
    if (profMatch && method === 'PUT') {
      if (failNextSave) {
        failNextSave = false
        return respond(500, { error: { code: 'internal_error', message: 'Save failed' } })
      }
      profiles[profMatch[1]] = JSON.parse(req.postData() || '{}')
      return respond(200, profiles[profMatch[1]])
    }
    if (method === 'GET' && (path.endsWith('/recommendations') || path.endsWith('/introductions') || path.endsWith('/meetings') || path.endsWith('/booths'))) {
      return respond(200, { items: [], nextCursor: null })
    }
    return respond(404, { error: { code: 'not_found' } })
  })

  try {
    const page = await context.newPage()
    await page.goto('/?mode=account')
    await expect(page.locator('#event-profile-title')).toBeVisible()
    await expect(page.locator('input[name="role"]')).toHaveValue('Backend-разработчик')

    // 1. Simple viewing (no edits): switching tabs shows NO warning dialog
    await page.locator('.workspace-nav button').nth(2).click()
    await expect(page.getByRole('alertdialog')).toHaveCount(0)
    await expect(page.locator('#introductions-title')).toBeVisible()

    // Return to profile
    await page.locator('.workspace-nav button').nth(0).click()
    await expect(page.locator('#event-profile-title')).toBeVisible()

    // 2. Edit role -> attempt switching tab -> dialog appears; Escape cancels and preserves edit!
    await page.locator('input[name="role"]').fill('Staff Python Engineer')
    await expect(page.locator('.form-footer')).toContainText('Есть несохранённые изменения')

    // Confirm beforeunload prevents default when dirty
    const dirtyBeforeUnloadCancelled = await page.evaluate(() => {
      const ev = new Event('beforeunload', { cancelable: true })
      window.dispatchEvent(ev)
      return ev.defaultPrevented
    })
    expect(dirtyBeforeUnloadCancelled).toBe(true)

    await page.locator('.workspace-nav button').nth(2).click()
    const dialog = page.getByRole('alertdialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.locator('button', { hasText: 'Остаться' })).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(page.locator('input[name="role"]')).toHaveValue('Staff Python Engineer')

    // 3. Check Kazakh & English dialog labels while dirty
    await page.locator('.lang-switcher button[lang="kk"]').click()
    await page.locator('.workspace-nav button').nth(2).click()
    await expect(page.locator('#unsaved-dialog-title')).toHaveText('Анкетада сақталмаған өзгерістер бар')
    await page.locator('button', { hasText: 'Қалу' }).click()
    await expect(page.locator('input[name="role"]')).toHaveValue('Staff Python Engineer')

    await page.locator('.lang-switcher button[lang="en"]').click()
    await page.locator('.workspace-nav button').nth(2).click()
    await expect(page.locator('#unsaved-dialog-title')).toHaveText('You have unsaved profile changes')
    await page.locator('button', { hasText: 'Stay' }).click()
    await page.locator('.lang-switcher button[lang="ru"]').click()

    // 4. Revert field back to original value -> NO warning when switching tab!
    await page.locator('input[name="role"]').fill('Backend-разработчик')
    await page.locator('.workspace-nav button').nth(2).click()
    await expect(page.getByRole('alertdialog')).toHaveCount(0)
    await expect(page.locator('#introductions-title')).toBeVisible()

    // 5. Edit again -> switch event via <select> -> confirm Discard -> opens Event 2!
    await page.locator('.workspace-nav button').nth(0).click()
    await page.locator('input[name="role"]').fill('Temporary Unsaved Role')
    await page.locator('.event-picker select').selectOption('evt-2')
    await expect(page.getByRole('alertdialog')).toBeVisible()
    await page.locator('button', { hasText: 'Отбросить изменения' }).click()
    await expect(page.locator('input[name="role"]')).toHaveValue('Go Engineer')

    // 6. Edit on Event 2 -> API 500 error preserves typed value -> Retry save succeeds -> no warning after save!
    await page.locator('input[name="role"]').fill('Principal Go Engineer')
    await page.locator('form button[type="submit"]').click()
    await expect(page.locator('.error-banner')).toBeVisible()
    await expect(page.locator('input[name="role"]')).toHaveValue('Principal Go Engineer')

    await page.locator('.error-banner button').click()
    await expect(page.locator('#results-title')).toBeVisible()
    const cleanBeforeUnloadCancelled = await page.evaluate(() => {
      const ev = new Event('beforeunload', { cancelable: true })
      window.dispatchEvent(ev)
      return ev.defaultPrevented
    })
    expect(cleanBeforeUnloadCancelled).toBe(false)
  } finally {
    await context.close()
  }
})
