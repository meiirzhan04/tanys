import { recommend } from './recommend.ts'
import type { Candidate, ProfileInput, Recommendation } from './types'

export type Feedback = 'met' | 'not_a_fit'

export interface RecommendationSession {
  readonly input: ProfileInput
  readonly candidates: readonly Candidate[]
  readonly recommendations: readonly Recommendation[]
  readonly feedback: ReadonlyMap<string, Feedback>
}

export function startRecommendationSession(
  input: ProfileInput,
  candidates: readonly Candidate[],
): RecommendationSession {
  return { input, candidates, recommendations: recommend(input, candidates), feedback: new Map() }
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

  return { ...session, feedback, recommendations: recommend(session.input, remaining) }
}
