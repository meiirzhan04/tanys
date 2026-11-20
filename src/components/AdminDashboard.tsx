import { useCallback, useEffect, useMemo, useState } from 'react'
import { defaultApiClient, isApiError } from '../api/client'
import type { AdminOverview, TanysApiClient } from '../api/client'
import type { Locale } from '../matching/types'

const ADMIN_COPY = {
  ru: {
    title: 'Админ-панель Tanys',
    subtitle: 'Все пользователи, выдача прав организатора, мероприятия, участники, знакомства, встречи и жалобы.',
    refresh: 'Обновить',
    loading: 'Загрузка данных платформы...',
    back: 'На главную',
    signInPrompt: 'Войдите в аккаунт с правами организатора или в первый аккаунт, чтобы открыть админ-панель.',
    forbiddenPrompt: 'Доступ ограничен: текущий аккаунт не имеет прав организатора (`can_create_events`).',
    openAccount: 'Войти в аккаунт',
    searchPlaceholder: 'Поиск по логину, событию, имени, роли или жалобе...',
    stats: {
      users: 'Пользователи',
      organizers: 'Организаторы',
      events: 'Мероприятия',
      profiles: 'Анкеты',
      introductions: 'Знакомства',
      meetingsReports: 'Встречи / Жалобы',
    },
    tabs: {
      all: 'Все блоки',
      users: 'Пользователи',
      events: 'Мероприятия',
      participants: 'Участники',
      social: 'Знакомства и встречи',
      reports: 'Жалобы',
    },
    grantOrg: 'Сделать орг.',
    revokeOrg: 'Снять орг.',
    roleOrg: 'Организатор',
    roleUser: 'Участник',
    empty: 'Пока нет записей.',
  },
  kk: {
    title: 'Tanys Әкімші панелі',
    subtitle: 'Барлық пайдаланушылар, ұйымдастырушы құқықтары, іс-шаралар, қатысушылар, танысулар, кездесулер және шағымдар.',
    refresh: 'Жаңарту',
    loading: 'Платформа деректері жүктелуде...',
    back: 'Басты бетке',
    signInPrompt: 'Әкімші панелін ашу үшін ұйымдастырушы аккаунтымен кіріңіз.',
    forbiddenPrompt: 'Қолжетімділік шектелген: ағымдағы аккаунтта ұйымдастырушы құқығы жоқ.',
    openAccount: 'Аккаунтқа кіру',
    searchPlaceholder: 'Логин, іс-шара, аты немесе рөлі бойынша іздеу...',
    stats: {
      users: 'Пайдаланушылар',
      organizers: 'Ұйымдастырушылар',
      events: 'Іс-шаралар',
      profiles: 'Анкеталар',
      introductions: 'Танысулар',
      meetingsReports: 'Кездесу / Шағым',
    },
    tabs: {
      all: 'Барлығы',
      users: 'Пайдаланушылар',
      events: 'Іс-шаралар',
      participants: 'Қатысушылар',
      social: 'Танысу және кездесу',
      reports: 'Шағымдар',
    },
    grantOrg: 'Орг. беру',
    revokeOrg: 'Орг. алу',
    roleOrg: 'Ұйымдастырушы',
    roleUser: 'Қатысушы',
    empty: 'Әзірге жазбалар жоқ.',
  },
  en: {
    title: 'Tanys Admin Panel',
    subtitle: 'Full visibility across users, organizer permissions, events, profiles, introductions, meetings, and moderation reports.',
    refresh: 'Refresh',
    loading: 'Loading platform overview...',
    back: 'Back to app',
    signInPrompt: 'Sign in with an organizer account (or the first account) to open the Admin Panel.',
    forbiddenPrompt: 'Access restricted: this account does not have organizer permissions yet.',
    openAccount: 'Open Account Sign In',
    searchPlaceholder: 'Search by username, event, participant, role, or report...',
    stats: {
      users: 'Users',
      organizers: 'Organizers',
      events: 'Events',
      profiles: 'Profiles',
      introductions: 'Introductions',
      meetingsReports: 'Meetings / Reports',
    },
    tabs: {
      all: 'All sections',
      users: 'Users',
      events: 'Events',
      participants: 'Participants',
      social: 'Intros & Meetings',
      reports: 'Reports',
    },
    grantOrg: 'Make organizer',
    revokeOrg: 'Revoke organizer',
    roleOrg: 'Organizer',
    roleUser: 'Participant',
    empty: 'No records yet.',
  },
} as const

