import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import {
  isAccountRoute,
  isAdminRoute,
  parseInviteLocation,
  saveAccountModePreference,
  savePendingInvite,
  syncAccountLocationUrl,
} from './api/inviteRoute'
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

const AdminDashboard = lazy(() =>
  import('./components/AdminDashboard').then(m => ({ default: m.AdminDashboard })),
)

const candidates: readonly Candidate[] = resolveAppCandidates(profiles, previewProfiles)
const interestSummary = summarizeInterests(parseCandidates(profiles))
type View = 'profile' | 'results' | 'schedule' | 'interests'
type Theme = 'light' | 'dark'
const THEME_STORAGE_KEY = 'tanys.theme.v3'

function readSavedThemePreference(): Theme | null {
  try {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(THEME_STORAGE_KEY) : null
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // Ignore storage restrictions.
  }
  return null
}

function resolveInitialTheme(): Theme {
  const saved = readSavedThemePreference()
  if (saved) return saved
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    if (window.matchMedia('(prefers-color-scheme: light)').matches) return 'light'
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark'
  }
  return 'dark'
}

const HEADER_EXTRA = {
  ru: { toDark: 'Тёмная тема', toLight: 'Светлая тема' },
  kk: { toDark: 'Қараңғы тема', toLight: 'Жарық тема' },
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

function TanysLogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg
      className="tanys-logo-svg"
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="tanysFlame" x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FF7A2F" />
          <stop offset="55%" stopColor="#FF5500" />
          <stop offset="100%" stopColor="#C83800" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="36" height="36" rx="10" fill="url(#tanysFlame)" />
      <path
        d="M11.5 13.5H28.5M20 13.5V28.5M13.5 23.5L20 18.5L26.5 23.5"
        stroke="#FFFFFF"
        strokeWidth="2.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="11.5" cy="13.5" r="2.1" fill="#FFFFFF" />
      <circle cx="28.5" cy="13.5" r="2.1" fill="#FFFFFF" />
      <circle cx="20" cy="28.5" r="2.1" fill="#FFFFFF" />
    </svg>
  )
}

