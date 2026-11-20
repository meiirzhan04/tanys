import { useEffect, useId, useRef, useState } from 'react'
import { getMessages } from '../i18n/messages'
import type { Feedback } from '../matching/session'
import type { Locale, Recommendation } from '../matching/types'
import type { MeetingBooking } from '../scheduling/slots'
import { getGoalLabels } from './goalLabels'
import { CandidateMeetingPicker } from './MeetingSlots'
import { RecommendationFeedback } from './RecommendationFeedback'
import type { ResultsProps } from './props'

type FeedbackHandler = (id: string, response: Feedback) => void
type BookSlotHandler = (candidate: { id: string; name: string; role?: string }, slotId: string) => void
type CancelSlotHandler = (slotId: string) => void
type CopyState = '' | 'copied' | 'fallback'

interface RecommendationCardProps {
  recommendation: Recommendation
  onFeedback: FeedbackHandler
  bookings?: readonly MeetingBooking[]
  onBookSlot?: BookSlotHandler
  onCancelSlot?: CancelSlotHandler
  locale: Locale
}

function RecommendationCard({
  recommendation,
  onFeedback,
  bookings,
  onBookSlot,
  onCancelSlot,
  locale,
}: RecommendationCardProps) {
  const { candidate, icebreaker } = recommendation
  const [copyState, setCopyState] = useState<CopyState>('')
  const [expanded, setExpanded] = useState(false)
  const detailsId = useId()
  const t = getMessages(locale).results
  const goalLabels = getGoalLabels(locale)

  async function copyPhrase() {
    if (!icebreaker) return
    try {
      await navigator.clipboard.writeText(icebreaker)
      setCopyState('copied')
    } catch {
      setCopyState('fallback')
    }
  }

  const copyStatus = copyState === 'copied' ? t.copied : copyState === 'fallback' ? t.copyFallback : ''

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
        >{expanded ? t.collapse : t.expand}</button>
      </div>
      <div id={detailsId} className="result-details" hidden={!expanded}>
        {!!candidate.skills.length && <ul className="skill-list" aria-label={t.skillsAriaLabel}>
          {candidate.skills.map((skill, index) => <li key={index}>{skill}</li>)}
        </ul>}
        {icebreaker && <div className="icebreaker">
          <div className="phrase-heading">
            <strong>{t.icebreakerTitle}</strong>
            <button type="button" className="text-button" onClick={copyPhrase}>{t.copy}</button>
          </div>
          <p>{icebreaker}</p>
          <span className="copy-status" aria-live="polite">{copyStatus}</span>
        </div>}
        {bookings && onBookSlot && onCancelSlot && <CandidateMeetingPicker
          candidateId={candidate.id}
          candidateName={candidate.name}
          candidateRole={candidate.role}
          bookings={bookings}
          onBook={onBookSlot}
          onCancel={onCancelSlot}
          locale={locale}
        />}
        <RecommendationFeedback candidateId={candidate.id} candidateName={candidate.name} onFeedback={onFeedback} locale={locale} />
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
  locale = 'ru',
}: ResultsProps & {
  onFeedback: FeedbackHandler
  message: string
  bookings?: readonly MeetingBooking[]
  onBookSlot?: BookSlotHandler
  onCancelSlot?: CancelSlotHandler
  locale?: Locale
}) {
  const t = getMessages(locale).results
  const listRef = useRef<HTMLDivElement>(null)
  const pendingFocusIndexRef = useRef<number | null>(null)

  useEffect(() => {
    const targetIndex = pendingFocusIndexRef.current
    if (targetIndex === null) return
    pendingFocusIndexRef.current = null

    if (recommendations.length > 0) {
      const toggles = listRef.current?.querySelectorAll<HTMLButtonElement>('.row-toggle')
      const nextToggle = toggles?.[Math.min(targetIndex, toggles.length - 1)]
      nextToggle?.focus()
      return
    }

    document.getElementById('results-title')?.focus()
  }, [recommendations])

  function handleCardFeedback(id: string, response: Feedback) {
    const index = recommendations.findIndex(item => item.candidate.id === id)
    if (index >= 0) pendingFocusIndexRef.current = index
    onFeedback(id, response)
  }

  return (
    <section aria-labelledby="results-title">
      <div className="page-heading">
        <div><h1 id="results-title" tabIndex={-1}>{t.title}</h1><p role="status">{message || t.count(recommendations.length)}</p></div>
        <button type="button" className="secondary-button" onClick={onEdit}>{t.editProfile}</button>
      </div>
      {recommendations.length ? <div ref={listRef} className="results-list surface">
        <div className="directory-header" aria-hidden="true">
          <span>{t.directoryParticipant}</span><span>{t.directoryWhy}</span><span />
        </div>
        {recommendations.map(recommendation => (
          <RecommendationCard
            key={recommendation.candidate.id}
            recommendation={recommendation}
            onFeedback={handleCardFeedback}
            bookings={bookings}
            onBookSlot={onBookSlot}
            onCancelSlot={onCancelSlot}
            locale={locale}
          />
        ))}
      </div> : <div className="surface empty-state">
        <h2>{t.emptyTitle}</h2>
        <p>{t.emptyBody}</p>
      </div>}

    </section>
  )
}
