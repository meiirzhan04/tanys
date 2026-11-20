import { useEffect, useState } from 'react'
import {
  isAccountRoute,
  isAdminRoute,
  parseInviteLocation,
  saveAccountModePreference,
  savePendingInvite,
  syncAccountLocationUrl,
} from './api/inviteRoute'
import { AdminDashboard } from './components/AdminDashboard'
import { EventAccountFlow } from './components/EventAccountFlow'
import { InterestMap } from './components/InterestMap'
import { SchedulePanel } from './components/MeetingSlots'
import { PartnerBooths } from './components/PartnerBooths'
import { ProfileForm } from './components/ProfileForm'
import { RecommendationResults } from './components/RecommendationResults'
import profiles from './data/profiles.json'
import { DEMO_PARTNER_BOOTHS, recommendBooths } from './data/booths'
import { summarizeInterests } from './data/interestSummary'
import { parseCandidates, resolveAppCandidates } from './data/loadCandidates'
import { previewProfiles, sampleProfile } from './data/previewProfiles'
import { resolveInitialLocale, saveLocalePreference } from './i18n/localeStorage'
import { getMessages, SUPPORTED_LOCALES } from './i18n/messages'
import {
  localizeRecommendationSession,
  recordRecommendationFeedback,
  startRecommendationSession,
} from './matching/session'
import type { Feedback, RecommendationSession } from './matching/session'
import type { Candidate, Locale, ProfileInput } from './matching/types'
import { bookSlot, cancelSlotBooking, loadBookings, saveBookings } from './scheduling/slots'
import type { MeetingBooking } from './scheduling/slots'
import './styles.css'

const candidates: readonly Candidate[] = resolveAppCandidates(profiles, previewProfiles)
const interestSummary = summarizeInterests(parseCandidates(profiles))
type View = 'profile' | 'results' | 'schedule' | 'interests'
type Theme = 'light' | 'dark'
const THEME_STORAGE_KEY = 'tanys.theme.v3'

function resolveInitialTheme(): Theme {
  try {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(THEME_STORAGE_KEY) : null
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // Ignore storage restrictions.
  }
  return 'dark'
}

const HEADER_EXTRA = {
  ru: { toDark: 'Тёмная', toLight: 'Светлая' },
  kk: { toDark: 'Қараңғы', toLight: 'Жарық' },
  en: { toDark: 'Dark', toLight: 'Light' },
} as const

const GCORE_HERO_COPY = {
  ru: {
    pill: '✦ Tanys Networking Engine',
    headline: 'Exact 1:1 Matches at Live Tech Events',
    subhead: 'Алгоритмический подбор собеседников по целям, стеку, опыту и свободным 20-минутным слотам.',
    nodes: [
      { code: '1:1', label: 'Слоты 20 мин' },
      { code: 'QR', label: 'Инвайт-пропуск' },
      { code: 'API', label: 'Стек и навыки' },
      { code: '6×', label: 'Цели встреч' },
      { code: 'TG', label: 'Обмен контактом' },
      { code: 'EXP', label: 'Стенды и темы' },
    ],
  },
  kk: {
    pill: '✦ Tanys Networking Engine',
    headline: 'Exact 1:1 Matches at Live Tech Events',
    subhead: 'Мақсат, стек, тәжірибе және бос 20 минуттық уақыт слоттары бойынша дәл серіктес таңдау.',
    nodes: [
      { code: '1:1', label: '20 мин слоттар' },
      { code: 'QR', label: 'Шақыру рұқсаты' },
      { code: 'API', label: 'Стек пен дағды' },
      { code: '6×', label: 'Кездесу мақсаты' },
      { code: 'TG', label: 'Контакт алмасу' },
      { code: 'EXP', label: 'Стендтер картасы' },
    ],
  },
  en: {
    pill: '✦ Tanys Networking Engine',
    headline: 'Exact 1:1 Matches at Live Tech Events',
    subhead: 'High-precision attendee matching across goals, engineering stack, seniority, and 20-minute slots.',
    nodes: [
      { code: '1:1', label: '20-min slots' },
      { code: 'QR', label: 'Instant pass' },
      { code: 'API', label: 'Stack matching' },
      { code: '6×', label: 'Goal alignment' },
      { code: 'TG', label: 'Contact reveal' },
      { code: 'EXP', label: 'Partner booths' },
    ],
  },
} as const

function getResultsMessage(session: RecommendationSession, locale: Locale): string {
  const t = getMessages(locale).results
  const count = session.recommendations.length
  if (session.feedback.size) {
    return t.feedbackSaved(count)
  }
  if (count > 0 && count < 5) {
    return t.partialMatches(count)
  }
  return ''
}

