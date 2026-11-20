import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  detectSystemTheme,
  loadSavedTheme,
  parseTheme,
  resolveInitialTheme,
  saveThemePreference,
  subscribeSystemTheme,
  THEME_STORAGE_KEY,
} from './themeStorage.ts'
import type { MediaQueryListLike } from './themeStorage.ts'

function createMemoryStorage() {
  const map = new Map<string, string>()
  return {
    map,
    storage: {
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, value: string) => {
        map.set(key, value)
      },
    },
  }
}

function createMatchMedia(initialLight: boolean) {
  let isLight = initialLight
  const listeners = new Set<() => void>()
  const matchMedia = (query: string): MediaQueryListLike => ({
    get matches() {
      if (query.includes('light')) return isLight
      if (query.includes('dark')) return !isLight
      return false
    },
    addEventListener: (_type, listener) => {
      listeners.add(listener)
    },
    removeEventListener: (_type, listener) => {
      listeners.delete(listener)
    },
  })
  return {
    matchMedia,
    setSystemLight(next: boolean) {
      isLight = next
      for (const listener of listeners) listener()
    },
  }
}

describe('themeStorage (#165)', () => {
  it('parses light/dark tokens and rejects unknown values', () => {
    assert.equal(parseTheme('light'), 'light')
    assert.equal(parseTheme(' DARK '), 'dark')
    assert.equal(parseTheme('system'), null)
    assert.equal(parseTheme(''), null)
    assert.equal(parseTheme(null), null)
  })

  it('uses prefers-color-scheme on first visit and prefers manual saved override', () => {
    const { map, storage } = createMemoryStorage()
    const lightEnv = createMatchMedia(true)
    const darkEnv = createMatchMedia(false)

    assert.equal(detectSystemTheme(lightEnv.matchMedia), 'light')
    assert.equal(detectSystemTheme(darkEnv.matchMedia), 'dark')
    assert.equal(resolveInitialTheme({ storage, matchMedia: lightEnv.matchMedia }), 'light')
    assert.equal(resolveInitialTheme({ storage, matchMedia: darkEnv.matchMedia }), 'dark')

    saveThemePreference('dark', storage)
    assert.equal(map.get(THEME_STORAGE_KEY), 'dark')
    assert.equal(loadSavedTheme(storage), 'dark')
    assert.equal(resolveInitialTheme({ storage, matchMedia: lightEnv.matchMedia }), 'dark')

    saveThemePreference('light', storage)
    assert.equal(resolveInitialTheme({ storage, matchMedia: darkEnv.matchMedia }), 'light')
  })

  it('reacts to system scheme changes only when no manual preference is stored', () => {
    const { storage } = createMemoryStorage()
    const env = createMatchMedia(false)
    const received: string[] = []
    const unsubscribe = subscribeSystemTheme(theme => received.push(theme), {
      storage,
      matchMedia: env.matchMedia,
    })

    env.setSystemLight(true)
    env.setSystemLight(false)
    assert.deepEqual(received, ['light', 'dark'])

    saveThemePreference('light', storage)
    env.setSystemLight(true)
    env.setSystemLight(false)
    assert.deepEqual(received, ['light', 'dark'])

    unsubscribe()
  })

  it('degrades safely when storage throws SecurityError or matchMedia is unavailable', () => {
    const throwingStorage = {
      getItem() {
        throw new Error('SecurityError')
      },
      setItem() {
        throw new Error('SecurityError')
      },
    }
    const lightEnv = createMatchMedia(true)

    assert.equal(resolveInitialTheme({ storage: throwingStorage, matchMedia: lightEnv.matchMedia }), 'light')
    assert.doesNotThrow(() => saveThemePreference('dark', throwingStorage))
    assert.equal(resolveInitialTheme({ storage: null, matchMedia: null }), 'dark')
  })
})
