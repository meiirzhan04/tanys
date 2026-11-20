import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { TanysApiClient } from '../api/client'
import { getMessages } from '../i18n/messages'
import type { Locale } from '../matching/types'
import { formatMeetingInterval } from './socialHelpers'
import { TimeSelect } from './TimeSelect'
import { AvailabilityDatePicker } from './AvailabilityDatePicker'
import { isQuarterHourInstant, isQuarterHourTime } from '../scheduling/timeStep'

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

const labels = {
  ru: {
    title: 'Моё свободное время',
    start: 'Начало',
    end: 'Окончание',
    startDate: 'Дата начала',
    endDate: 'Дата окончания',
    startTime: 'Время начала',
    endTime: 'Время окончания',
    add: 'Добавить интервал',
    remove: 'Убрать',
    local: 'Ввод в часовом поясе устройства',
    invalid:
      'Укажите свободное время в пределах события, минимум 15 минут. Интервалы не должны пересекаться.',
    timePlaceholder: 'Выберите время',
    step: 'Время выбирается с шагом 15 минут: :00, :15, :30 или :45.',
    legacyOption: (time: string) => `${time} — недопустимо`,
    legacySlot: 'Сохранено со временем не по шагу 15 минут. Удалите интервал и добавьте его заново с допустимым временем.',
    invalidStep: 'Выберите время с шагом 15 минут: :00, :15, :30 или :45.',
  },
  kk: {
    title: 'Бос уақытым',
    start: 'Басталуы',
    end: 'Аяқталуы',
    startDate: 'Басталу күні',
    endDate: 'Аяқталу күні',
    startTime: 'Басталу уақыты',
    endTime: 'Аяқталу уақыты',
    add: 'Аралық қосу',
    remove: 'Алып тастау',
    local: 'Құрылғының уақыт белдеуі',
    invalid: 'Іс-шара шегінде кемінде 15 минут таңдаңыз. Аралықтар қабаттаспауы керек.',
    timePlaceholder: 'Уақытты таңдаңыз',
    step: 'Уақыт 15 минут қадаммен таңдалады: :00, :15, :30 немесе :45.',
    legacyOption: (time: string) => `${time} — жарамсыз`,
    legacySlot: '15 минут қадамына сай емес уақытпен сақталған. Аралықты жойып, жарамды уақытпен қайта қосыңыз.',
    invalidStep: 'Уақытты 15 минут қадаммен таңдаңыз: :00, :15, :30 немесе :45.',
  },
  en: {
    title: 'My availability',
    start: 'Start',
    end: 'End',
    startDate: 'Start date',
    endDate: 'End date',
    startTime: 'Start time',
    endTime: 'End time',
    add: 'Add interval',
    remove: 'Remove',
    local: 'Enter times in your device time zone',
    invalid: 'Choose at least 15 minutes within the event. Intervals must not overlap.',
    timePlaceholder: 'Choose a time',
    step: 'Times use 15-minute steps: :00, :15, :30 or :45.',
    legacyOption: (time: string) => `${time} — not allowed`,
    legacySlot: 'Saved with a time outside the 15-minute steps. Remove the interval and add it again with an allowed time.',
    invalidStep: 'Choose a time in 15-minute steps: :00, :15, :30 or :45.',
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
  const [error, setError] = useState<'request' | 'invalid' | 'step'>()
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
      const code = e && typeof e === 'object' && 'code' in e ? e.code : undefined
      const status = e && typeof e === 'object' && 'status' in e ? e.status : undefined
      setError(code === 'invalid_time_step' ? 'step' : status === 400 ? 'invalid' : 'request')
    } finally {
      setBusy(false)
    }
  }

  function add(e: FormEvent) {
    e.preventDefault()
    if (!slots || busy) return
    if (!isQuarterHourTime(startTime) || !isQuarterHourTime(endTime)) {
      setError('step')
      return
    }
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
    <section className="surface contact-panel availability-panel">
      <h2>{t.title}</h2>
      <p>
        {t.local} · {Intl.DateTimeFormat().resolvedOptions().timeZone}
      </p>
      <form className="availability-form" onSubmit={add}>
        <div className="availability-range">
          <fieldset>
            <legend>{t.start}</legend>
            <AvailabilityDatePicker label={t.startDate} locale={locale} disabled={busy} min={firstDay} max={lastDay} value={startDate}
              onChange={date => {
                setStartDate(date)
                if (endDate < date) setEndDate('')
              }}
            />
            <label className="field">
              <span>{t.startTime}</span>
              <TimeSelect
                name="availabilityStartTime"
                required
                disabled={busy}
                value={startTime}
                placeholder={t.timePlaceholder}
                legacyLabel={t.legacyOption}
                onChange={setStartTime}
              />
            </label>
          </fieldset>
          <fieldset>
            <legend>{t.end}</legend>
            <AvailabilityDatePicker label={t.endDate} locale={locale} disabled={busy} min={startDate || firstDay} max={lastDay}
              value={endDate || startDate} onChange={setEndDate} />
            <label className="field">
              <span>{t.endTime}</span>
              <TimeSelect
                name="availabilityEndTime"
                required
                disabled={busy}
                value={endTime}
                placeholder={t.timePlaceholder}
                legacyLabel={t.legacyOption}
                onChange={setEndTime}
              />
            </label>
          </fieldset>
        </div>
        <p className="field-hint">{t.step}</p>
        <div className="social-card__actions">
          <button className="primary-button" type="submit" disabled={!slots || busy}>
            {t.add}
          </button>
        </div>
      </form>
      {slots?.length ? (
        <ul className="social-list availability-slots">
          {slots.map((slot) => (
            <li key={slot.start} className="surface social-card">
              <span>
                {formatMeetingInterval(slot.start, slot.end, zone, locale)}
                {(!isQuarterHourInstant(slot.start) || !isQuarterHourInstant(slot.end)) && (
                  <span className="field-hint legacy-time-hint" role="note">{t.legacySlot}</span>
                )}
              </span>
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
          {error === 'invalid' ? t.invalid : error === 'step' ? t.invalidStep : getMessages(locale).account.errors.genericRequest}
        </p>
      )}
    </section>
  )
}
