import { recommend } from './recommend.ts'
import type { Candidate, Locale, ProfileInput, Recommendation } from './types'

export type Feedback = 'met' | 'not_a_fit'

export interface RecommendationSession {
  readonly input: ProfileInput
  readonly candidates: readonly Candidate[]
  readonly recommendations: readonly Recommendation[]
  readonly feedback: ReadonlyMap<string, Feedback>
  readonly locale: Locale
}

export function startRecommendationSession(
  input: ProfileInput,
  candidates: readonly Candidate[],
  locale: Locale = 'ru',
): RecommendationSession {
  return { input, candidates, recommendations: recommend(input, candidates, locale), feedback: new Map(), locale }
}

export function recordRecommendationFeedback(
  session: RecommendationSession,
  candidateId: string,
  response: Feedback,
): RecommendationSession {
  // Only accept feedback from a visible card. This also ignores repeat clicks.
  if (!session.recommendations.some(({ candidate }) => candidate.id === candidateId)) return session

  const feedback = new Map(session.feedback).set(candidateId, response)
  const remaining = session.candidates.filter(candidate => !feedback.has(candidate.id))

  return { ...session, feedback, recommendations: recommend(session.input, remaining, session.locale) }
}

export function localizeRecommendationSession(
  session: RecommendationSession,
  locale: Locale,
): RecommendationSession {
  if (session.locale === locale) return session
  const remaining = session.candidates.filter(candidate => !session.feedback.has(candidate.id))
  return { ...session, locale, recommendations: recommend(session.input, remaining, locale) }
}