export default function App() {
  const [initialInvite] = useState(() => parseInviteLocation(window.location.pathname, window.location.search))
  const [mode, setMode] = useState<'demo' | 'account' | 'admin'>(() =>
    isAdminRoute(window.location.pathname, window.location.search)
      ? 'admin'
      : isAccountRoute(window.location.pathname, window.location.search)
        ? 'account'
        : 'demo',
  )
  const [theme, setTheme] = useState<Theme>(() => {
    const initial = resolveInitialTheme()
    if (typeof document !== 'undefined') document.documentElement.dataset.theme = initial
    return initial
  })
  const [exitRequestSeq, setExitRequestSeq] = useState(0)
  const [locale, setLocale] = useState<Locale>(() => {
    const initial = resolveInitialLocale()
    if (typeof document !== 'undefined') document.documentElement.lang = initial
    return initial
  })
  const [view, setView] = useState<View>('profile')
  const [session, setSession] = useState<RecommendationSession>()
  const [bookings, setBookings] = useState<MeetingBooking[]>(() => loadBookings())
  const messages = getMessages(locale)

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      // Ignore storage restrictions.
    }
  }, [theme])

  useEffect(() => {
    if (mode !== 'account') return
    saveAccountModePreference(true)
    syncAccountLocationUrl(true)
  }, [mode])

  useEffect(() => {
    if (view === 'results') document.getElementById('results-title')?.focus()
    if (view === 'interests') document.getElementById('interest-map-title')?.focus()
  }, [session?.input, view])

  function handleLocaleChange(nextLocale: Locale) {
    setLocale(nextLocale)
    saveLocalePreference(nextLocale)
    setSession(current => current && localizeRecommendationSession(current, nextLocale))
  }

  function handleEditProfile() {
    setView('profile')
    requestAnimationFrame(() => document.getElementById('profile-title')?.focus())
  }

  function submit(profile: ProfileInput) {
    setSession(startRecommendationSession(profile, candidates, locale))
    setView('results')
  }

  function handleFeedback(id: string, response: Feedback) {
    setSession(current => current && recordRecommendationFeedback(current, id, response))
  }

  function handleBookSlot(candidate: { id: string; name: string; role?: string }, slotId: string) {
    setBookings(current => {
      const result = bookSlot(current, candidate, slotId)
      if (!result.ok) return current
      saveBookings(result.bookings)
      return result.bookings
    })
  }

  function handleCancelSlot(slotId: string) {
    setBookings(current => {
      const next = cancelSlotBooking(current, slotId)
      saveBookings(next)
      return next
    })
  }

  const extra = HEADER_EXTRA[locale]
  const hero = GCORE_HERO_COPY[locale]

  function exitAdminToHome() {
    if (typeof window !== 'undefined' && window.history?.replaceState) {
      window.history.replaceState(null, '', '/')
    }
    setMode('demo')
  }

  return (
    <div className="app-shell">
      <div className="gcore-flare" aria-hidden="true" />
      <header className="site-header">
        <div className="site-width header-inner">
          <span className="brand"><span className="brand-mark" aria-hidden="true">T</span>Tanys</span>
          <span className="header-context">{messages.header.context}</span>
          <div className="header-actions">
            <button
              type="button"
              className="header-theme-btn"
              aria-pressed={theme === 'dark'}
              onClick={() => setTheme(current => (current === 'dark' ? 'light' : 'dark'))}
            >{theme === 'dark' ? extra.toLight : extra.toDark}</button>
            <button
              type="button"
              className="header-link-btn"
              onClick={() => {
                if (mode === 'account') {
                  setExitRequestSeq(current => current + 1)
                } else {
                  saveAccountModePreference(true)
                  syncAccountLocationUrl(true)
                  setMode('account')
                }
              }}
            >{mode === 'account' ? messages.account.backToDemo : messages.account.openAccount}</button>
            <div className="lang-switcher" role="group" aria-label={messages.languageSwitcherLabel}>
              {SUPPORTED_LOCALES.map(item => (
                <button
                  key={item.code}
                  type="button"
                  lang={item.code}
                  aria-label={item.label}
                  aria-pressed={locale === item.code}
                  onClick={() => handleLocaleChange(item.code)}
                >{item.shortLabel}</button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {mode === 'admin' ? (
        <AdminDashboard
          locale={locale}
          onBack={exitAdminToHome}
          onOpenAccount={() => {
            saveAccountModePreference(true)
            syncAccountLocationUrl(true)
            setMode('account')
          }}
        />
      ) : mode === 'account' ? (
        <EventAccountFlow
          locale={locale}
          initialInvite={initialInvite}
          exitRequestSeq={exitRequestSeq}
          onExitToDemo={() => {
            savePendingInvite(null)
            saveAccountModePreference(false)
            syncAccountLocationUrl(false)
            setMode('demo')
          }}
        />
      ) : (
        <div className="site-width workspace">
          <nav className="workspace-nav" aria-label={messages.nav.label}>
            <button type="button" aria-current={view === 'profile' ? 'page' : undefined} onClick={() => setView('profile')}>{messages.nav.profile}</button>
            <button type="button" disabled={!session} aria-current={view === 'results' ? 'page' : undefined} onClick={() => setView('results')}>
              {messages.nav.results} {session && <span className="nav-count">{session.recommendations.length}</span>}
            </button>
            <button type="button" aria-current={view === 'schedule' ? 'page' : undefined} onClick={() => setView('schedule')}>
              {messages.nav.schedule} <span className="nav-count">{bookings.length}</span>
            </button>
            <button type="button" aria-current={view === 'interests' ? 'page' : undefined} onClick={() => setView('interests')}>
              {messages.nav.interests}
            </button>
          </nav>

          <main className="main-content">
            <div hidden={view !== 'profile'}>
              <div className="gcore-hero surface" aria-hidden="true">
                <div className="gcore-hero__top">
                  <span className="gcore-pill">{hero.pill}</span>
                  <strong className="gcore-hero__title">{hero.headline}</strong>
                  <p className="gcore-hero__sub">{hero.subhead}</p>
                </div>
                <div className="gcore-circuit">
                  <svg className="gcore-circuit__svg" viewBox="0 0 760 210" fill="none" preserveAspectRatio="none">
                    <path className="trace-base" d="M120 42 H270 L320 92 H380" />
                    <path className="trace-pulse" d="M120 42 H270 L320 92 H380" />
                    <path className="trace-base" d="M84 105 H380" />
                    <path className="trace-pulse trace-pulse--d2" d="M84 105 H380" />
                    <path className="trace-base" d="M120 168 H270 L320 118 H380" />
                    <path className="trace-pulse trace-pulse--d3" d="M120 168 H270 L320 118 H380" />
                    <path className="trace-base" d="M640 42 H490 L440 92 H380" />
                    <path className="trace-pulse trace-pulse--d2" d="M640 42 H490 L440 92 H380" />
                    <path className="trace-base" d="M676 105 H380" />
                    <path className="trace-pulse trace-pulse--d3" d="M676 105 H380" />
                    <path className="trace-base" d="M640 168 H490 L440 118 H380" />
                    <path className="trace-pulse" d="M640 168 H490 L440 118 H380" />
                  </svg>
                  <div className="gcore-nodes-col">
                    {hero.nodes.slice(0, 3).map(n => (
                      <div key={n.code} className="gcore-node">
                        <span className="gcore-node__code">{n.code}</span>
                        <span className="gcore-node__label">{n.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="gcore-chip">
                    <span className="gcore-chip__core">AI · 1:1</span>
                    <span className="gcore-chip__sub">TANYS</span>
                  </div>
                  <div className="gcore-nodes-col gcore-nodes-col--right">
                    {hero.nodes.slice(3, 6).map(n => (
                      <div key={n.code} className="gcore-node">
                        <span className="gcore-node__code">{n.code}</span>
                        <span className="gcore-node__label">{n.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <ProfileForm onSubmit={submit} example={sampleProfile} locale={locale} />
            </div>
            {view === 'results' && session && <>
              <RecommendationResults
                recommendations={session.recommendations}
                onEdit={handleEditProfile}
                onFeedback={handleFeedback}
                message={getResultsMessage(session, locale)}
                bookings={bookings}
                onBookSlot={handleBookSlot}
                onCancelSlot={handleCancelSlot}
                locale={locale}
              />
              <PartnerBooths
                recommendations={recommendBooths(session.input, DEMO_PARTNER_BOOTHS, locale)}
                locale={locale}
              />
            </>}
            {view === 'schedule' && <>
              <div className="page-heading"><h1>{messages.meetings.pageTitle}</h1></div>
              <SchedulePanel bookings={bookings} onCancel={handleCancelSlot} locale={locale} />
            </>}
            {view === 'interests' && <InterestMap summary={interestSummary} locale={locale} />}
          </main>
        </div>
      )}
    </div>
  )
}
