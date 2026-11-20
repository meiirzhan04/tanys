import { useId, useRef, useState } from 'react'
import type { Locale } from '../matching/types'

const labels = {
  ru: ['Выберите дату', 'Предыдущий месяц', 'Следующий месяц', 'Закрыть'],
  kk: ['Күнді таңдаңыз', 'Алдыңғы ай', 'Келесі ай', 'Жабу'],
  en: ['Choose a date', 'Previous month', 'Next month', 'Close'],
} as const

function calendarDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function AvailabilityDatePicker({ label, locale, value, min, max, disabled, onChange }: {
  label: string
  locale: Locale
  value: string
  min?: string
  max?: string
  disabled?: boolean
  onChange: (date: string) => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const labelId = useId()
  const titleId = useId()
  const [month, setMonth] = useState(() => new Date())
  const [placeholder, previous, next, close] = labels[locale]
  const year = month.getFullYear()
  const index = month.getMonth()
  const offset = (new Date(year, index, 1).getDay() + 6) % 7
  const days = new Date(year, index + 1, 0).getDate()
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'short' })
  const fullDate = new Intl.DateTimeFormat(locale, { dateStyle: 'full' })
  const displayDate = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' })

  function open() {
    const today = calendarDate(new Date())
    const initial = value || (min && today < min ? min : max && today > max ? max : today)
    const date = new Date(`${initial}T12:00:00`)
    setMonth(new Date(date.getFullYear(), date.getMonth(), 1))
    dialog.current?.showModal()
  }

  return (
    <div className="field">
      <span id={labelId}>{label}</span>
      <button type="button" className="availability-date-trigger" aria-haspopup="dialog"
        aria-labelledby={`${labelId} ${labelId}-value`} disabled={disabled} onClick={open}>
        <span id={`${labelId}-value`}>{value ? displayDate.format(new Date(`${value}T12:00:00`)) : placeholder}</span>
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
          <rect x="3" y="5" width="18" height="16" rx="3" />
          <path d="M3 10h18M8 3v4m8-4v4" />
        </svg>
      </button>
      <dialog ref={dialog} className="availability-calendar" aria-labelledby={titleId}>
        <div className="availability-calendar__heading">
          <button type="button" aria-label={previous} disabled={!!min && calendarDate(new Date(year, index, 1)) <= min}
            onClick={() => setMonth(new Date(year, index - 1, 1))}>‹</button>
          <h3 id={titleId} aria-live="polite">{new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(month)}</h3>
          <button type="button" aria-label={next} disabled={!!max && calendarDate(new Date(year, index, days)) >= max}
            onClick={() => setMonth(new Date(year, index + 1, 1))}>›</button>
        </div>
        <div className="availability-calendar__days">
          {Array.from({ length: 7 }, (_, day) => <span key={day} aria-hidden="true">{weekday.format(new Date(2026, 0, 5 + day))}</span>)}
          {Array.from({ length: days }, (_, i) => {
            const day = i + 1
            const date = new Date(year, index, day, 12)
            const key = calendarDate(date)
            return (
              <button key={key} type="button" style={day === 1 ? { gridColumnStart: offset + 1 } : undefined}
                aria-label={fullDate.format(date)} aria-pressed={key === value}
                disabled={Boolean((min && key < min) || (max && key > max))}
                onClick={() => { onChange(key); dialog.current?.close() }}
              >{day}</button>
            )
          })}
        </div>
        <button type="button" className="secondary-button availability-calendar__close" onClick={() => dialog.current?.close()}>
          {close}
        </button>
      </dialog>
    </div>
  )
}
