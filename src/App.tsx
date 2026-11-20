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
const THEME_STORAGE_KEY = 'tanys.theme.v2'

function resolveInitialTheme(): Theme {
  try {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(THEME_STORAGE_KEY) : null
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // Ignore storage restrictions.
  }
  return 'light'
}

const HEADER_EXTRA = {
  ru: { admin: 'Админ', toDark: 'Тёмная', toLight: 'Светлая' },
  kk: { admin: 'Әкімші', toDark: 'Қараңғы', toLight: 'Жарық' },
  en: { admin: 'Admin', toDark: 'Dark', toLight: 'Light' },
} as const

const PHOTO_SHOWCASE_COPY = {
  ru: [
    {
      src: '/photos/meetup-hall.jpg',
      badge: 'Qazaq IT Community · Live',
      title: 'Живые IT-митапы и конференции',
      caption: 'Подбор собеседников под реальную программу и формат площадки.',
    },
    {
      src: '/photos/networking-talk.jpg',
      badge: '1:1 Нетворкинг · 20 мин',
      title: 'Точные слоты без хаоса',
      caption: 'Назначайте встречи по общим целям, стеку и свободным окнам.',
    },
    {
      src: '/photos/team-session.jpg',
      badge: 'QR Check-in · Стенды',
      title: 'Быстрый вход по QR-коду',
      caption: 'Сканируйте приглашение и сразу открывайте контакты и стенды.',
    },
  ],
  kk: [
    {
      src: '/photos/meetup-hall.jpg',
      badge: 'Qazaq IT Community · Live',
      title: 'Тікелей IT-митаптар мен конференциялар',
      caption: 'Нақты бағдарлама мен алаң форматына сай серіктес таңдау.',
    },
    {
      src: '/photos/networking-talk.jpg',
      badge: '1:1 Нетворкинг · 20 мин',
      title: 'Артық әуресіз нақты уақыттар',
      caption: 'Мақсат, стек және бос уақыт бойынша кездесулерді жоспарлаңыз.',
    },
    {
      src: '/photos/team-session.jpg',
      badge: 'QR Check-in · Стендтер',
      title: 'QR-код арқылы лезде кіру',
      caption: 'Шақыруды сканерлеп, байланыс пен серіктес стендтерін ашыңыз.',
    },
  ],
  en: [
    {
      src: '/photos/meetup-hall.jpg',
      badge: 'Qazaq IT Community · Live',
      title: 'Live IT meetups & tech conferences',
      caption: 'Curated introductions tailored to the real event schedule.',
    },
    {
      src: '/photos/networking-talk.jpg',
      badge: '1:1 Networking · 20 min',
      title: 'Focused 1:1 slots without noise',
      caption: 'Schedule meetings around shared goals, stack, and open windows.',
    },
    {
      src: '/photos/team-session.jpg',
      badge: 'QR Check-in · Booths',
      title: 'Instant QR event pass',
      caption: 'Scan an organizer invite link to unlock attendees and booths.',
    },
  ],
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

  function openAdminMode() {
    saveAccountModePreference(false)
    if (typeof window !== 'undefined' && window.history?.replaceState) {
      window.history.replaceState(null, '', '/admin')
    }
    setMode('admin')
  }

  function exitAdminToDemo() {
    if (typeof window !== 'undefined' && window.history?.replaceState) {
      window.history.replaceState(null, '', '/')
    }
    setMode('demo')
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="site-width header-inner">
          <span className="brand"><span className="brand-mark" aria-hidden="true">T</span>Tanys</span>
          <span className="header-context">{messages.header.context}</span>
          <div className="header-actions">
            {mode === 'demo' && <span className="demo-status">{messages.header.demoStatus}</span>}
            <button
              type="button"
              className="header-theme-btn"
              aria-pressed={theme === 'dark'}
              onClick={() => setTheme(current => (current === 'dark' ? 'light' : 'dark'))}
            >{theme === 'dark' ? extra.toLight : extra.toDark}</button>
            <button
              type="button"
              className="header-admin-btn"
              aria-pressed={mode === 'admin'}
              onClick={() => (mode === 'admin' ? exitAdminToDemo() : openAdminMode())}
            >{extra.admin}</button>
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
          onBack={exitAdminToDemo}
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
              <div className="photo-showcase-grid" aria-hidden="true">
                {PHOTO_SHOWCASE_COPY[locale].map(card => (
                  <article key={card.src} className="surface photo-card">
                    <div className="photo-card__media">
                      <img src={card.src} alt="" loading="lazy" />
                      <span className="photo-card__badge">{card.badge}</span>
                    </div>
                    <div className="photo-card__body">
                      <strong>{card.title}</strong>
                      <p>{card.caption}</p>
                    </div>
                  </article>
                ))}
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
