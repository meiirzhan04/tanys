import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { TanysApiClient } from '../api/client'
import { getMessages } from '../i18n/messages'
import type { Locale } from '../matching/types'
import { formatMeetingInterval } from './socialHelpers'
import { TimeSelect } from './TimeSelect'
import { AvailabilityDatePicker } from './AvailabilityDatePicker'
import { QUARTER_HOUR_MS, fromLocalParts, isQuarterHourInstant, isQuarterHourTime, toLocalParts } from '../scheduling/timeStep'

type Slot = { start: string; end: string }
type ErrorKind = 'request' | 'invalid' | 'step' | 'beforeEvent' | 'afterEvent' | 'tooShort' | 'tooLong' | 'overlap'
const maximumDuration = 24 * 60 * 60 * 1000

function parseInstant(value?: string): Date | undefined {
  const date = value ? new Date(value) : undefined
  return date && Number.isFinite(+date) ? date : undefined
}

/** Device-local date and time, the same clock the inputs use. */
function formatLocal(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === 'kk' ? 'kk-KZ' : locale === 'en' ? 'en-GB' : 'ru-RU', {
    day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  }).format(date)
}

const labels = {
  ru: {
    title: 'Моё свободное время',
    intro: 'Отметьте, когда вы готовы к встречам 1:1 на мероприятии. Собеседник увидит общее свободное время и сможет предложить встречу.',
    example: 'Например: свободны в обед — укажите 12:00–13:00; ещё и после докладов — добавьте второй интервал 16:30–17:30.',
    window: (from: string, until: string) => `Мероприятие идёт: ${from} — ${until}. Время можно выбрать только внутри этого периода.`,
    start: 'Начало',
    end: 'Окончание',
    startDate: 'Дата начала',
    endDate: 'Дата окончания',
    startTime: 'Время начала',
    endTime: 'Время окончания',
    add: 'Добавить интервал',
    remove: 'Убрать',
    empty: 'Интервалов пока нет. Добавьте хотя бы один — без него встречу не предложить.',
    local: 'Время по часовому поясу устройства',
    timePlaceholder: 'Выберите время',
    step: 'Шаг 15 минут, минимум 15 минут. Интервалы не должны пересекаться.',
    legacyOption: (time: string) => `${time} — недопустимо`,
    legacySlot: 'Сохранено со временем не по шагу 15 минут. Удалите интервал и добавьте его заново с допустимым временем.',
    errors: {
      invalid: 'Сервер не принял интервал: он должен быть внутри мероприятия, не короче 15 минут и не пересекаться с другими.',
      step: 'Выберите время с шагом 15 минут: :00, :15, :30 или :45.',
      beforeEvent: (from: string) => `Начало раньше старта мероприятия. Выберите время не раньше ${from}.`,
      afterEvent: (until: string) => `Окончание позже конца мероприятия. Выберите время не позже ${until}.`,
      tooShort: 'Окончание должно быть хотя бы на 15 минут позже начала. Например, 12:00–12:15.',
      tooLong: 'Один интервал — не больше 24 часов. Разбейте время на несколько интервалов.',
      overlap: (slot: string) => `Интервал пересекается с уже добавленным: ${slot}. Измените время или уберите старый интервал.`,
    },
  },
  kk: {
    title: 'Бос уақытым',
    intro: 'Іс-шарада 1:1 кездесуге дайын уақытыңызды белгілеңіз. Әңгімелесуші ортақ бос уақытты көріп, кездесу ұсына алады.',
    example: 'Мысалы: түскі үзілісте бос болсаңыз — 12:00–13:00 көрсетіңіз; баяндамалардан кейін де бос болсаңыз — 16:30–17:30 екінші аралығын қосыңыз.',
    window: (from: string, until: string) => `Іс-шара уақыты: ${from} — ${until}. Уақытты тек осы аралықтан таңдауға болады.`,
    start: 'Басталуы',
    end: 'Аяқталуы',
    startDate: 'Басталу күні',
    endDate: 'Аяқталу күні',
    startTime: 'Басталу уақыты',
    endTime: 'Аяқталу уақыты',
    add: 'Аралық қосу',
    remove: 'Алып тастау',
    empty: 'Әзірге аралық жоқ. Кемінде біреуін қосыңыз — онсыз кездесу ұсыну мүмкін емес.',
    local: 'Құрылғының уақыт белдеуі бойынша',
    timePlaceholder: 'Уақытты таңдаңыз',
    step: 'Қадамы 15 минут, кемінде 15 минут. Аралықтар қабаттаспауы керек.',
    legacyOption: (time: string) => `${time} — жарамсыз`,
    legacySlot: '15 минут қадамына сай емес уақытпен сақталған. Аралықты жойып, жарамды уақытпен қайта қосыңыз.',
    errors: {
      invalid: 'Сервер аралықты қабылдамады: ол іс-шара ішінде, кемінде 15 минут және басқаларымен қабаттаспауы керек.',
      step: 'Уақытты 15 минут қадаммен таңдаңыз: :00, :15, :30 немесе :45.',
      beforeEvent: (from: string) => `Басталуы іс-шарадан ерте. ${from} уақытынан ерте емес таңдаңыз.`,
      afterEvent: (until: string) => `Аяқталуы іс-шарадан кеш. ${until} уақытынан кеш емес таңдаңыз.`,
      tooShort: 'Аяқталуы басталуынан кемінде 15 минут кейін болуы керек. Мысалы, 12:00–12:15.',
      tooLong: 'Бір аралық 24 сағаттан аспауы керек. Уақытты бірнеше аралыққа бөліңіз.',
      overlap: (slot: string) => `Аралық бұрын қосылғанмен қабаттасады: ${slot}. Уақытты өзгертіңіз немесе ескі аралықты алып тастаңыз.`,
    },
  },
  en: {
    title: 'My availability',
    intro: 'Mark when you are free for 1:1 meetings at the event. The other person sees your shared free time and can propose a meeting.',
    example: 'For example: free at lunch — add 12:00–13:00; also free after the talks — add a second interval 16:30–17:30.',
    window: (from: string, until: string) => `The event runs ${from} — ${until}. Times can only be picked inside this period.`,
    start: 'Start',
    end: 'End',
    startDate: 'Start date',
    endDate: 'End date',
    startTime: 'Start time',
    endTime: 'End time',
    add: 'Add interval',
    remove: 'Remove',
    empty: 'No intervals yet. Add at least one — without it nobody can propose a meeting.',
    local: 'Times in your device time zone',
    timePlaceholder: 'Choose a time',
    step: '15-minute steps, at least 15 minutes. Intervals must not overlap.',
    legacyOption: (time: string) => `${time} — not allowed`,
    legacySlot: 'Saved with a time outside the 15-minute steps. Remove the interval and add it again with an allowed time.',
    errors: {
      invalid: 'The server rejected the interval: it must be inside the event, at least 15 minutes and not overlap others.',
      step: 'Choose a time in 15-minute steps: :00, :15, :30 or :45.',
      beforeEvent: (from: string) => `The start is before the event begins. Choose ${from} or later.`,
      afterEvent: (until: string) => `The end is after the event ends. Choose ${until} or earlier.`,
      tooShort: 'The end must be at least 15 minutes after the start, e.g. 12:00–12:15.',
      tooLong: 'One interval can be at most 24 hours. Split the time into several intervals.',
      overlap: (slot: string) => `This overlaps an interval you already added: ${slot}. Change the time or remove the old interval.`,
    },
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
  const eventStart = parseInstant(startsAt)
  const eventEnd = parseInstant(endsAt)
  const firstDay = toLocalParts(eventStart).date || undefined
  const lastDay = toLocalParts(eventEnd).date || undefined
  // A one-day event needs no date choice: both dates start on that day.
  const defaultDay = firstDay && firstDay === lastDay ? firstDay : ''
  const [slots, setSlots] = useState<Slot[]>()
  const [startDate, setStartDate] = useState(defaultDay)
  const [endDate, setEndDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<ErrorKind>()
  const [overlapWith, setOverlapWith] = useState<Slot>()
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

  const endDay = endDate || startDate
  const chosenStart = fromLocalParts(startDate, startTime)

  function startAllowed(time: string) {
    if (!startDate) return true
    const at = +fromLocalParts(startDate, time)
    return (!eventStart || at >= +eventStart) && (!eventEnd || at + QUARTER_HOUR_MS <= +eventEnd)
  }

  function endAllowed(time: string) {
    if (!endDay) return true
    const at = +fromLocalParts(endDay, time)
    if (eventEnd && at > +eventEnd) return false
    if (eventStart && at < +eventStart + QUARTER_HOUR_MS) return false
    return !Number.isFinite(+chosenStart) || (at - +chosenStart >= QUARTER_HOUR_MS && at - +chosenStart <= maximumDuration)
  }

  function changeStartDate(date: string) {
    setStartDate(date)
    if (endDate && endDate < date) setEndDate('')
    setStartTime('')
    setEndTime('')
    setError(undefined)
  }

  function changeStartTime(time: string) {
    setStartTime(time)
    setError(undefined)
    // Drop an end time that no longer fits after the new start.
    if (endTime && endDay) {
      const gap = +fromLocalParts(endDay, endTime) - +fromLocalParts(startDate, time)
      if (gap < QUARTER_HOUR_MS || gap > maximumDuration) setEndTime('')
    }
  }

  async function save(next: Slot[], resetForm = false) {
    setBusy(true)
    setError(undefined)
    try {
      await api.saveAvailability(event, next)
      setSlots(next)
      if (resetForm) {
        setStartDate(defaultDay)
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
    const from = fromLocalParts(startDate, startTime)
    const until = fromLocalParts(endDay, endTime)
    const duration = +until - +from
    const overlap = slots.find(slot => +from < Date.parse(slot.end) && +until > Date.parse(slot.start))
    const problem: ErrorKind | undefined =
      !Number.isFinite(duration) || duration < QUARTER_HOUR_MS ? 'tooShort'
        : duration > maximumDuration ? 'tooLong'
          : eventStart && +from < +eventStart ? 'beforeEvent'
            : eventEnd && +until > +eventEnd ? 'afterEvent'
              : overlap ? 'overlap'
                : undefined
    if (problem) {
      setOverlapWith(overlap)
      setError(problem)
      return
    }
    const next = [...slots, { start: from.toISOString(), end: until.toISOString() }]
    next.sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
    void save(next, true)
  }

  function errorText(kind: ErrorKind): string {
    switch (kind) {
      case 'beforeEvent': return t.errors.beforeEvent(eventStart ? formatLocal(eventStart, locale) : '')
      case 'afterEvent': return t.errors.afterEvent(eventEnd ? formatLocal(eventEnd, locale) : '')
      case 'overlap': return t.errors.overlap(overlapWith ? formatMeetingInterval(overlapWith.start, overlapWith.end, zone, locale) : '')
      case 'tooShort': return t.errors.tooShort
      case 'tooLong': return t.errors.tooLong
      case 'step': return t.errors.step
      case 'invalid': return t.errors.invalid
      default: return getMessages(locale).account.errors.genericRequest
    }
  }

  return (
    <section className="surface contact-panel availability-panel">
      <h2>{t.title}</h2>
      <p>{t.intro}</p>
      {eventStart && eventEnd && (
        <p className="availability-window" data-event-window>
          {t.window(formatLocal(eventStart, locale), formatLocal(eventEnd, locale))}
        </p>
      )}
      <p className="field-hint availability-example">{t.example}</p>
      <form className="availability-form" onSubmit={add}>
        <div className="availability-range">
          <fieldset>
            <legend>{t.start}</legend>
            <AvailabilityDatePicker label={t.startDate} locale={locale} disabled={busy} min={firstDay} max={lastDay} value={startDate}
              onChange={changeStartDate}
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
                isAllowed={startAllowed}
                onChange={changeStartTime}
              />
            </label>
          </fieldset>
          <fieldset>
            <legend>{t.end}</legend>
            <AvailabilityDatePicker label={t.endDate} locale={locale} disabled={busy} min={startDate || firstDay} max={lastDay}
              value={endDay} onChange={date => { setEndDate(date); setEndTime(''); setError(undefined) }} />
            <label className="field">
              <span>{t.endTime}</span>
              <TimeSelect
                name="availabilityEndTime"
                required
                disabled={busy}
                value={endTime}
                placeholder={t.timePlaceholder}
                legacyLabel={t.legacyOption}
                isAllowed={endAllowed}
                onChange={time => { setEndTime(time); setError(undefined) }}
              />
            </label>
          </fieldset>
        </div>
        <p className="field-hint">{t.step} {t.local} · {Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
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
      ) : slots ? (
        <p className="field-hint availability-empty">{t.empty}</p>
      ) : null}
      {error && (
        <p className="error-banner" role="alert">{errorText(error)}</p>
      )}
    </section>
  )
}
