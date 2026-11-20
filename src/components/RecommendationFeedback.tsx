import { getMessages } from '../i18n/messages'
import type { Feedback } from '../matching/session'
import type { Locale } from '../matching/types'

interface RecommendationFeedbackProps {
  candidateId: string
  candidateName: string
  onFeedback: (candidateId: string, response: Feedback) => void
  locale?: Locale
}

export function RecommendationFeedback({
  candidateId,
  candidateName,
  onFeedback,
  locale = 'ru',
}: RecommendationFeedbackProps) {
  const t = getMessages(locale).feedback
  return (
    <div role="group" aria-label={t.groupLabel(candidateName)}>
      <button type="button" onClick={() => onFeedback(candidateId, 'met')}>{t.met}</button>
      <button type="button" onClick={() => onFeedback(candidateId, 'not_a_fit')}>{t.notAFit}</button>
    </div>
  )
}
