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
