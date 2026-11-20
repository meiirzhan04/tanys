export const PENDING_INVITE_STORAGE_KEY = 'tanys.pendingInvite.v1'

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

export function isAccountRoute(pathname: string, search: string): boolean {
  if (parseInviteLocation(pathname, search)) return true
  if (/^\/(login|account|events)\/?$/.test(pathname)) return true
  const params = new URLSearchParams(search)
  return params.get('mode') === 'account'
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
