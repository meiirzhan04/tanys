import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getMessages, messagesByLocale, SUPPORTED_LOCALES } from './messages.ts'
import type { Goal } from '../matching/types'

const ALL_GOALS: readonly Goal[] = [
  'find_job',
  'hire',
  'find_mentor',
  'be_mentor',
  'find_cofounder',
  'exchange_experience',
]

test('provides complete, distinct translations for ru, kk, and en', () => {
  assert.deepEqual(SUPPORTED_LOCALES.map(item => item.code), ['kk', 'ru', 'en'])

  for (const { code } of SUPPORTED_LOCALES) {
    const messages = getMessages(code)
    assert.ok(messages.languageSwitcherLabel.trim())
    assert.ok(messages.form.title.trim())
    assert.ok(messages.form.submit.trim())
    assert.ok(messages.results.emptyTitle.trim())
    assert.ok(messages.results.emptyBody.trim())

    for (const goal of ALL_GOALS) {
      assert.ok(messages.goals[goal].trim(), `missing goal label ${goal} for ${code}`)
    }

    for (const [field, errorText] of Object.entries(messages.form.errors)) {
      assert.ok(errorText.trim(), `missing validation error ${field} for ${code}`)
    }

    assert.ok(messages.account.signInTitle.trim())
    assert.ok(messages.account.visibilityNotice.trim())
    assert.ok(messages.account.consentLabel.trim())
    assert.ok(messages.account.expiredTitle.trim())
    for (const [field, errorText] of Object.entries(messages.account.errors)) {
      assert.ok(errorText.trim(), `missing account error ${field} for ${code}`)
    }
  }

  assert.notEqual(messagesByLocale.ru.form.title, messagesByLocale.kk.form.title)
  assert.notEqual(messagesByLocale.ru.form.title, messagesByLocale.en.form.title)
  assert.notEqual(messagesByLocale.kk.form.title, messagesByLocale.en.form.title)
})
