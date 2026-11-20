import { test, expect } from '@playwright/test'

test('участник получает рекомендации, оценивает карточку и отменяет встречу', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Роль', { exact: true }).fill('Backend-разработчик')
  await page.getByLabel('Цель знакомства').selectOption('find_job')
  await page.getByLabel('Опыт в годах').fill('0')
  await page.getByLabel('Стек и навыки').fill('Python, FastAPI')
  await page.getByLabel('Интересы', { exact: true }).fill('API')
  await page.getByLabel('О себе').fill('Ищу стажировку в команде backend-разработки.')
  await page.getByRole('button', { name: 'Найти участников' }).click()

  const cards = page.locator('section[aria-labelledby="results-title"]').getByRole('article')
  await expect(cards).toHaveCount(5)
  const names = await cards.getByRole('heading').allTextContents()
  expect(new Set(names).size).toBe(5)
  const first = cards.first()
  await expect(first.locator('.explanation')).toHaveText(/\S/)
  await first.getByRole('button', { name: 'Подробнее' }).click()
  await expect(first.getByText('Первая фраза')).toBeVisible()
  await first.getByRole('button', { name: 'Не подошло' }).click()
  await expect(page.getByRole('heading', { name: names[0], exact: true })).toHaveCount(0)
  await expect(cards).toHaveCount(5)

  const next = cards.first()
  const name = await next.getByRole('heading').innerText()
  await next.getByRole('button', { name: 'Подробнее' }).click()
  const slot = next.getByTitle(/^Выбрать /).first()
  const time = await slot.innerText()
  await slot.click()
  await page.getByRole('button', { name: /^Встречи\s+1$/ }).click()
  const booking = page.getByRole('listitem').filter({ hasText: name })
  await expect(booking).toContainText(time)
  await booking.getByRole('button', { name: 'Отменить' }).click()
  await expect(page.getByText(/Пока нет запланированных встреч/)).toBeVisible()
  await expect(page.getByRole('button', { name: /^Встречи\s+0$/ })).toBeVisible()
})

test('separates form action goal labels from candidate intent labels in ru/kk/en and preserves selected goal (#166)', async ({
  page,
}) => {
  await page.goto('/')
  const goalSelect = page.locator('select[name="goal"]')
  await expect(goalSelect.locator('option[value="hire"]')).toHaveText('Нанять')

  await goalSelect.selectOption('find_job')
  await page.locator('input[name="role"]').fill('Backend-разработчик')
  await page.locator('input[name="experience"]').fill('1')
  await page.locator('input[name="skills"]').fill('Python, FastAPI')
  await page.locator('input[name="interests"]').fill('API')
  await page.locator('textarea[name="about"]').fill('Ищу работу в backend-команде.')
  await page.locator('form button[type="submit"]').click()

  const firstGoalBadge = page.locator('section[aria-labelledby="results-title"] .result-card .goal-label').first()
  await expect(firstGoalBadge).toHaveText('Нанимает')
  // The first phrase is visible on every card without opening the details.
  const firstCard = page.locator('section[aria-labelledby="results-title"] .result-card').first()
  await expect(firstCard.locator('.row-toggle')).toHaveAttribute('aria-expanded', 'false')
  await expect(firstCard.locator('> .icebreaker p')).toBeVisible()
  await expect(firstCard.locator('> .icebreaker p')).toContainText('?')

  await page.locator('.lang-switcher button[lang="kk"]').click()
  await expect(firstGoalBadge).toHaveText('Маман жалдайды')

  await page.locator('.lang-switcher button[lang="en"]').click()
  await expect(firstGoalBadge).toHaveText('Hiring')

  await page.getByRole('button', { name: 'Edit profile' }).click()
  await expect(goalSelect).toHaveValue('find_job')
  await expect(goalSelect.locator('option[value="hire"]')).toHaveText('Hire')
})
