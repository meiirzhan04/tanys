import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  LOCALE_STORAGE_KEY,
  parseSupportedLocale,
  resolveInitialLocale,
  saveLocalePreference,
} from './localeStorage.ts'

describe('localeStorage', () => {
  it('parses kk-KZ, en-US, ru-RU tags and rejects unsupported languages', () => {
    assert.equal(parseSupportedLocale('kk-KZ'), 'kk')
    assert.equal(parseSupportedLocale('kk'), 'kk')
    assert.equal(parseSupportedLocale('en-US'), 'en')
    assert.equal(parseSupportedLocale('en_GB'), 'en')
    assert.equal(parseSupportedLocale('ru-RU'), 'ru')
    assert.equal(parseSupportedLocale('de-DE'), null)
    assert.equal(parseSupportedLocale(''), null)
  })

  it('prefers saved manual selection over browser languages, then first supported browser language, then ru', () => {
    const map = new Map<string, string>()
    const storage = {
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, value: string) => { map.set(key, value) },
    }

    assert.equal(resolveInitialLocale({ storage, languages: ['fr-FR', 'kk-KZ', 'en-US'] }), 'kk')
    assert.equal(resolveInitialLocale({ storage, languages: ['en-US', 'ru-RU'] }), 'en')
    assert.equal(resolveInitialLocale({ storage, languages: ['de-DE', 'ja-JP'] }), 'ru')

    saveLocalePreference('en', storage)
    assert.equal(map.get(LOCALE_STORAGE_KEY), 'en')
    assert.equal(resolveInitialLocale({ storage, languages: ['kk-KZ'] }), 'en')
  })

  it('works safely when storage throws SecurityError or is unavailable', () => {
    const throwingStorage = {
      getItem() { throw new Error('SecurityError') },
      setItem() { throw new Error('SecurityError') },
    }

    assert.equal(resolveInitialLocale({ storage: throwingStorage, languages: ['kk-KZ'] }), 'kk')
    assert.doesNotThrow(() => saveLocalePreference('en', throwingStorage))
    assert.equal(resolveInitialLocale({ storage: null, languages: [] }), 'ru')
  })
})
