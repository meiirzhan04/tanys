import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import {
  isAccountRoute,
  isAdminRoute,
  parseInviteLocation,
  saveAccountModePreference,
  savePendingInvite,
  syncAccountLocationUrl,
} from './api/inviteRoute'
import { TanysWordmark } from './components/brand/TanysLogo'
import { shellCopy } from './components/connections/connectionsCopy'
import { BackToTop } from './components/shell/BackToTop'
import { SiteFooter } from './components/shell/SiteFooter'
import { EventAccountFlow } from './components/EventAccountFlow'
import { InterestMap } from './components/InterestMap'
import { Landing } from './components/landing/Landing'
import { ProfileOverview } from './components/profile/ProfileOverview'
import { profileCopy } from './components/profile/profileCopy'
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
import type { Candidate, Goal, Locale, ProfileInput } from './matching/types'
import { bookSlot, cancelSlotBooking, loadBookings, saveBookings } from './scheduling/slots'
import type { MeetingBooking } from './scheduling/slots'
import { resolveInitialTheme, saveThemePreference, subscribeSystemTheme } from './theme/themeStorage'
import type { Theme } from './theme/themeStorage'
import './styles.css'
import './components/connections/connections.css'

const AdminDashboard = lazy(() =>
  import('./components/AdminDashboard').then(m => ({ default: m.AdminDashboard })),
)

const candidates: readonly Candidate[] = resolveAppCandidates(profiles, previewProfiles)
const interestSummary = summarizeInterests(parseCandidates(profiles))
type View = 'profile' | 'results' | 'schedule' | 'interests' | 'me'
const LANDING_TOP_TOPICS = interestSummary.topics.slice(0, 5)

const HEADER_EXTRA = {
  ru: { toDark: 'Тёмная тема', toLight: 'Светлая тема' },
  kk: { toDark: 'Қараңғы режим', toLight: 'Жарық режим' },
  en: { toDark: 'Dark theme', toLight: 'Light theme' },
} as const

const LOCALE_META: Record<Locale, { code: string; name: string }> = {
  kk: { code: 'KZ', name: 'Қазақша' },
  ru: { code: 'RU', name: 'Русский' },
  en: { code: 'EN', name: 'English' },
}

