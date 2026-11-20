const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/
const TELEGRAM_HANDLE = /^@([a-zA-Z][a-zA-Z0-9_]{3,31})$/
const TELEGRAM_URL = /^(?:https?:\/\/)?(?:t\.me|telegram\.me)\/([a-zA-Z][a-zA-Z0-9_]{3,31})\/?$/

/**
 * Turns a shared contact into a safe link: https URLs, e-mail (mailto) and Telegram (@name, t.me/name).
 * Anything else — phone numbers, other schemes, free text — is shown as plain text (returns null).
 */
export function contactHref(value: string): string | null {
  const trimmed = value.trim()
  const telegram = TELEGRAM_HANDLE.exec(trimmed) ?? TELEGRAM_URL.exec(trimmed)
  if (telegram) return `https://t.me/${telegram[1]}`
  if (EMAIL.test(trimmed)) return `mailto:${trimmed}`
  try {
    const url = new URL(trimmed)
    return url.protocol === 'https:' ? url.href : null
  } catch {
    return null
  }
}

/** Two-letter initials for avatars, from a name or @handle. */
export function initialsOf(name: string | null | undefined, handle?: string | null): string {
  const source = (name?.trim() || handle?.trim() || '?').replace(/^@/, '')
  const parts = source.split(/\s+/).filter(Boolean)
  const letters = parts.length > 1 ? [parts[0], parts[1]] : [source]
  return letters.map(part => Array.from(part)[0]?.toUpperCase() ?? '').join('').slice(0, 2) || '?'
}
