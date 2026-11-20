import { useEffect, useState } from 'react'
import { InterestMap } from './components/InterestMap'
import { SchedulePanel } from './components/MeetingSlots'
import { ProfileForm } from './components/ProfileForm'
import { RecommendationResults } from './components/RecommendationResults'
import profiles from './data/profiles.json'
import { summarizeInterests } from './data/interestSummary'
import { parseCandidates, resolveAppCandidates } from './data/loadCandidates'
import { previewProfiles, sampleProfile } from './data/previewProfiles'
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
  const [locale, setLocale] = useState<Locale>('ru')
  const [view, setView] = useState<View>('profile')
  const [session, setSession] = useState<RecommendationSession>()
  const [bookings, setBookings] = useState<MeetingBooking[]>(() => loadBookings())
  const messages = getMessages(locale)

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  useEffect(() => {
    if (view === 'results') document.getElementById('results-title')?.focus()
    if (view === 'interests') document.getElementById('interest-map-title')?.focus()
  }, [session?.input, view])

  function handleLocaleChange(nextLocale: Locale) {
    setLocale(nextLocale)
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

  return (
    <>
      <header className="site-header">
        <div className="site-width header-inner">
          <span className="brand"><span className="brand-mark" aria-hidden="true">T</span>Tanys</span>
          <span className="header-context">{messages.header.context}</span>
          <div className="header-actions">
            <span className="demo-status">{messages.header.demoStatus}</span>
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
            <ProfileForm onSubmit={submit} example={sampleProfile} locale={locale} />
          </div>
          {view === 'results' && session && <RecommendationResults
            recommendations={session.recommendations}
            onEdit={handleEditProfile}
            onFeedback={handleFeedback}
            message={getResultsMessage(session, locale)}
            bookings={bookings}
            onBookSlot={handleBookSlot}
            onCancelSlot={handleCancelSlot}
            locale={locale}
          />}
          {view === 'schedule' && <>
            <div className="page-heading"><h1>{messages.meetings.pageTitle}</h1></div>
            <SchedulePanel bookings={bookings} onCancel={handleCancelSlot} locale={locale} />
          </>}
          {view === 'interests' && <InterestMap summary={interestSummary} locale={locale} />}
        </main>
      </div>
    </>
  )
}
