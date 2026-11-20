import { useEffect, useState } from 'react'
import { SchedulePanel } from './components/MeetingSlots'
import { ProfileForm } from './components/ProfileForm'
import { RecommendationResults } from './components/RecommendationResults'
import profiles from './data/profiles.json'
import { resolveAppCandidates } from './data/loadCandidates'
import { previewProfiles, sampleProfile } from './data/previewProfiles'
import { recordRecommendationFeedback, startRecommendationSession } from './matching/session'
import type { Feedback, RecommendationSession } from './matching/session'
import type { Candidate, ProfileInput } from './matching/types'
import { bookSlot, cancelSlotBooking, loadBookings, saveBookings } from './scheduling/slots'
import type { MeetingBooking } from './scheduling/slots'
import './styles.css'

const candidates: readonly Candidate[] = resolveAppCandidates(profiles, previewProfiles)
type View = 'profile' | 'results' | 'schedule'

function getResultsMessage(session: RecommendationSession): string {
  const count = session.recommendations.length
  if (session.feedback.size) {
    return `Отметка сохранена. Рекомендаций · ${count}`
  }
  if (count > 0 && count < 5) {
    return `Показаны все доступные совпадения · ${count} из 5`
  }
  return ''
}

export default function App() {
  const [view, setView] = useState<View>('profile')
  const [session, setSession] = useState<RecommendationSession>()
  const [bookings, setBookings] = useState<MeetingBooking[]>(() => loadBookings())

  useEffect(() => {
    if (view === 'results') document.getElementById('results-title')?.focus()
  }, [session, view])

  function submit(profile: ProfileInput) {
    setSession(startRecommendationSession(profile, candidates))
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
          <span className="header-context">Нетворкинг на митапе</span>
          <span className="demo-status">Вымышленные анкеты</span>
        </div>
      </header>

      <div className="site-width workspace">
        <nav className="workspace-nav" aria-label="Разделы Tanys">
          <button type="button" aria-current={view === 'profile' ? 'page' : undefined} onClick={() => setView('profile')}>Анкета</button>
          <button type="button" disabled={!session} aria-current={view === 'results' ? 'page' : undefined} onClick={() => setView('results')}>
            Рекомендации {session && <span className="nav-count">{session.recommendations.length}</span>}
          </button>
          <button type="button" aria-current={view === 'schedule' ? 'page' : undefined} onClick={() => setView('schedule')}>
            Встречи <span className="nav-count">{bookings.length}</span>
          </button>
        </nav>

        <main className="main-content">
          <div hidden={view !== 'profile'}>
            <ProfileForm onSubmit={submit} example={sampleProfile} />
          </div>
          {view === 'results' && session && <RecommendationResults
            recommendations={session.recommendations}
            onEdit={() => setView('profile')}
            onFeedback={handleFeedback}
            message={getResultsMessage(session)}
            bookings={bookings}
            onBookSlot={handleBookSlot}
            onCancelSlot={handleCancelSlot}
          />}
          {view === 'schedule' && <>
            <div className="page-heading"><h1>Встречи</h1></div>
            <SchedulePanel bookings={bookings} onCancel={handleCancelSlot} />
          </>}
        </main>
      </div>
    </>
  )
}
