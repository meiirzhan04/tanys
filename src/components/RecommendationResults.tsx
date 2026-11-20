import { useEffect, useId, useRef, useState } from 'react'
import type { IntroductionStatus, ReportReason } from '../api/client'
import { getMessages } from '../i18n/messages'
import type { Feedback } from '../matching/session'
import type { Locale, Recommendation } from '../matching/types'
import type { MeetingBooking } from '../scheduling/slots'
import { getCandidateGoalLabels } from './goalLabels'
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
  onRequestIntro?: (candidateId: string) => void
  introStatus?: IntroductionStatus
  requestingIntro?: boolean
  onBlockParticipant?: (candidateId: string) => void
  onReportParticipant?: (candidateId: string, reason: ReportReason, details: string) => void
  locale: Locale
}

function RecommendationCard({
  recommendation,
  onFeedback,
  bookings,
  onBookSlot,
  onCancelSlot,
  onRequestIntro,
  introStatus,
  requestingIntro = false,
  onBlockParticipant,
  onReportParticipant,
  locale,
}: RecommendationCardProps) {
  const { candidate, icebreaker } = recommendation
  const [copyState, setCopyState] = useState<CopyState>('')
  const [expanded, setExpanded] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState<ReportReason>('spam')
  const [reportDetails, setReportDetails] = useState('')
  const detailsId = useId()
  const t = getMessages(locale).results
  const social = getMessages(locale).social
  const mod = getMessages(locale).moderation
  const goalBadges = getCandidateGoalLabels(locale)

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
            <p className="goal-label">{goalBadges[candidate.goal]}</p>
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
        {onRequestIntro && (
          <div className="intro-action-row">
            {introStatus ? (
              <span className={`status-badge status-badge--${introStatus}`}>
                {introStatus === 'pending'
                  ? social.alreadyRequested
                  : introStatus === 'accepted'
                    ? social.statusAccepted
                    : introStatus === 'declined'
                      ? social.statusDeclined
                      : social.statusWithdrawn}
              </span>
            ) : (
              <button
                type="button"
                className="primary-button"
                disabled={requestingIntro}
                onClick={() => onRequestIntro(candidate.id)}
              >{requestingIntro ? social.requestingIntro : social.requestIntro}</button>
            )}
          </div>
        )}
        <RecommendationFeedback candidateId={candidate.id} candidateName={candidate.name} onFeedback={onFeedback} locale={locale} />
        {(onBlockParticipant || onReportParticipant) && (
          <div className="moderation-controls">
            {onBlockParticipant && (
              <button
                type="button"
                className="meeting-slot-cancel"
                onClick={() => onBlockParticipant(candidate.id)}
              >{mod.blockButton}</button>
            )}
            {onReportParticipant && (
              <button
                type="button"
                className="text-button"
                aria-expanded={reportOpen}
                onClick={() => setReportOpen(current => !current)}
              >{mod.reportButton}</button>
            )}
          </div>
        )}
        {reportOpen && onReportParticipant && (
          <form
            className="report-form"
            onSubmit={event => {
              event.preventDefault()
              onReportParticipant(candidate.id, reportReason, reportDetails.trim())
              setReportOpen(false)
              setReportDetails('')
            }}
          >
            <label className="field">
              <span>{mod.reportReasonLabel}</span>
              <select
                name="reportReason"
                value={reportReason}
                onChange={event => setReportReason(event.target.value as ReportReason)}
              >
                <option value="spam">{mod.reasons.spam}</option>
                <option value="harassment">{mod.reasons.harassment}</option>
                <option value="fake_profile">{mod.reasons.fake_profile}</option>
                <option value="other">{mod.reasons.other}</option>
              </select>
            </label>
            <label className="field">
              <span>{mod.reportDetailsLabel}</span>
              <input
                name="reportDetails"
                maxLength={500}
                placeholder={mod.reportDetailsPlaceholder}
                value={reportDetails}
                onChange={event => setReportDetails(event.target.value)}
              />
            </label>
            <div className="social-card__actions">
              <button type="submit" className="primary-button">{mod.submitReport}</button>
              <button type="button" className="secondary-button" onClick={() => setReportOpen(false)}>{mod.cancelReport}</button>
            </div>
          </form>
        )}
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
  onRequestIntro,
  introStatusByCandidate,
  requestingIntroId,
  onBlockParticipant,
  onReportParticipant,
  onRefresh,
  refreshing = false,
  locale = 'ru',
}: ResultsProps & {
  onFeedback: FeedbackHandler
  message: string
  bookings?: readonly MeetingBooking[]
  onBookSlot?: BookSlotHandler
  onCancelSlot?: CancelSlotHandler
  onRequestIntro?: (candidateId: string) => void
  introStatusByCandidate?: Readonly<Record<string, IntroductionStatus>>
  requestingIntroId?: string
  onBlockParticipant?: (candidateId: string) => void
  onReportParticipant?: (candidateId: string, reason: ReportReason, details: string) => void
  onRefresh?: () => void
  refreshing?: boolean
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
        <div className="page-heading__actions">
          {onRefresh && (
            <button
              type="button"
              className="secondary-button results-refresh-btn"
              disabled={refreshing}
              onClick={onRefresh}
            >{refreshing ? t.refreshing : t.refresh}</button>
          )}
          <button type="button" className="secondary-button" onClick={onEdit}>{t.editProfile}</button>
        </div>
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
            onRequestIntro={onRequestIntro}
            introStatus={introStatusByCandidate?.[recommendation.candidate.id]}
            requestingIntro={requestingIntroId === recommendation.candidate.id}
            onBlockParticipant={onBlockParticipant}
            onReportParticipant={onReportParticipant}
            locale={locale}
          />
        ))}
      </div> : <div className="surface empty-state">
        <h2>{t.emptyTitle}</h2>
        <p>{t.emptyBody}</p>
        <div className="empty-state__actions">
          <button type="button" className="primary-button" onClick={onEdit}>{t.editProfile}</button>
          {onRefresh && (
            <button
              type="button"
              className="secondary-button results-refresh-btn"
              disabled={refreshing}
              onClick={onRefresh}
            >{refreshing ? t.refreshing : t.refresh}</button>
          )}
        </div>
      </div>}
    </section>
  )
}
