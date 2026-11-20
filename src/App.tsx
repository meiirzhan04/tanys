import { useEffect, useState } from 'react'
import { SchedulePanel } from './components/MeetingSlots'
import { ProfileForm } from './components/ProfileForm'
import { RecommendationResults } from './components/RecommendationResults'
import profiles from './data/profiles.json'
import { resolveAppCandidates } from './data/loadCandidates'
import { previewProfiles, sampleProfile } from './data/previewProfiles'
import { recommend } from './matching/recommend'
import { recordRecommendationFeedback, startRecommendationSession } from './matching/session'
import type { Feedback, RecommendationSession } from './matching/session'
import type { Candidate, ProfileInput } from './matching/types'
import { bookSlot, cancelSlotBooking, loadBookings, saveBookings } from './scheduling/slots'
import type { MeetingBooking } from './scheduling/slots'
import './styles.css'

const candidates: readonly Candidate[] = resolveAppCandidates(profiles, previewProfiles)
const sample = recommend(sampleProfile, candidates)[0]

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
  const [profile, setProfile] = useState<ProfileInput>()
  const [session, setSession] = useState<RecommendationSession>()
  const [bookings, setBookings] = useState<MeetingBooking[]>(() => loadBookings())

  useEffect(() => {
    if (session) document.getElementById('results-title')?.focus()
  }, [session])

  function submit(nextProfile: ProfileInput) {
    setProfile(nextProfile)
    setSession(startRecommendationSession(nextProfile, candidates))
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
          <span className="brand"><span className="brand-mark" aria-hidden="true" />Tanys</span>
          <span className="demo-status"><span aria-hidden="true" />Демо · вымышленные анкеты</span>
        </div>
      </header>

      <main className="site-width main-content">
        {session ? <RecommendationResults
          recommendations={session.recommendations}
          onEdit={() => setSession(undefined)}
          onFeedback={handleFeedback}
          message={getResultsMessage(session)}
          bookings={bookings}
          onBookSlot={handleBookSlot}
          onCancelSlot={handleCancelSlot}
        /> : <>
          <div className="intro">
            <h1>С кем познакомиться<br className="intro-break" /> на митапе?</h1>
            <p>Заполните анкету, чтобы получить до пяти рекомендаций для знакомства.</p>
          </div>
          <div className="workspace">
            <ProfileForm initialProfile={profile} onSubmit={submit} example={sampleProfile} />
            {sample && <aside className="sample-panel" aria-labelledby="sample-title">
              <div className="sample-kicker">Пример рекомендации</div>
              <h2 id="sample-title">Первая встреча<br /> на митапе</h2>
              <div className="connection" aria-hidden="true">
                <span className="connection-node">Вы</span>
                <span className="connection-line" />
                <span className="connection-node connection-match">{sample.candidate.name[0]}</span>
              </div>
              <div className="sample-detail">
                <div className="sample-name">{sample.candidate.name}</div>
                <div className="sample-role">{sample.candidate.role}</div>
                <ul className="skill-list" aria-label="Навыки для вакансии">
                  {sample.candidate.lookingFor?.map(skill => <li key={skill}>{skill}</li>)}
                </ul>
                <p>{sample.explanation}</p>
              </div>
            </aside>}
          </div>
          {bookings.length > 0 && <SchedulePanel bookings={bookings} onCancel={handleCancelSlot} />}
        </>}
      </main>
    </>
  )
}
