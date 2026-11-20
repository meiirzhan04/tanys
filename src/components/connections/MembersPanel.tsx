import { useEffect, useId, useState } from 'react'
import type { EventMemberItem, MemberPageFilters, TanysApiClient } from '../../api/client'
import { getMessages } from '../../i18n/messages'
import type { Goal, Locale } from '../../matching/types'
import { CustomSelect } from '../CustomSelect'
import { getCandidateGoalLabels } from '../goalLabels'
import { filterEventMembers, getMemberDisplayName } from '../memberSearch'
import { initialsOf } from './contactLink'
import { membersCopy } from './membersCopy'

const SEARCH_DEBOUNCE_MS = 300
const PAGE_SIZE = 50
const GOALS: readonly Goal[] = ['find_job', 'hire', 'find_mentor', 'be_mentor', 'find_cofounder', 'exchange_experience']

type Visibility = NonNullable<MemberPageFilters['visibility']>
type LoadState = 'loading' | 'ready' | 'error'

/**
 * Organizer list of event members with server-side search, filters and paging (works for 300+ people).
 * Shows a table on wide screens and cards on phones from the same data. Never shows contacts or e-mails.
 * Render it with `key={eventId}` so switching events starts from a clean slate (no filters carried over).
 */
export function MembersPanel({ api, eventId, locale }: { api: TanysApiClient; eventId: string; locale: Locale }) {
  const o = getMessages(locale).organizer
  const m = membersCopy[locale]
  const goalLabels = getCandidateGoalLabels(locale)
  const id = useId()
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [goal, setGoal] = useState<Goal | ''>('')
  const [visibility, setVisibility] = useState<Visibility | ''>('')
  const [items, setItems] = useState<EventMemberItem[]>([])
  const [total, setTotal] = useState(0)
  const [cursor, setCursor] = useState<string | null>(null)
  const [state, setState] = useState<LoadState>('loading')
  const [loadingMore, setLoadingMore] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(search.trim()), SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    let active = true
    setState('loading')
    api.pageEventMembers(eventId, { q: query, goal: goal || undefined, visibility: visibility || undefined, limit: PAGE_SIZE })
      .then(page => {
        if (!active) return
        setItems(page.items)
        setTotal(page.total)
        setCursor(page.nextCursor)
        setState('ready')
      })
      .catch(() => { if (active) setState('error') })
    return () => { active = false }
  }, [api, eventId, query, goal, visibility, attempt])

  async function loadMore() {
    if (!cursor || loadingMore) return
    setLoadingMore(true)
    try {
      const page = await api.pageEventMembers(eventId, { q: query, goal: goal || undefined, visibility: visibility || undefined, limit: PAGE_SIZE, cursor })
      setItems(current => [...current, ...page.items.filter(item => !current.some(existing => existing.userId === item.userId))])
      setCursor(page.nextCursor)
    } catch {
      setState('error')
    } finally {
      setLoadingMore(false)
    }
  }

  // The server already filters; the same rule is applied locally so a slow response never shows stale rows.
  const visible = filterEventMembers(items, search)
  const filtersActive = Boolean(search.trim() || goal || visibility)

  function statusOf(member: EventMemberItem) {
    if (member.visible === true) return { label: o.profileVisible, tone: 'ok' }
    if (member.visible === false) return { label: o.profileHidden, tone: 'warn' }
    return { label: o.profileIncomplete, tone: 'muted' }
  }

  function roleOf(member: EventMemberItem) {
    return member.profileRole || (member.role === 'organizer' ? o.roleOrganizer : o.roleParticipant)
  }

  return (
    <section className="surface members-panel bento-card--wide" aria-labelledby={`${id}-title`}>
      <header className="members-panel__head">
        <div>
          <h2 id={`${id}-title`}>{m.title}</h2>
          <p>{state === 'ready' ? m.count(total, filtersActive) : m.loading}</p>
        </div>
      </header>

      <div className="members-panel__toolbar">
        <div className="members-panel__search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" /><path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          <input
            type="search"
            className="app-input"
            name="memberSearch"
            aria-label={o.memberSearchLabel}
            placeholder={m.searchPlaceholder}
            value={search}
            onChange={event => setSearch(event.target.value)}
          />
        </div>
        <CustomSelect
          name="memberGoal"
          aria-label={m.goalFilter}
          value={goal}
          options={[{ value: '', label: m.anyGoal }, ...GOALS.map(value => ({ value, label: goalLabels[value] }))]}
          onChange={value => setGoal(value as Goal | '')}
        />
        <CustomSelect
          name="memberVisibility"
          aria-label={m.statusFilter}
          value={visibility}
          options={[
            { value: '', label: m.anyStatus },
            { value: 'visible', label: o.profileVisible },
            { value: 'hidden', label: o.profileHidden },
            { value: 'incomplete', label: o.profileIncomplete },
          ]}
          onChange={value => setVisibility(value as Visibility | '')}
        />
        {filtersActive && (
          <button type="button" className="secondary-button" onClick={() => { setSearch(''); setGoal(''); setVisibility('') }}>
            {o.clearMemberSearch}
          </button>
        )}
      </div>

      {state === 'loading' && !items.length ? (
        <ul className="members-skeleton" aria-busy="true" aria-label={m.loading}>
          {[0, 1, 2].map(index => <li key={index} />)}
        </ul>
      ) : state === 'error' ? (
        <div className="error-banner error-banner--actions" role="alert">
          <span>{m.error}</span>
          <button type="button" className="secondary-button" onClick={() => setAttempt(value => value + 1)}>{m.retry}</button>
        </div>
      ) : visible.length === 0 ? (
        <div className="members-empty">
          <p>{filtersActive ? o.noMemberMatches : o.noMembers}</p>
          {!filtersActive && <p className="members-empty__hint">{m.emptyHint}</p>}
        </div>
      ) : (
        <>
          <div className="table-scroll members-table-wrap">
            <table className="interest-table members-table">
              <thead>
                <tr>
                  <th scope="col">{o.memberNameCol}</th>
                  <th scope="col">{o.memberRoleCol}</th>
                  <th scope="col">{o.memberGoalCol}</th>
                  <th scope="col">{o.memberVisibilityCol}</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(member => {
                  const status = statusOf(member)
                  return (
                    <tr key={member.userId} data-member-id={member.userId}>
                      <th scope="row">
                        <span className="member-cell">
                          <span className="person-avatar" aria-hidden="true">{initialsOf(member.name, member.handle ?? member.username)}</span>
                          <span className="member-cell__text">
                            <strong>{getMemberDisplayName(member)}</strong>
                            {member.handle && <span>@{member.handle}</span>}
                          </span>
                          {member.role === 'organizer' && member.profileRole && <span className="member-role-badge">{o.roleOrganizer}</span>}
                        </span>
                      </th>
                      <td>{roleOf(member)}</td>
                      <td>{member.goal ? goalLabels[member.goal] : '—'}</td>
                      <td><span className={`member-status member-status--${status.tone}`}>{status.label}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <ul className="member-cards">
            {visible.map(member => {
              const status = statusOf(member)
              return (
                <li key={member.userId} className="member-card" data-member-card={member.userId}>
                  <span className="person-avatar" aria-hidden="true">{initialsOf(member.name, member.handle ?? member.username)}</span>
                  <div className="member-card__body">
                    <div className="member-card__top">
                      <strong>{getMemberDisplayName(member)}</strong>
                      <span className={`member-status member-status--${status.tone}`}>{status.label}</span>
                    </div>
                    <p>{[member.handle ? `@${member.handle}` : null, roleOf(member)].filter(Boolean).join(' · ')}</p>
                    {member.goal && <p className="member-card__goal">{goalLabels[member.goal]}</p>}
                  </div>
                </li>
              )
            })}
          </ul>

          {cursor && (
            <div className="members-panel__more">
              <button type="button" className="secondary-button" disabled={loadingMore} onClick={() => void loadMore()}>
                {loadingMore ? m.loading : m.showMore}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