function FlagSvg({ locale }: { locale: Locale }) {
  if (locale === 'kk') {
    return (
      <svg className="flag-svg" width="18" height="13" viewBox="0 0 18 13" aria-hidden="true">
        <rect width="18" height="13" rx="2.5" fill="#00AFCA" />
        <circle cx="9.5" cy="6.5" r="2.7" fill="#FEC50C" />
        <path d="M2.4 2.2v8.6" stroke="#FEC50C" strokeWidth="1.2" strokeLinecap="round" strokeDasharray="1.3 1.3" />
      </svg>
    )
  }
  if (locale === 'ru') {
    return (
      <svg className="flag-svg" width="18" height="13" viewBox="0 0 18 13" aria-hidden="true">
        <rect width="18" height="4.34" fill="#FFFFFF" />
        <rect y="4.33" width="18" height="4.34" fill="#0039A6" />
        <rect y="8.66" width="18" height="4.34" fill="#D52B1E" />
      </svg>
    )
  }
  return (
    <svg className="flag-svg" width="18" height="13" viewBox="0 0 18 13" aria-hidden="true">
      <rect width="18" height="13" rx="2.5" fill="#012169" />
      <path d="M0 0L18 13M18 0L0 13" stroke="#FFFFFF" strokeWidth="2.2" />
      <path d="M0 0L18 13M18 0L0 13" stroke="#C8102E" strokeWidth="1.1" />
      <path d="M9 0V13M0 6.5H18" stroke="#FFFFFF" strokeWidth="3.4" />
      <path d="M9 0V13M0 6.5H18" stroke="#C8102E" strokeWidth="2" />
    </svg>
  )
}

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
  const [langOpen, setLangOpen] = useState(false)
  const langRef = useRef<HTMLDivElement>(null)
  const langTriggerRef = useRef<HTMLButtonElement>(null)
  const langMenuRef = useRef<HTMLDivElement>(null)
  const [exitRequestSeq, setExitRequestSeq] = useState(0)
  const [locale, setLocale] = useState<Locale>(() => {
    const initial = resolveInitialLocale()
    if (typeof document !== 'undefined') document.documentElement.lang = initial
    return initial
  })
  const [view, setView] = useState<View>('profile')
  const [session, setSession] = useState<RecommendationSession>()
  const [bookings, setBookings] = useState<MeetingBooking[]>(() => loadBookings())
  const [goalRequest, setGoalRequest] = useState<{ goal: Goal; seq: number } | null>(null)
  const messages = getMessages(locale)

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => subscribeSystemTheme(setTheme), [])

  function handleToggleTheme() {
    setTheme(current => {
      const next: Theme = current === 'dark' ? 'light' : 'dark'
      saveThemePreference(next)
      return next
    })
  }

  useEffect(() => {
    if (!langOpen) return
    function onDocPointerDown(event: PointerEvent) {
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setLangOpen(false)
      }
    }
    function onDocKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setLangOpen(false)
        langTriggerRef.current?.focus({ preventScroll: true })
      }
    }
    document.addEventListener('pointerdown', onDocPointerDown)
    document.addEventListener('keydown', onDocKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onDocPointerDown)
      document.removeEventListener('keydown', onDocKeyDown)
    }
  }, [langOpen])

  useEffect(() => {
    if (mode !== 'account') return
    saveAccountModePreference(true)
    syncAccountLocationUrl(true)
  }, [mode])

  useEffect(() => {
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      if (view === 'results' || view === 'interests' || view === 'schedule' || view === 'me') {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
      }
    }
    if (view === 'me') {
      requestAnimationFrame(() => document.getElementById('me-title')?.focus({ preventScroll: true }))
    }
    if (view === 'results') {
      requestAnimationFrame(() => document.getElementById('results-title')?.focus({ preventScroll: true }))
    }
    if (view === 'interests') {
      requestAnimationFrame(() => document.getElementById('interest-map-title')?.focus({ preventScroll: true }))
    }
  }, [session?.input, view])

  function focusLangOption(indexOrActive: number | 'active') {
    requestAnimationFrame(() => {
      const items = langMenuRef.current?.querySelectorAll<HTMLButtonElement>('button[lang]')
      if (!items?.length) return
      if (indexOrActive === 'active') {
        const active = Array.from(items).find(item => item.getAttribute('aria-pressed') === 'true')
        ;(active ?? items[0]).focus({ preventScroll: true })
        return
      }
      const wrapped = ((indexOrActive % items.length) + items.length) % items.length
      items[wrapped].focus({ preventScroll: true })
    })
  }

  function handleLocaleChange(nextLocale: Locale, buttonEl?: HTMLButtonElement | null, viaKeyboard = false) {
    setLocale(nextLocale)
    saveLocalePreference(nextLocale)
    setSession(current => current && localizeRecommendationSession(current, nextLocale))
    setLangOpen(false)
    if (viaKeyboard) {
      langTriggerRef.current?.focus({ preventScroll: true })
    } else {
      buttonEl?.blur()
    }
  }

  function scrollToProfileForm(smooth: boolean) {
    requestAnimationFrame(() => {
      const title = document.getElementById('profile-title')
      if (!title) return
      const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      title.scrollIntoView({ block: 'start', behavior: smooth && !reduceMotion ? 'smooth' : 'instant' })
      title.focus({ preventScroll: true })
    })
  }

  function handleEditProfile() {
    setView('profile')
    scrollToProfileForm(false)
  }

  function handleStartFromLanding(goal?: Goal) {
    if (goal) setGoalRequest(current => ({ goal, seq: (current?.seq ?? 0) + 1 }))
    setView('profile')
    scrollToProfileForm(true)
  }

  function handleGoHome() {
    setView('profile')
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    }
  }

  function openAccountMode() {
    saveAccountModePreference(true)
    syncAccountLocationUrl(true)
    setMode('account')
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
  const me = profileCopy[locale]
  const metCount = session ? Array.from(session.feedback.values()).filter(value => value === 'met').length : 0
  const activeLocaleMeta = LOCALE_META[locale]

  function exitToDemoHome() {
    savePendingInvite(null)
    saveAccountModePreference(false)
    syncAccountLocationUrl(false)
    if (typeof window !== 'undefined' && window.history?.replaceState) {
      window.history.replaceState(null, '', '/')
    }
    setMode('demo')
  }

  return (
    <div className="app-shell">
      <div className="ambient-flare" aria-hidden="true" />
      <header className="site-header">
        <div className="site-width header-inner">
          {mode === 'demo' ? (
            <span className="brand-group">
              <button type="button" className="brand" aria-label="Tanys" onClick={handleGoHome}>
                <TanysWordmark size={28} />
              </button>
              <span className="demo-chip" title={shellCopy[locale].demoNote}>
                {shellCopy[locale].demoBadge}
                <span className="demo-chip__note"> · {shellCopy[locale].demoShort}</span>
              </span>
            </span>
          ) : (
            <span className="brand">
              <TanysWordmark size={28} />
            </span>
          )}

          <div className="header-actions">
            <button
              type="button"
              className="header-theme-btn"
              aria-label={theme === 'dark' ? extra.toLight : extra.toDark}
              title={theme === 'dark' ? extra.toLight : extra.toDark}
              aria-pressed={theme === 'dark'}
              onClick={handleToggleTheme}
            >
              {theme === 'dark' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.9" />
                  <path
                    d="M12 2.5V5M12 19V21.5M4.9 4.9L6.7 6.7M17.3 17.3L19.1 19.1M2.5 12H5M19 12H21.5M4.9 19.1L6.7 17.3M17.3 6.7L19.1 4.9"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M20.4 14.8A8.5 8.5 0 0 1 9.2 3.6a8.5 8.5 0 1 0 11.2 11.2Z"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>

            <div
              ref={langRef}
              className={`lang-switcher ${langOpen ? 'lang-switcher--open' : ''}`}
              role="group"
              aria-label={messages.languageSwitcherLabel}
              onBlur={event => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setLangOpen(false)
                }
              }}
            >
              <button
                ref={langTriggerRef}
                type="button"
                className="lang-switcher__trigger"
                aria-label={`${messages.languageSwitcherLabel}: ${activeLocaleMeta.name}`}
                aria-expanded={langOpen}
                aria-haspopup="true"
                aria-controls="lang-switcher-menu"
                onClick={event => {
                  const nextOpen = !langOpen
                  setLangOpen(nextOpen)
                  if (nextOpen && event.detail === 0) {
                    focusLangOption('active')
                  }
                }}
                onKeyDown={event => {
                  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                    event.preventDefault()
                    setLangOpen(true)
                    focusLangOption(event.key === 'ArrowUp' ? -1 : 0)
                  }
                }}
              >
                <FlagSvg locale={locale} />
                <span className="lang-switcher__code">{activeLocaleMeta.code}</span>
                <svg className="lang-switcher__caret" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              <div
                ref={langMenuRef}
                id="lang-switcher-menu"
                className="lang-switcher__menu"
                onKeyDown={event => {
                  const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button[lang]'))
                  const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement)
                  if (event.key === 'ArrowDown') {
                    event.preventDefault()
                    focusLangOption(currentIndex + 1)
                  } else if (event.key === 'ArrowUp') {
                    event.preventDefault()
                    focusLangOption(currentIndex - 1)
                  } else if (event.key === 'Home') {
                    event.preventDefault()
                    focusLangOption(0)
                  } else if (event.key === 'End') {
                    event.preventDefault()
                    focusLangOption(items.length - 1)
                  }
                }}
              >
                {SUPPORTED_LOCALES.map(item => {
                  const meta = LOCALE_META[item.code]
                  return (
                    <button
                      key={item.code}
                      type="button"
                      lang={item.code}
                      tabIndex={langOpen ? 0 : -1}
                      aria-label={item.label}
                      aria-pressed={locale === item.code}
                      onClick={event => handleLocaleChange(item.code, event.currentTarget, event.detail === 0)}
                    >
                      <FlagSvg locale={item.code} />
                      <span className="lang-option__code">{meta.code}</span>
                      <span className="lang-option__label">{item.shortLabel}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <button
              type="button"
              className="header-link-btn"
              onClick={() => {
                if (mode === 'account') {
                  setExitRequestSeq(current => current + 1)
                } else {
                  openAccountMode()
                }
              }}
            >{mode === 'account' ? messages.account.backToDemo : messages.account.openAccount}</button>
          </div>
        </div>
      </header>

      {mode === 'admin' ? (
        <Suspense fallback={null}>
          <AdminDashboard
            locale={locale}
            onBack={exitToDemoHome}
            onOpenAccount={openAccountMode}
          />
        </Suspense>
      ) : mode === 'account' ? (
        <EventAccountFlow
          locale={locale}
          initialInvite={initialInvite}
          exitRequestSeq={exitRequestSeq}
          onExitToDemo={exitToDemoHome}
        />
      ) : (
        <>
        {view === 'profile' && (
          <Landing
            locale={locale}
            topTopics={LANDING_TOP_TOPICS}
            profileCount={interestSummary.profileCount}
            onStart={() => handleStartFromLanding()}
            onPickGoal={goal => handleStartFromLanding(goal)}
            onOpenAccount={openAccountMode}
          />
        )}
        <div className="site-width workspace">
          <nav className="workspace-nav" aria-label={messages.nav.label}>
            <button type="button" aria-current={view === 'profile' ? 'page' : undefined} onClick={handleEditProfile}>{messages.nav.profile}</button>
            <button type="button" disabled={!session} aria-current={view === 'results' ? 'page' : undefined} onClick={() => setView('results')}>
              {messages.nav.results} {session && <span className="nav-count">{session.recommendations.length}</span>}
            </button>
            <button type="button" aria-current={view === 'schedule' ? 'page' : undefined} onClick={() => setView('schedule')}>
              {messages.nav.schedule} <span className="nav-count">{bookings.length}</span>
            </button>
            <button type="button" aria-current={view === 'interests' ? 'page' : undefined} onClick={() => setView('interests')}>
              {messages.nav.interests}
            </button>
            <button type="button" className="nav-profile-btn" aria-current={view === 'me' ? 'page' : undefined} onClick={() => setView('me')}>
              {me.navLabel}
            </button>
          </nav>

          <main className="main-content">
            <div hidden={view !== 'profile'}>
              <ProfileForm onSubmit={submit} example={sampleProfile} locale={locale} goalRequest={goalRequest} />
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
            {view === 'me' && (
              <ProfileOverview
                locale={locale}
                profile={session ? {
                  goal: session.input.goal,
                  role: session.input.role,
                  experienceYears: session.input.experienceYears,
                  skills: session.input.skills,
                  interests: session.input.interests,
                  about: session.input.about,
                  lookingFor: session.input.lookingFor ?? [],
                } : null}
                stats={[
                  { value: session?.recommendations.length ?? 0, label: me.statRecommendations },
                  { value: metCount, label: me.statMet },
                  { value: bookings.length, label: me.statBookings },
                ]}
                onEdit={handleEditProfile}
                onShowMatches={session ? () => setView('results') : undefined}
                footnote={me.demoNote}
              />
            )}
          </main>
        </div>
        </>
      )}
      <SiteFooter locale={locale} demo={mode === 'demo'} />
      <BackToTop locale={locale} />
    </div>
  )
}
