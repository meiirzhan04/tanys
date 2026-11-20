export type Theme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'tanys.theme.v3'

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export interface MediaQueryListLike {
  readonly matches: boolean
  addEventListener?: (type: 'change', listener: () => void) => void
  removeEventListener?: (type: 'change', listener: () => void) => void
  addListener?: (listener: () => void) => void
  removeListener?: (listener: () => void) => void
}

export type MatchMediaFn = (query: string) => MediaQueryListLike

export function parseTheme(value: string | null | undefined): Theme | null {
  if (!value) return null
  const normalized = value.trim().toLowerCase()
  if (normalized === 'light' || normalized === 'dark') {
    return normalized
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

function getDefaultMatchMedia(): MatchMediaFn | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return null
  }
  return query => window.matchMedia(query)
}

export function loadSavedTheme(storage?: StorageLike | null): Theme | null {
  const target = storage === undefined ? getDefaultStorage() : storage
  if (!target) return null
  try {
    return parseTheme(target.getItem(THEME_STORAGE_KEY))
  } catch {
    return null
  }
}

export function saveThemePreference(theme: Theme, storage?: StorageLike | null): void {
  const target = storage === undefined ? getDefaultStorage() : storage
  if (!target) return
  try {
    target.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Ignore storage quota or disabled storage errors.
  }
}

export function detectSystemTheme(matchMedia?: MatchMediaFn | null): Theme {
  const queryFn = matchMedia === undefined ? getDefaultMatchMedia() : matchMedia
  if (!queryFn) return 'dark'
  try {
    if (queryFn('(prefers-color-scheme: light)').matches) return 'light'
    if (queryFn('(prefers-color-scheme: dark)').matches) return 'dark'
  } catch {
    // Ignore restricted matchMedia environments.
  }
  return 'dark'
}

export function resolveInitialTheme(options?: {
  storage?: StorageLike | null
  matchMedia?: MatchMediaFn | null
}): Theme {
  const saved = loadSavedTheme(options?.storage)
  if (saved) return saved
  return detectSystemTheme(options?.matchMedia)
}

export function subscribeSystemTheme(
  onSystemThemeChange: (theme: Theme) => void,
  options?: {
    storage?: StorageLike | null
    matchMedia?: MatchMediaFn | null
  },
): () => void {
  const queryFn = options?.matchMedia === undefined ? getDefaultMatchMedia() : options.matchMedia
  if (!queryFn) return () => {}
  const media = queryFn('(prefers-color-scheme: light)')
  const listener = () => {
    if (loadSavedTheme(options?.storage)) return
    onSystemThemeChange(media.matches ? 'light' : 'dark')
  }
  if (typeof media.addEventListener === 'function') {
    media.addEventListener('change', listener)
    return () => media.removeEventListener?.('change', listener)
  }
  if (typeof media.addListener === 'function') {
    media.addListener(listener)
    return () => media.removeListener?.(listener)
  }
  return () => {}
}
