import { useEffect, useState } from 'react'
import type { FormEvent, MouseEvent } from 'react'
import type { TanysApiClient } from '../api/client'
import { getMessages } from '../i18n/messages'
import type { Locale } from '../matching/types'
import { formatMeetingInterval } from './socialHelpers'

type Slot = { start: string; end: string }
const minimumDuration = 15 * 60 * 1000

function localDate(value?: string) {
  if (!value) return undefined
  const date = new Date(value)
  if (!Number.isFinite(+date)) return undefined
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function openDatePicker(event: MouseEvent<HTMLInputElement>) {
  try {
    event.currentTarget.showPicker?.()
  } catch {
    // The browser's native date control remains available.
  }
}

const labels = {
  ru: {
    title: 'Моё свободное время',
    startDate: 'Дата начала',
    endDate: 'Дата окончания',
    startTime: 'Время начала',
    endTime: 'Время окончания',
    add: 'Добавить интервал',
    remove: 'Убрать',
    local: 'Ввод в часовом поясе устройства',
    invalid:
      'Укажите свободное время в пределах события, минимум 15 минут. Интервалы не должны пересекаться.',
  },
  kk: {
    title: 'Бос уақытым',
    startDate: 'Басталу күні',
    endDate: 'Аяқталу күні',
    startTime: 'Басталу уақыты',
    endTime: 'Аяқталу уақыты',
    add: 'Аралық қосу',
    remove: 'Алып тастау',
    local: 'Құрылғының уақыт белдеуі',
    invalid: 'Іс-шара шегінде кемінде 15 минут таңдаңыз. Аралықтар қабаттаспауы керек.',
  },
  en: {
    title: 'My availability',
    startDate: 'Start date',
    endDate: 'End date',
    startTime: 'Start time',
    endTime: 'End time',
    add: 'Add interval',
    remove: 'Remove',
    local: 'Enter times in your device time zone',
    invalid: 'Choose at least 15 minutes within the event. Intervals must not overlap.',
  },
}

export function AvailabilityEditor({
  api,
  event,
  locale,
  zone,
  startsAt,
  endsAt,
}: {
  api: TanysApiClient
  event: string
  locale: Locale
  zone: string
  startsAt?: string
  endsAt?: string
}) {
  const t = labels[locale]
  const [slots, setSlots] = useState<Slot[]>()
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const firstDay = localDate(startsAt)
  const lastDay = localDate(endsAt)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<'request' | 'invalid'>()
  useEffect(() => {
    let active = true
    api
      .getAvailability(event)
      .then((value) => {
        if (active) setSlots(value)
      })
      .catch(() => {
        if (active) setError('request')
      })
    return () => {
      active = false
    }
  }, [api, event])

  async function save(next: Slot[], resetForm = false) {
    setBusy(true)
    setError(undefined)
    try {
      await api.saveAvailability(event, next)
      setSlots(next)
      if (resetForm) {
        setStartDate('')
        setEndDate('')
        setStartTime('')
        setEndTime('')
      }
    } catch (e) {
      setError(e && typeof e === 'object' && 'status' in e && e.status === 400 ? 'invalid' : 'request')
    } finally {
      setBusy(false)
    }
  }

  function add(e: FormEvent) {
    e.preventDefault()
    if (!slots || busy) return
    const from = new Date(`${startDate}T${startTime}`)
    const until = new Date(`${endDate || startDate}T${endTime}`)
    const duration = +until - +from
    if (
      !Number.isFinite(duration) ||
      duration < minimumDuration ||
      duration > 24 * 60 * 60 * 1000 ||
      (startsAt && +from < Date.parse(startsAt)) ||
      (endsAt && +until > Date.parse(endsAt)) ||
      slots.some(slot => +from < Date.parse(slot.end) && +until > Date.parse(slot.start))
    ) {
      setError('invalid')
      return
    }
    const next = [...slots, { start: from.toISOString(), end: until.toISOString() }]
    next.sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
    void save(next, true)
  }
  return (
    <section className="surface contact-panel">
      <h2>{t.title}</h2>
      <p>
        {t.local} · {Intl.DateTimeFormat().resolvedOptions().timeZone}
      </p>
      <form className="availability-form" onSubmit={add}>
        <div className="form-fields">
          <label className="field">
            <span>{t.startDate}</span>
            <input required disabled={busy} type="date" min={firstDay} max={lastDay} value={startDate}
              onClick={openDatePicker}
              onChange={e => {
                const date = e.target.value
                setStartDate(date)
                if (endDate < date) setEndDate('')
              }}
            />
          </label>
          <label className="field">
            <span>{t.startTime}</span>
            <input required disabled={busy} type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
          </label>
          <label className="field">
            <span>{t.endDate}</span>
            <input required disabled={busy} type="date" min={startDate || firstDay} max={lastDay}
              value={endDate || startDate} onClick={openDatePicker} onChange={e => setEndDate(e.target.value)}
            />
          </label>
          <label className="field">
            <span>{t.endTime}</span>
            <input required disabled={busy} type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
          </label>
        </div>
        <div className="social-card__actions">
          <button className="secondary-button" type="submit" disabled={!slots || busy}>
            {t.add}
          </button>
        </div>
      </form>
      {slots?.length ? (
        <ul className="social-list availability-slots">
          {slots.map((slot) => (
            <li key={slot.start} className="surface social-card">
              <span>{formatMeetingInterval(slot.start, slot.end, zone, locale)}</span>
              <button
                type="button"
                className="meeting-slot-cancel"
                disabled={busy}
                onClick={() => void save(slots.filter((item) => item !== slot))}
              >
                {t.remove}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {error && (
        <p className="error-banner" role="alert">
          {error === 'invalid' ? t.invalid : getMessages(locale).account.errors.genericRequest}
        </p>
      )}
    </section>
  )
}