type SectionTab = 'all' | 'users' | 'events' | 'participants' | 'social' | 'reports'

export function AdminDashboard({
  locale,
  onOpenAccount,
  onBack,
  api = defaultApiClient,
}: {
  locale: Locale
  onOpenAccount: () => void
  onBack: () => void
  api?: TanysApiClient
}) {
  const t = ADMIN_COPY[locale]
  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [authState, setAuthState] = useState<'ok' | 'unauth' | 'forbidden' | 'error'>('ok')
  const [errorMsg, setErrorMsg] = useState('')
  const [query, setQuery] = useState('')
  const [section, setSection] = useState<SectionTab>('all')
  const [busyUserId, setBusyUserId] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      const data = await api.getAdminOverview()
      setOverview(data)
      setAuthState('ok')
    } catch (error) {
      if (isApiError(error) && error.status === 401) {
        setAuthState('unauth')
      } else if (isApiError(error) && error.status === 403) {
        setAuthState('forbidden')
      } else {
        setAuthState('error')
        setErrorMsg(error instanceof Error ? error.message : 'Request failed')
      }
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => {
    void load()
  }, [load])

  async function toggleOrganizer(userId: string, nextValue: boolean) {
    if (busyUserId) return
    setBusyUserId(userId)
    setErrorMsg('')
    try {
      await api.setUserOrganizerRole(userId, nextValue)
      await load()
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Failed to update role')
    } finally {
      setBusyUserId('')
    }
  }

  const normalizedQuery = query.trim().toLowerCase()
  const matches = useCallback(
    (...values: Array<string | null | undefined>) => {
      if (!normalizedQuery) return true
      return values.some(val => val?.toLowerCase().includes(normalizedQuery))
    },
    [normalizedQuery],
  )

  const filteredUsers = useMemo(
    () => (overview?.users ?? []).filter(u => matches(u.username, u.id)),
    [overview?.users, matches],
  )
  const filteredEvents = useMemo(
    () => (overview?.events ?? []).filter(e => matches(e.name, e.timeZone, e.status, e.id)),
    [overview?.events, matches],
  )
  const filteredParticipants = useMemo(
    () => (overview?.participants ?? []).filter(p => matches(p.name, p.username, p.role, p.eventName, p.goal)),
    [overview?.participants, matches],
  )
  const filteredIntros = useMemo(
    () => (overview?.introductions ?? []).filter(i => matches(i.senderName, i.recipientName, i.eventName, i.status)),
    [overview?.introductions, matches],
  )
  const filteredMeetings = useMemo(
    () => (overview?.meetings ?? []).filter(m => matches(m.proposerName, m.peerName, m.eventName, m.status)),
    [overview?.meetings, matches],
  )
  const filteredReports = useMemo(
    () => (overview?.reports ?? []).filter(r => matches(r.subjectName, r.reporterName, r.eventName, r.reason, r.details)),
    [overview?.reports, matches],
  )

  if (authState === 'unauth' || authState === 'forbidden') {
    return (
      <main className="site-width account-main">
        <section className="surface status-panel bento-card--glass" aria-labelledby="admin-title">
          <h1 id="admin-title">{t.title}</h1>
          <p>{authState === 'unauth' ? t.signInPrompt : t.forbiddenPrompt}</p>
          <div className="status-actions">
            <button type="button" className="primary-button" onClick={onOpenAccount}>{t.openAccount}</button>
            <button type="button" className="secondary-button" onClick={onBack}>{t.back}</button>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="site-width admin-main" aria-labelledby="admin-title">
      <div className="page-heading">
        <div>
          <h1 id="admin-title">{t.title}</h1>
          <p>{t.subtitle}</p>
        </div>
        <div className="social-card__actions">
          <button type="button" className="secondary-button" disabled={loading} onClick={() => void load()}>
            {t.refresh}
          </button>
          <button type="button" className="secondary-button" onClick={onBack}>
            {t.back}
          </button>
        </div>
      </div>

      {errorMsg && <div className="error-banner" role="alert">{errorMsg}</div>}

      {loading && !overview ? (
        <div className="surface status-panel" role="status"><p>{t.loading}</p></div>
      ) : overview && (
        <div className="admin-layout">
          <section className="admin-kpi-grid">
            <article className="surface kpi-card">
              <span className="kpi-label">{t.stats.users}</span>
              <strong className="kpi-value">{overview.stats.usersCount}</strong>
            </article>
            <article className="surface kpi-card">
              <span className="kpi-label">{t.stats.organizers}</span>
              <strong className="kpi-value">{overview.stats.organizersCount}</strong>
            </article>
            <article className="surface kpi-card">
              <span className="kpi-label">{t.stats.events}</span>
              <strong className="kpi-value">{overview.stats.eventsCount}</strong>
            </article>
            <article className="surface kpi-card">
              <span className="kpi-label">{t.stats.profiles}</span>
              <strong className="kpi-value">{overview.stats.profilesCount}</strong>
            </article>
            <article className="surface kpi-card">
              <span className="kpi-label">{t.stats.introductions}</span>
              <strong className="kpi-value">{overview.stats.introductionsCount}</strong>
            </article>
            <article className="surface kpi-card">
              <span className="kpi-label">{t.stats.meetingsReports}</span>
              <strong className="kpi-value">{overview.stats.meetingsCount} / {overview.stats.reportsCount}</strong>
            </article>
          </section>

          <div className="surface admin-toolbar">
            <div className="purpose-toggle" role="tablist" aria-label={t.title}>
              {(['all', 'users', 'events', 'participants', 'social', 'reports'] as const).map(key => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={section === key}
                  aria-pressed={section === key}
                  onClick={() => setSection(key)}
                >{t.tabs[key]}</button>
              ))}
            </div>
            <input
              type="search"
              className="admin-search"
              placeholder={t.searchPlaceholder}
              value={query}
              onChange={event => setQuery(event.target.value)}
            />
          </div>

          <div className="bento-grid">
            {(section === 'all' || section === 'users') && (
              <section className="surface organizer-card bento-card">
                <h2>{t.tabs.users} ({filteredUsers.length})</h2>
                {filteredUsers.length === 0 ? <p className="social-card__hint">{t.empty}</p> : (
                  <div className="table-scroll">
                    <table className="interest-table admin-table">
                      <thead>
                        <tr>
                          <th>Login</th>
                          <th>Роль</th>
                          <th>События / Анкеты</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map(user => (
                          <tr key={user.id} data-admin-user={user.username || user.id}>
                            <th scope="row">{user.username || user.id}</th>
                            <td>
                              <span className={`status-badge ${user.canCreateEvents ? 'status-badge--accepted' : 'status-badge--pending'}`}>
                                {user.canCreateEvents ? t.roleOrg : t.roleUser}
                              </span>
                            </td>
                            <td>{user.eventsCount} / {user.profilesCount}</td>
                            <td>
                              <button
                                type="button"
                                className={user.canCreateEvents ? 'meeting-slot-cancel' : 'secondary-button'}
                                disabled={busyUserId === user.id}
                                onClick={() => void toggleOrganizer(user.id, !user.canCreateEvents)}
                              >{user.canCreateEvents ? t.revokeOrg : t.grantOrg}</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

            {(section === 'all' || section === 'events') && (
              <section className="surface organizer-card bento-card">
                <h2>{t.tabs.events} ({filteredEvents.length})</h2>
                {filteredEvents.length === 0 ? <p className="social-card__hint">{t.empty}</p> : (
                  <div className="table-scroll">
                    <table className="interest-table admin-table">
                      <thead>
                        <tr>
                          <th>Событие</th>
                          <th>Часовой пояс</th>
                          <th>Статус</th>
                          <th>Уч. / Анкеты</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredEvents.map(ev => (
                          <tr key={ev.id}>
                            <th scope="row">{ev.name}</th>
                            <td>{ev.timeZone}</td>
                            <td>
                              <span className={`status-badge ${ev.status === 'active' ? 'status-badge--accepted' : 'status-badge--cancelled'}`}>
                                {ev.status}
                              </span>
                            </td>
                            <td>{ev.memberCount} / {ev.profileCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

            {(section === 'all' || section === 'participants') && (
              <section className="surface organizer-card bento-card--wide">
                <h2>{t.tabs.participants} ({filteredParticipants.length})</h2>
                {filteredParticipants.length === 0 ? <p className="social-card__hint">{t.empty}</p> : (
                  <div className="table-scroll">
                    <table className="interest-table admin-table">
                      <thead>
                        <tr>
                          <th>Имя / Логин</th>
                          <th>Мероприятие</th>
                          <th>Роль и цель</th>
                          <th>Навыки / Интересы</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredParticipants.map(p => (
                          <tr key={`${p.eventId}:${p.userId}`}>
                            <th scope="row">{p.name}{p.username ? ` (@${p.username})` : ''}</th>
                            <td>{p.eventName}</td>
                            <td>{p.role} · {p.goal}</td>
                            <td>{p.skills.join(', ')} / {p.interests.join(', ')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

            {(section === 'all' || section === 'social') && (
              <>
                <section className="surface organizer-card bento-card">
                  <h2>{t.stats.introductions} ({filteredIntros.length})</h2>
                  {filteredIntros.length === 0 ? <p className="social-card__hint">{t.empty}</p> : (
                    <div className="social-list">
                      {filteredIntros.map(item => (
                        <article key={item.id} className="surface social-card">
                          <div className="social-card__header">
                            <div>
                              <h3>{item.senderName} → {item.recipientName}</h3>
                              <p className="social-card__role">{item.eventName}</p>
                            </div>
                            <span className={`status-badge status-badge--${item.status}`}>{item.status}</span>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>

                <section className="surface organizer-card bento-card">
                  <h2>Встречи ({filteredMeetings.length})</h2>
                  {filteredMeetings.length === 0 ? <p className="social-card__hint">{t.empty}</p> : (
                    <div className="social-list">
                      {filteredMeetings.map(m => (
                        <article key={m.id} className="surface social-card">
                          <div className="social-card__header">
                            <div>
                              <h3>{m.proposerName}{m.peerName ? ` ↔ ${m.peerName}` : ''}</h3>
                              <p className="social-card__role">{m.eventName} · {new Date(m.startsAt).toLocaleString()}</p>
                            </div>
                            <span className={`status-badge status-badge--${m.status}`}>{m.status}</span>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}

            {(section === 'all' || section === 'reports') && (
              <section className="surface organizer-card bento-card--wide">
                <h2>{t.tabs.reports} ({filteredReports.length})</h2>
                {filteredReports.length === 0 ? <p className="social-card__hint">{t.empty}</p> : (
                  <div className="social-list">
                    {filteredReports.map(r => (
                      <article key={r.id} className="surface social-card">
                        <div className="social-card__header">
                          <div>
                            <h3>{r.reporterName} → {r.subjectName}</h3>
                            <p className="social-card__role">{r.eventName} · {r.reason}{r.details ? ` — ${r.details}` : ''}</p>
                          </div>
                          <span className={`status-badge ${r.status === 'resolved' ? 'status-badge--accepted' : 'status-badge--pending'}`}>
                            {r.status}{r.action ? `: ${r.action}` : ''}
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
