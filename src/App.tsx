import { useEffect, useState } from 'react'
import { ProfileForm } from './components/ProfileForm'
import { RecommendationResults } from './components/RecommendationResults'
import profiles from './data/profiles.json'
import { previewProfiles, sampleProfile } from './data/previewProfiles'
import { recommend } from './matching/recommend'
import { recordRecommendationFeedback, startRecommendationSession } from './matching/session'
import type { Feedback, RecommendationSession } from './matching/session'
import type { Candidate, ProfileInput } from './matching/types'
import './styles.css'

const candidates: readonly Candidate[] = [...profiles as Candidate[], ...previewProfiles]
const sample = recommend(sampleProfile, candidates)[0]

export default function App() {
  const [profile, setProfile] = useState<ProfileInput>()
  const [session, setSession] = useState<RecommendationSession>()

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
          message={session.feedback.size ? `Отметка сохранена. Рекомендаций · ${session.recommendations.length}` : ""}
        /> : <>
          <div className="intro">
            <h1>С кем познакомиться<br className="intro-break" /> на митапе?</h1>
            <p>Заполните анкету, чтобы получить до пяти рекомендаций для знакомства.</p>
          </div>
          <div className="workspace">
            <ProfileForm initialProfile={profile} onSubmit={submit} example={sampleProfile} />
            <aside className="sample-panel" aria-labelledby="sample-title">
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
            </aside>
          </div>
        </>}
      </main>
    </>
  )
}
