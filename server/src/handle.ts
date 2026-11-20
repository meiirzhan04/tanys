/** Public handles: 3–32 of a-z, 0-9, "_" or "-". Input may start with "@" and use any case. */
export const HANDLE_PATTERN = /^[a-z0-9_-]{3,32}$/

const RESERVED = new Set([
  'admin', 'administrator', 'api', 'help', 'me', 'moderator', 'null', 'organizer', 'root',
  'support', 'system', 'tanys', 'undefined', 'security', 'settings',
])

export function normalizeHandleInput(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/^@+/, '').toLowerCase() : ''
}

export function isReservedHandle(handle: string): boolean {
  return RESERVED.has(handle)
}
