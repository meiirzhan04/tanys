import type { InterestSummary } from './interestSummary'

const FORMULA_PREFIX = /^[\t\r ]*[=+\-@]|^[\t\r]/

/** Neutralize spreadsheet formula triggers and escape a single RFC 4180 CSV field. */
export function escapeCsvCell(value: string | number): string {
  const raw = String(value)
  const safe = FORMULA_PREFIX.test(raw) ? `'${raw}` : raw
  if (/[",\r\n]/.test(safe)) {
    return `"${safe.replaceAll('"', '""')}"`
  }
  return safe
}

export interface InterestCsvHeaders {
  topic: string
  participants: string
}

/**
 * Serialize aggregated event interests into UTF-8 CSV (with BOM for Excel/Sheets)
 * preserving exact displayed order and including only topic and participant count.
 */
export function serializeInterestMapCsv(
  topics: InterestSummary['topics'],
  headers: InterestCsvHeaders,
): string {
  const lines = [
    `${escapeCsvCell(headers.topic)},${escapeCsvCell(headers.participants)}`,
    ...topics.map(item => `${escapeCsvCell(item.topic)},${escapeCsvCell(item.count)}`),
  ]
  return `\uFEFF${lines.join('\r\n')}\r\n`
}

/** Build a filesystem-safe CSV filename for the active event. */
export function buildInterestCsvFilename(eventName: string, eventId: string): string {
  const slug = eventName
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return `tanys-interests-${slug || eventId}.csv`
}
