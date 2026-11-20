import type { EventMemberItem } from '../api/client'

/** Normalize display names and queries for case-insensitive Unicode/Kazakh matching. */
export function normalizeMemberQuery(value: string): string {
  return value.trim().normalize('NFC').toLowerCase()
}

/** Return the name displayed in the organizer participant table. */
export function getMemberDisplayName(member: EventMemberItem): string {
  const name = member.name?.trim()
  const handle = (member.handle ?? member.username)?.trim()
  return name || handle || member.userId
}

/**
 * Filter permitted event members by partial display name match,
 * ignoring case and surrounding spaces (including Kazakh letters).
 */
export function filterEventMembers(
  members: readonly EventMemberItem[],
  query: string,
): EventMemberItem[] {
  const normalizedQuery = normalizeMemberQuery(query)
  if (!normalizedQuery) return [...members]

  return members.filter(member =>
    normalizeMemberQuery(getMemberDisplayName(member)).includes(normalizedQuery),
  )
}