const GCORE_HERO_COPY = {
  ru: {
    pill: '✦ Добро пожаловать в Tanys',
    headline: 'Умный 1:1 нетворкинг для живых IT-митапов',
    subhead: 'Алгоритм соединяет инженеров, тимлидов, менторов и фаундеров по целям, стеку и 20-минутным слотам.',
    moreLabel: 'Как устроен подбор 1:1',
    ctaForm: 'Заполнить анкету ↓',
    nodes: [
      { code: '1:1', label: 'Слоты 20 мин' },
      { code: 'QR', label: 'Инвайт-пропуск' },
      { code: 'API', label: 'Стек и навыки' },
      { code: '6×', label: 'Цели встреч' },
      { code: 'TG', label: 'Обмен контактом' },
      { code: 'EXP', label: 'Стенды и темы' },
    ],
    pillars: [
      { step: '01', title: 'Точный подбор по целям', desc: 'Поиск работы, найм, менторство, поиск кофаундера или обмен опытом без случайных анкет.' },
      { step: '02', title: 'Слоты встреч по 20 минут', desc: 'Бронирование общих свободных окон в один клик с защитой от пересечений в расписании.' },
      { step: '03', title: 'QR-пропуск и приватность', desc: 'Мгновенный вход в событие по QR-коду организатора; личный контакт открывается только взаимно.' },
    ],
  },
  kk: {
    pill: '✦ Tanys платформасына қош келдіңіз',
    headline: 'IT-митаптар мен конференцияларға арналған 1:1 нетворкинг',
    subhead: 'Алгоритм инженерлерді, тимлидтерді, менторлар мен фаундерлерді мақсат, стек және 20 минуттық слоттар бойынша байланыстырады.',
    moreLabel: '1:1 іріктеу қалай жұмыс істейді',
    ctaForm: 'Анкетаны толтыру ↓',
    nodes: [
      { code: '1:1', label: '20 мин слоттар' },
      { code: 'QR', label: 'Шақыру рұқсаты' },
      { code: 'API', label: 'Стек пен дағды' },
      { code: '6×', label: 'Кездесу мақсаты' },
      { code: 'TG', label: 'Контакт алмасу' },
      { code: 'EXP', label: 'Стендтер картасы' },
    ],
    pillars: [
      { step: '01', title: 'Мақсат бойынша дәл сәйкестік', desc: 'Жұмыс табу, маман жалдау, менторлық, кофаундер іздеу және тәжірибе алмасу.' },
      { step: '02', title: '20 минуттық дайын слоттар', desc: 'Ортақ бос уақытты бір батырмамен брондау және кесте қақтығыстарын болдырмау.' },
      { step: '03', title: 'QR-рұқсат және құпиялылық', desc: 'Ұйымдастырушы QR-кодымен жылдам кіру; жеке контакт тек өзара келісіммен ашылады.' },
    ],
  },
  en: {
    pill: '✦ Welcome to Tanys',
    headline: 'Precision 1:1 Networking for Live Tech Events',
    subhead: 'Algorithmic matching connecting engineers, hiring leads, mentors, and founders by goals, stack, and 20-minute slots.',
    moreLabel: 'How 1:1 matching works',
    ctaForm: 'Fill profile ↓',
    nodes: [
      { code: '1:1', label: '20-min slots' },
      { code: 'QR', label: 'Instant pass' },
      { code: 'API', label: 'Stack matching' },
      { code: '6×', label: 'Goal alignment' },
      { code: 'TG', label: 'Contact reveal' },
      { code: 'EXP', label: 'Partner booths' },
    ],
    pillars: [
      { step: '01', title: 'Goal-aligned matching', desc: 'Job search, hiring, mentorship, cofounder discovery, and peer engineering exchange.' },
      { step: '02', title: '20-minute conflict-free slots', desc: 'One-click booking across shared open time windows with automatic conflict prevention.' },
      { step: '03', title: 'QR event pass & mutual privacy', desc: 'Scan an organizer QR pass to join; personal contacts unlock only on mutual acceptance.' },
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
  const messages = getMessages(locale)

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const media = window.matchMedia('(prefers-color-scheme: light)')
    const onChange = () => {
      if (!readSavedThemePreference()) {
        setTheme(media.matches ? 'light' : 'dark')
      }
    }
    media.addEventListener?.('change', onChange)
    return () => media.removeEventListener?.('change', onChange)
  }, [])

  function handleToggleTheme() {
    setTheme(current => {
      const next: Theme = current === 'dark' ? 'light' : 'dark'
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next)
      } catch {
        // Ignore storage restrictions.
      }
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
      if (view === 'results' || view === 'interests' || view === 'schedule') {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
      }
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

  function handleEditProfile() {
    setView('profile')
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    }
    requestAnimationFrame(() => document.getElementById('profile-title')?.focus({ preventScroll: true }))
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
      <div className="gcore-flare" aria-hidden="true" />
      <header className="site-header">
        <div className="site-width header-inner">
          <span className="brand">
            <TanysLogoMark size={30} />
            <span className="brand-word">Tanys</span>
            <span className="brand-tag" aria-hidden="true">1:1</span>
          </span>

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
                  saveAccountModePreference(true)
                  syncAccountLocationUrl(true)
                  setMode('account')
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
            onOpenAccount={() => {
              saveAccountModePreference(true)
              syncAccountLocationUrl(true)
              setMode('account')
            }}
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
                <div className="gcore-hero__compact">
                  <div className="welcome-emblem">
                    <span className="welcome-emblem__ring" />
                    <TanysLogoMark size={38} />
                  </div>
                  <div className="gcore-hero__copy">
                    <div className="gcore-hero__badges">
                      <span className="gcore-pill">{hero.pill}</span>
                    </div>
                    <strong className="gcore-hero__title">{hero.headline}</strong>
                    <p className="gcore-hero__sub">{hero.subhead}</p>
                  </div>
                  <span
                    className="gcore-hero__cta"
                    onClick={() => {
                      const el = document.querySelector<HTMLElement>('.profile-form select, .profile-form input')
                      el?.focus()
                    }}
                  >
                    {hero.ctaForm}
                  </span>
                </div>

                <details className="gcore-hero__details">
                  <summary className="gcore-hero__summary">{hero.moreLabel}</summary>
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
                      <TanysLogoMark size={30} />
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

                  <div className="welcome-pillars">
                    {hero.pillars.map(p => (
                      <div key={p.step} className="welcome-pillar">
                        <span className="welcome-pillar__step">{p.step}</span>
                        <strong>{p.title}</strong>
                        <p>{p.desc}</p>
                      </div>
                    ))}
                  </div>
                </details>
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
