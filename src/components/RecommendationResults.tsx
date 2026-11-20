import { useState } from 'react'
import type { Feedback } from '../matching/session'
import type { Recommendation } from '../matching/types'
import { goalLabels } from './goalLabels'
import { RecommendationFeedback } from './RecommendationFeedback'
import type { ResultsProps } from './props'

type FeedbackHandler = (id: string, response: Feedback) => void

function RecommendationCard({ recommendation, onFeedback }: { recommendation: Recommendation; onFeedback: FeedbackHandler }) {
  const { candidate, icebreaker } = recommendation
  const [copyStatus, setCopyStatus] = useState('')

  async function copyPhrase() {
    if (!icebreaker) return
    try {
      await navigator.clipboard.writeText(icebreaker)
      setCopyStatus('Скопировано')
    } catch {
      setCopyStatus('Выделите и скопируйте текст вручную.')
    }
  }

  return (
    <article className="result-card surface" data-candidate-id={candidate.id}>
      <div className="candidate-heading">
        <div className="avatar" aria-hidden="true">{candidate.name[0]}</div>
        <div className="candidate-name"><h3>{candidate.name}</h3><p>{candidate.role}</p></div>
        <span className="goal-label">{goalLabels[candidate.goal]}</span>
      </div>
      {!!candidate.skills.length && <ul className="skill-list" aria-label="Навыки">
        {candidate.skills.map(skill => <li key={skill}>{skill}</li>)}
      </ul>}
      <p className="explanation">{recommendation.explanation}</p>
      {icebreaker && <div className="icebreaker">
        <div className="phrase-heading"><strong>Первая фраза</strong><button type="button" className="text-button" onClick={copyPhrase}>Скопировать</button></div>
        <p>{icebreaker}</p>
        <span className="copy-status" aria-live="polite">{copyStatus}</span>
      </div>}
      <RecommendationFeedback candidateId={candidate.id} candidateName={candidate.name} onFeedback={onFeedback} />
    </article>
  )
}

export function RecommendationResults({ recommendations, onEdit, onFeedback, message }: ResultsProps & { onFeedback: FeedbackHandler; message: string }) {
  return (
    <section aria-labelledby="results-title">
      <div className="results-heading">
        <div><h2 id="results-title" tabIndex={-1}>Кого стоит встретить</h2><p role="status">{message || `Рекомендаций · ${recommendations.length}`}</p></div>
        <button type="button" className="secondary-button" onClick={onEdit}>← Изменить анкету</button>
      </div>
      {recommendations.length ? <div className="results-grid">
        {recommendations.map(recommendation => <RecommendationCard key={recommendation.candidate.id} recommendation={recommendation} onFeedback={onFeedback} />)}
      </div> : <div className="surface empty-state">
        <h3>Список рекомендаций пуст</h3>
        <p>Измените цель знакомства, чтобы найти других участников.</p>
      </div>}
    </section>
  )
}
