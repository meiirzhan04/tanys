import type { Feedback } from '../matching/session'

interface RecommendationFeedbackProps {
  candidateId: string
  candidateName: string
  onFeedback: (candidateId: string, response: Feedback) => void
}

export function RecommendationFeedback({ candidateId, candidateName, onFeedback }: RecommendationFeedbackProps) {
  return (
    <div role="group" aria-label={`Отзыв о рекомендации — ${candidateName}`}>
      <button type="button" onClick={() => onFeedback(candidateId, 'met')}>Познакомились</button>
      <button type="button" onClick={() => onFeedback(candidateId, 'not_a_fit')}>Не подошло</button>
    </div>
  )
}
