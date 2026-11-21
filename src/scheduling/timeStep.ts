/** Event and availability times use 15-minute steps (:00, :15, :30, :45). */
export const QUARTER_HOUR_MS = 15 * 60 * 1000

const pad = (value: number) => String(value).padStart(2, '0')

/** All selectable wall-clock times of a day: 00:00, 00:15 … 23:45. */
export const QUARTER_HOUR_TIMES: readonly string[] = Array.from({ length: 96 }, (_, index) =>
  `${pad(Math.floor(index / 4))}:${pad((index % 4) * 15)}`,
)

export function isQuarterHourTime(value: string): boolean {
  return QUARTER_HOUR_TIMES.includes(value)
}

/** Every real UTC offset is a multiple of 15 minutes, so the UTC instant decides the local step too. */
export function isQuarterHourInstant(value: string | Date): boolean {
  const time = typeof value === 'string' ? Date.parse(value) : +value
  return Number.isFinite(time) && time % QUARTER_HOUR_MS === 0
}

export function roundUpToQuarterHour(date: Date): Date {
  return new Date(Math.ceil(+date / QUARTER_HOUR_MS) * QUARTER_HOUR_MS)
}

/** Splits an instant into local `YYYY-MM-DD` and `HH:MM` parts for date and time controls. */
export function toLocalParts(value: string | Date | undefined): { date: string; time: string } {
  const date = value === undefined ? new Date(NaN) : new Date(value)
  if (!Number.isFinite(+date)) return { date: '', time: '' }
  return {
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  }
}

/** Joins local date and time parts back into a Date (NaN when incomplete). */
export function fromLocalParts(date: string, time: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && /^\d{2}:\d{2}$/.test(time) ? new Date(`${date}T${time}`) : new Date(NaN)
}

const zonedFormats = new Map<string, Intl.DateTimeFormat>()

function zonedFormat(zone: string): Intl.DateTimeFormat {
  let format = zonedFormats.get(zone)
  if (!format) {
    format = new Intl.DateTimeFormat('en-US', {
      timeZone: zone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    })
    zonedFormats.set(zone, format)
  }
  return format
}

/** The wall clock of `instant` in `zone`, read back as if it were UTC (milliseconds). */
function wallClockAsUtc(instant: number, zone: string): number {
  const parts = Object.fromEntries(zonedFormat(zone).formatToParts(new Date(instant)).map(part => [part.type, part.value]))
  return Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute)
}

/** Splits an instant into `YYYY-MM-DD` and `HH:MM` as shown by a clock in the event time zone. */
export function toZonedParts(value: string | Date | undefined, zone: string): { date: string; time: string } {
  const instant = value === undefined ? NaN : +new Date(value)
  if (!Number.isFinite(instant)) return { date: '', time: '' }
  const wall = new Date(wallClockAsUtc(instant, zone))
  return {
    date: `${wall.getUTCFullYear()}-${pad(wall.getUTCMonth() + 1)}-${pad(wall.getUTCDate())}`,
    time: `${pad(wall.getUTCHours())}:${pad(wall.getUTCMinutes())}`,
  }
}

/**
 * The instant at which a clock in `zone` shows `date` `time` (NaN when incomplete). Resolves the offset in two passes
 * so daylight-saving changes and offsets such as +5:30 or +5:45 are exact; a skipped spring-forward time moves later.
 */
export function fromZonedParts(date: string, time: string, zone: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return new Date(NaN)
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  const target = Date.UTC(year, month - 1, day, hour, minute)
  const first = target - (wallClockAsUtc(target, zone) - target)
  const second = target - (wallClockAsUtc(first, zone) - first)
  return new Date(wallClockAsUtc(second, zone) === target ? second : Math.max(first, second))
}
