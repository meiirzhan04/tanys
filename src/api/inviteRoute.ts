export const PENDING_INVITE_STORAGE_KEY = 'tanys.pendingInvite.v1'
export const ACCOUNT_MODE_STORAGE_KEY = 'tanys.accountMode.v1'

export interface InviteTarget {
  eventId: string
  token?: string
}

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/**
 * Extracts invite / event routing info from URL pathname and query string.
 * Supported forms:
 * - /invite/:eventId/:token
 * - /events/:eventId?invite=:token (or ?token=:token)
 * - /?event=:eventId&token=:token
 * - /?event=:eventId&invite=:token
 */
export function parseInviteLocation(pathname: string, search: string): InviteTarget | null {
  const params = new URLSearchParams(search)
  const queryToken = (params.get('invite') ?? params.get('token') ?? '').trim() || undefined
  const queryEvent = (params.get('event') ?? '').trim()

  const inviteMatch = pathname.match(/^\/invite\/([^/]+)(?:\/([^/]+))?\/?$/)
  if (inviteMatch) {
    const eventId = decodeURIComponent(inviteMatch[1]).trim()
    const pathToken = inviteMatch[2] ? decodeURIComponent(inviteMatch[2]).trim() : undefined
    if (eventId) {
      return { eventId, ...(pathToken || queryToken ? { token: pathToken ?? queryToken } : {}) }
    }
  }

  const eventMatch = pathname.match(/^\/events\/([^/]+)\/?$/)
  if (eventMatch) {
    const eventId = decodeURIComponent(eventMatch[1]).trim()
    if (eventId) {
      return { eventId, ...(queryToken ? { token: queryToken } : {}) }
    }
  }

  if (queryEvent) {
    return { eventId: queryEvent, ...(queryToken ? { token: queryToken } : {}) }
  }

  return null
}

export function isAccountRoute(pathname: string, search: string, storage?: StorageLike | null): boolean {
  if (parseInviteLocation(pathname, search)) return true
  if (/^\/(login|account|events)\/?$/.test(pathname)) return true
  const params = new URLSearchParams(search)
  if (params.get('mode') === 'account') return true
  return storage === null ? false : loadAccountModePreference(storage)
}

export function loadAccountModePreference(storage?: StorageLike | null): boolean {
  const target = storage === undefined ? (typeof sessionStorage !== 'undefined' ? sessionStorage : null) : storage
  if (!target) return false
  try {
    return target.getItem(ACCOUNT_MODE_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function saveAccountModePreference(enabled: boolean, storage?: StorageLike | null): void {
  const target = storage === undefined ? (typeof sessionStorage !== 'undefined' ? sessionStorage : null) : storage
  if (!target) return
  try {
    if (enabled) {
      target.setItem(ACCOUNT_MODE_STORAGE_KEY, '1')
    } else {
      target.removeItem(ACCOUNT_MODE_STORAGE_KEY)
    }
  } catch {
    // Ignore storage quota or private mode restrictions.
  }
}

export function syncAccountLocationUrl(enabled: boolean): void {
  if (typeof window === 'undefined' || !window.history?.replaceState) return
  try {
    const url = new URL(window.location.href)
    if (enabled) {
      if (isAccountRoute(url.pathname, url.search, null)) return
      url.searchParams.set('mode', 'account')
    } else {
      if (/^\/(login|account)\/?$/.test(url.pathname)) {
        url.pathname = '/'
      }
      if (url.searchParams.get('mode') === 'account') {
        url.searchParams.delete('mode')
      }
    }
    const nextUrl = `${url.pathname}${url.search}${url.hash}`
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`
    if (nextUrl !== currentUrl) {
      window.history.replaceState(null, '', nextUrl)
    }
  } catch {
    // Ignore restricted history state environments.
  }
}

export function loadPendingInvite(storage?: StorageLike | null): InviteTarget | null {
  const target = storage ?? (typeof sessionStorage !== 'undefined' ? sessionStorage : null)
  if (!target) return null
  try {
    const raw = target.getItem(PENDING_INVITE_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<InviteTarget>
    if (typeof parsed.eventId !== 'string' || !parsed.eventId.trim()) return null
    return {
      eventId: parsed.eventId.trim(),
      ...(typeof parsed.token === 'string' && parsed.token.trim() ? { token: parsed.token.trim() } : {}),
    }
  } catch {
    return null
  }
}

export function savePendingInvite(invite: InviteTarget | null, storage?: StorageLike | null): void {
  const target = storage ?? (typeof sessionStorage !== 'undefined' ? sessionStorage : null)
  if (!target) return
  try {
    if (!invite) {
      target.removeItem(PENDING_INVITE_STORAGE_KEY)
      return
    }
    target.setItem(PENDING_INVITE_STORAGE_KEY, JSON.stringify(invite))
  } catch {
    // Ignore storage quota or private mode restrictions.
  }
}
