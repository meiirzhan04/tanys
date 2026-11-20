import type { Locale } from '../matching/types'

export const LOCALE_STORAGE_KEY = 'tanys.locale.v1'

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export function parseSupportedLocale(value: string | null | undefined): Locale | null {
  if (!value) return null
  const primary = value.trim().toLowerCase().replace(/_/g, '-').split('-')[0]
  if (primary === 'kk' || primary === 'ru' || primary === 'en') {
    return primary
  }
  return null
}

function getDefaultStorage(): StorageLike | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null
  } catch {
    return null
  }
}

function getDefaultLanguages(): readonly string[] {
  if (typeof navigator === 'undefined') return []
  if (Array.isArray(navigator.languages) && navigator.languages.length > 0) {
    return navigator.languages
  }
  return navigator.language ? [navigator.language] : []
}

export function loadSavedLocale(storage?: StorageLike | null): Locale | null {
  const target = storage === undefined ? getDefaultStorage() : storage
  if (!target) return null
  try {
    return parseSupportedLocale(target.getItem(LOCALE_STORAGE_KEY))
  } catch {
    return null
  }
}

export function saveLocalePreference(locale: Locale, storage?: StorageLike | null): void {
  const target = storage === undefined ? getDefaultStorage() : storage
  if (!target) return
  try {
    target.setItem(LOCALE_STORAGE_KEY, locale)
  } catch {
    // Ignore storage quota or disabled storage errors.
  }
}

export function resolveInitialLocale(options?: {
  storage?: StorageLike | null
  languages?: readonly string[]
}): Locale {
  const saved = loadSavedLocale(options?.storage)
  if (saved) return saved

  const browserLanguages = options?.languages ?? getDefaultLanguages()
  for (const tag of browserLanguages) {
    const matched = parseSupportedLocale(tag)
    if (matched) return matched
  }

  return 'ru'
}
