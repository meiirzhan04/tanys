/** Meeting and event times use a 15-minute grid. Every real UTC offset is a multiple of 15 minutes,
 * so checking the UTC instant is the same as checking the local wall-clock minutes. */
export const QUARTER_HOUR_MS = 15 * 60 * 1000

export function isQuarterHour(date: Date): boolean {
  return Number.isFinite(+date) && +date % QUARTER_HOUR_MS === 0
}
