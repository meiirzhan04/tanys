import { useId, useState } from 'react'
import type { Feedback } from '../matching/session'
import type { Recommendation } from '../matching/types'
import type { MeetingBooking } from '../scheduling/slots'
import { goalLabels } from './goalLabels'
import { CandidateMeetingPicker } from './MeetingSlots'
import { RecommendationFeedback } from './RecommendationFeedback'
import type { ResultsProps } from './props'

type FeedbackHandler = (id: string, response: Feedback) => void
type BookSlotHandler = (candidate: { id: string; name: string; role?: string }, slotId: string) => void
type CancelSlotHandler = (slotId: string) => void

interface RecommendationCardProps {
  recommendation: Recommendation
  onFeedback: FeedbackHandler
  bookings: readonly MeetingBooking[]
  onBookSlot: BookSlotHandler
  onCancelSlot: CancelSlotHandler
}

function RecommendationCard({
  recommendation,
  onFeedback,
  bookings,
  onBookSlot,
  onCancelSlot,
}: RecommendationCardProps) {
  const { candidate, icebreaker } = recommendation
  const [copyStatus, setCopyStatus] = useState('')
  const [expanded, setExpanded] = useState(false)
  const detailsId = useId()

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
    <article className="result-card" data-candidate-id={candidate.id}>
      <div className="result-row">
        <div className="candidate-heading">
          <span className="avatar" aria-hidden="true">{candidate.name[0]}</span>
          <div className="candidate-name">
            <h2>{candidate.name}</h2>
            <p>{candidate.role}</p>
            <p className="goal-label">{goalLabels[candidate.goal]}</p>
          </div>
        </div>
        <p className="explanation">{recommendation.explanation}</p>
        <button
          type="button"
          className="secondary-button row-toggle"
          aria-expanded={expanded}
          aria-controls={detailsId}
          onClick={() => setExpanded(current => !current)}
        >{expanded ? 'Свернуть' : 'Подробнее'}</button>
      </div>
      <div id={detailsId} className="result-details" hidden={!expanded}>
        {!!candidate.skills.length && <ul className="skill-list" aria-label="Навыки">
          {candidate.skills.map((skill, index) => <li key={index}>{skill}</li>)}
        </ul>}
        {icebreaker && <div className="icebreaker">
          <div className="phrase-heading">
            <strong>Первая фраза</strong>
            <button type="button" className="text-button" onClick={copyPhrase}>Скопировать</button>
          </div>
          <p>{icebreaker}</p>
          <span className="copy-status" aria-live="polite">{copyStatus}</span>
        </div>}
        <CandidateMeetingPicker
          candidateId={candidate.id}
          candidateName={candidate.name}
          candidateRole={candidate.role}
          bookings={bookings}
          onBook={onBookSlot}
          onCancel={onCancelSlot}
        />
        <RecommendationFeedback candidateId={candidate.id} candidateName={candidate.name} onFeedback={onFeedback} />
      </div>
    </article>
  )
}

export function RecommendationResults({
  recommendations,
  onEdit,
  onFeedback,
  message,
  bookings,
  onBookSlot,
  onCancelSlot,
}: ResultsProps & {
  onFeedback: FeedbackHandler
  message: string
  bookings: readonly MeetingBooking[]
  onBookSlot: BookSlotHandler
  onCancelSlot: CancelSlotHandler
}) {
  return (
    <section aria-labelledby="results-title">
      <div className="page-heading">
        <div><h1 id="results-title" tabIndex={-1}>Рекомендации</h1><p role="status">{message || `Рекомендаций · ${recommendations.length}`}</p></div>
        <button type="button" className="secondary-button" onClick={onEdit}>Изменить анкету</button>
      </div>
      {recommendations.length ? <div className="results-list surface">
        <div className="directory-header" aria-hidden="true">
          <span>Участник</span><span>Почему подходит</span><span />
        </div>
        {recommendations.map(recommendation => (
          <RecommendationCard
            key={recommendation.candidate.id}
            recommendation={recommendation}
            onFeedback={onFeedback}
            bookings={bookings}
            onBookSlot={onBookSlot}
            onCancelSlot={onCancelSlot}
          />
        ))}
      </div> : <div className="surface empty-state">
        <h3>Список рекомендаций пуст</h3>
        <p>Измените цель знакомства, чтобы найти других участников.</p>
      </div>}

    </section>
  )
}
