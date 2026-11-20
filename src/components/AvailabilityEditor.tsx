import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { TanysApiClient } from '../api/client'
import { getMessages } from '../i18n/messages'
import type { Locale } from '../matching/types'
import { formatMeetingInterval } from './socialHelpers'

type Slot = { start: string; end: string }
const labels = {
  ru: {
    title: 'Моё свободное время',
    start: 'С',
    end: 'До',
    add: 'Добавить интервал',
    remove: 'Убрать',
    local: 'Ввод в часовом поясе устройства',
    invalid:
      'Укажите свободное время в пределах события, минимум 15 минут. Интервалы не должны пересекаться.',
  },
  kk: {
    title: 'Бос уақытым',
    start: 'Басталуы',
    end: 'Аяқталуы',
    add: 'Аралық қосу',
    remove: 'Алып тастау',
    local: 'Құрылғының уақыт белдеуі',
    invalid: 'Іс-шара шегінде кемінде 15 минут таңдаңыз. Аралықтар қабаттаспауы керек.',
  },
  en: {
    title: 'My availability',
    start: 'From',
    end: 'Until',
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
}: {
  api: TanysApiClient
  event: string
  locale: Locale
  zone: string
}) {
  const t = labels[locale]
  const [slots, setSlots] = useState<Slot[]>()
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
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

  async function save(next: Slot[]) {
    setBusy(true)
    setError(undefined)
    try {
      await api.saveAvailability(event, next)
      setSlots(next)
      setStart('')
      setEnd('')
    } catch (e) {
      setError(e && typeof e === 'object' && 'status' in e && e.status === 400 ? 'invalid' : 'request')
    } finally {
      setBusy(false)
    }
  }

  function add(e: FormEvent) {
    e.preventDefault()
    if (!slots || busy) return
    const from = new Date(start),
      until = new Date(end)
    if (!Number.isFinite(+from) || !Number.isFinite(+until) || +until - +from < 900000) {
      setError('invalid')
      return
    }
    void save([...slots, { start: from.toISOString(), end: until.toISOString() }])
  }
  return (
    <section className="surface contact-panel">
      <h2>{t.title}</h2>
      <p>
        {t.local} · {Intl.DateTimeFormat().resolvedOptions().timeZone}
      </p>
      <form onSubmit={add}>
        <label className="field">
          {t.start}
          <input required type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label className="field">
          {t.end}
          <input required type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
        </label>
        <button className="secondary-button" type="submit" disabled={!slots || busy}>
          {t.add}
        </button>
      </form>
      {slots?.length ? (
        <ul>
          {slots.map((slot) => (
            <li key={slot.start}>
              {formatMeetingInterval(slot.start, slot.end, zone, locale)}{' '}
              <button
                type="button"
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
        <p role="alert">
          {error === 'invalid' ? t.invalid : getMessages(locale).account.errors.genericRequest}
        </p>
      )}
    </section>
  )
}
