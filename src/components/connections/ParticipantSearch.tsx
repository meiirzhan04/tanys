import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { IntroductionItem, ParticipantSearchItem, TanysApiClient } from '../../api/client'
import type { Locale } from '../../matching/types'
import { getMessages } from '../../i18n/messages'
import { getCandidateGoalLabels } from '../goalLabels'
import { introStatusText } from './introStatus'
import { connectionsCopy } from './connectionsCopy'
import { ContactValue } from './ContactValue'
import { initialsOf } from './contactLink'

const DEBOUNCE_MS = 250

type SearchState = 'idle' | 'short' | 'loading' | 'done' | 'error'

interface ParticipantSearchProps {
  api: TanysApiClient
  eventId: string
  locale: Locale
  /** Server-confirmed introductions; the single source of truth for statuses after any action. */
  introductions: readonly IntroductionItem[]
  busyIntroId: string
  /** Resolves with an error message, or an empty string once the server stored the request. */
  onRequest: (userId: string, message: string) => Promise<string>
  onUpdateIntro: (introId: string, status: 'accepted' | 'declined' | 'withdrawn') => void
  onShowIntroduction: (introId: string) => void
}

export function ParticipantSearch({
  api,
  eventId,
  locale,
  introductions,
  busyIntroId,
  onRequest,
  onUpdateIntro,
  onShowIntroduction,
}: ParticipantSearchProps) {
  const c = connectionsCopy[locale]
  const s = getMessages(locale).social
  const goalLabels = getCandidateGoalLabels(locale)
  const id = useId()
  const [query, setQuery] = useState('')
  const [state, setState] = useState<SearchState>('idle')
  const [results, setResults] = useState<ParticipantSearchItem[]>([])
  const [minLength, setMinLength] = useState(2)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [selected, setSelected] = useState<ParticipantSearchItem | null>(null)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const normalized = query.trim().replace(/^@+/, '')
    if (!normalized) {
      setState('idle')
      setResults([])
      return
    }
    if (normalized.length < minLength) {
      setState('short')
      setResults([])
      return
    }
    const controller = new AbortController()
    setState('loading')
    const timer = window.setTimeout(() => {
      api.searchParticipants(eventId, normalized, controller.signal)
        .then(result => {
          setResults(result.items)
          setMinLength(result.minLength)
          setActive(result.items.length ? 0 : -1)
          setState('done')
        })
        .catch(error => {
          if (controller.signal.aborted || (error as { name?: string })?.name === 'AbortError') return
          setState('error')
        })
    }, DEBOUNCE_MS)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [api, eventId, query, minLength, attempt])

  useEffect(() => {
    if (!open) return
    function handleOutside(event: MouseEvent | TouchEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('touchstart', handleOutside)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('touchstart', handleOutside)
    }
  }, [open])

  function choose(item: ParticipantSearchItem) {
    setSelected(item)
    setMessage('')
    setSendError('')
    setOpen(false)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      if (open) {
        event.preventDefault()
        setOpen(false)
      }
      return
    }
    if (!results.length) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
      setActive(current => {
        const next = current + (event.key === 'ArrowDown' ? 1 : -1)
        return (next + results.length) % results.length
      })
    } else if (event.key === 'Enter' && open && active >= 0) {
      event.preventDefault()
      choose(results[active])
    }
  }

  async function send() {
    if (!selected || sending) return
    setSending(true)
    setSendError('')
    const error = await onRequest(selected.userId, message)
    setSending(false)
    if (error) setSendError(error)
    else setMessage('')
  }

  // The server-confirmed list wins over the snapshot taken when the result was loaded.
  const intro = selected ? introductions.find(item => item.participantId === selected.userId) : undefined
  const status = intro?.status ?? selected?.introduction?.status
  const direction = intro?.direction ?? selected?.introduction?.direction
  const introId = intro?.id ?? selected?.introduction?.id
  const listboxId = `${id}-results`
  const showList = open && state === 'done' && results.length > 0

  return (
    <section className="surface people-search" aria-labelledby={`${id}-title`}>
      <div className="people-search__head">
        <h2 id={`${id}-title`}>{c.searchTitle}</h2>
        <p>{c.searchHint}</p>
      </div>

      <div ref={rootRef} className="people-search__box">
        <label className="visually-hidden" htmlFor={`${id}-input`}>{c.searchLabel}</label>
        <span className="people-search__icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" /><path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
        </span>
        <input
          ref={inputRef}
          id={`${id}-input`}
          name="participantSearch"
          type="search"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={showList && active >= 0 ? `${listboxId}-${active}` : undefined}
          autoComplete="off"
          spellCheck={false}
          maxLength={64}
          placeholder={c.searchPlaceholder}
          value={query}
          onChange={event => {
            setQuery(event.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
        />
        {state === 'loading' && <span className="people-search__spinner" aria-hidden="true" />}

        {showList && (
          <ul id={listboxId} role="listbox" className="people-search__list" aria-label={c.searchLabel}>
            {results.map((item, index) => (
              <li
                key={item.userId}
                id={`${listboxId}-${index}`}
                role="option"
                aria-selected={index === active}
                className={`people-option ${index === active ? 'people-option--active' : ''}`}
                onMouseEnter={() => setActive(index)}
                onMouseDown={event => {
                  event.preventDefault()
                  choose(item)
                }}
              >
                <span className="person-avatar" aria-hidden="true">{initialsOf(item.name, item.handle)}</span>
                <span className="people-option__text">
                  <strong>{item.name ?? (item.handle ? `@${item.handle}` : '—')}</strong>
                  <span>{[item.handle ? `@${item.handle}` : null, item.role].filter(Boolean).join(' · ')}</span>
                </span>
                {item.introduction && <span className={`status-badge status-badge--${item.introduction.status}`}>{introStatusText(item.introduction.status, locale)}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="people-search__status" role="status" aria-live="polite">
        {state === 'short' && <p>{c.searchMin(minLength)}</p>}
        {state === 'loading' && <p className="visually-hidden">{c.searchLoading}</p>}
        {state === 'done' && !results.length && <p>{c.searchEmpty(query.trim())}</p>}
      </div>
      {state === 'error' && (
        <div className="error-banner error-banner--actions" role="alert">
          <span>{c.searchError}</span>
          <button type="button" className="secondary-button" onClick={() => setAttempt(value => value + 1)}>{c.retry}</button>
        </div>
      )}

      {selected && (
        <article className="person-card" aria-labelledby={`${id}-person`}>
          <div className="person-card__head">
            <span className="person-avatar person-avatar--lg" aria-hidden="true">{initialsOf(selected.name, selected.handle)}</span>
            <div className="person-card__id">
              <h3 id={`${id}-person`}>{selected.name ?? `@${selected.handle}`}</h3>
              <p>{[selected.handle ? `@${selected.handle}` : null, selected.role].filter(Boolean).join(' · ')}</p>
              {selected.goal && <span className="person-card__goal">{goalLabels[selected.goal]}</span>}
            </div>
            <button type="button" className="icon-button" aria-label={c.close} onClick={() => setSelected(null)}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
            </button>
          </div>
          <p className="person-card__note">{c.manualNote}</p>

          {status === 'accepted' ? (
            <div className="person-card__state person-card__state--ok">
              <strong>{c.connected}</strong>
              {intro?.contact?.trim() ? <ContactValue value={intro.contact} locale={locale} /> : <p className="lock-note">{c.noContact}</p>}
              {introId && (
                <button type="button" className="primary-button" onClick={() => onShowIntroduction(introId)}>{c.myMeetings}</button>
              )}
            </div>
          ) : (
            <p className="lock-note">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.8" /><path d="M8 11V8a4 4 0 1 1 8 0v3" stroke="currentColor" strokeWidth="1.8" /></svg>
              {c.contactHidden}
            </p>
          )}

          {status === 'pending' && direction === 'outgoing' && introId && (
            <div className="person-card__state">
              <strong>{c.sentPending}</strong>
              <p>{c.sentHint}</p>
              <button type="button" className="secondary-button" disabled={busyIntroId === introId} onClick={() => onUpdateIntro(introId, 'withdrawn')}>
                {s.withdraw}
              </button>
            </div>
          )}
          {status === 'pending' && direction === 'incoming' && introId && (
            <div className="person-card__state">
              <strong>{c.incomingPending}</strong>
              <div className="person-card__actions">
                <button type="button" className="primary-button" disabled={busyIntroId === introId} onClick={() => onUpdateIntro(introId, 'accepted')}>{s.accept}</button>
                <button type="button" className="secondary-button" disabled={busyIntroId === introId} onClick={() => onUpdateIntro(introId, 'declined')}>{s.decline}</button>
              </div>
            </div>
          )}
          {status === 'declined' && <p className="person-card__state">{c.declined}</p>}
          {(!status || (status === 'withdrawn' && direction === 'outgoing')) && (
            <div className="person-card__compose">
              <label className="field">
                <span>{c.messageLabel}</span>
                <textarea
                  name="introMessage"
                  rows={2}
                  maxLength={280}
                  placeholder={c.messagePlaceholder}
                  value={message}
                  disabled={sending}
                  onChange={event => setMessage(event.target.value)}
                />
              </label>
              <button type="button" className="primary-button" data-action="connect" disabled={sending} onClick={() => void send()}>
                {sending ? c.sending : c.connect}
              </button>
              {sendError && <p className="error-banner" role="alert">{sendError}</p>}
            </div>
          )}
          {status === 'withdrawn' && direction === 'incoming' && <p className="person-card__state">{c.withdrawn}</p>}
        </article>
      )}
    </section>
  )
}
