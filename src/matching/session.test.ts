import assert from 'node:assert/strict'
import { test } from 'node:test'
import { localizeRecommendationSession, recordRecommendationFeedback, startRecommendationSession } from './session.ts'
import type { RecommendationSession } from './session'
import type { Candidate, ProfileInput } from './types'

const input: ProfileInput = {
  role: 'Backend-разработчик', skills: ['Python'], experienceYears: 1, interests: ['API'], about: '', goal: 'find_job',
}

const candidates: Candidate[] = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'x'].map(id => ({
  ...input, id, name: id, goal: id === 'x' ? 'find_job' : 'hire',
}))

function ids(session: RecommendationSession) {
  return session.recommendations.map(({ candidate }) => candidate.id)
}

test('both feedback actions remove the candidate and refill from the compatible pool', () => {
  const initial = startRecommendationSession(input, candidates)
  const afterMeeting = recordRecommendationFeedback(initial, 'a', 'met')
  const afterMismatch = recordRecommendationFeedback(afterMeeting, 'b', 'not_a_fit')

  assert.deepEqual(ids(initial), ['a', 'b', 'c', 'd', 'e'])
  assert.deepEqual(ids(afterMeeting), ['b', 'c', 'd', 'e', 'f'])
  assert.deepEqual(ids(afterMismatch), ['c', 'd', 'e', 'f', 'g'])
  assert.deepEqual([...afterMismatch.feedback], [['a', 'met'], ['b', 'not_a_fit']])
  assert.equal(initial.feedback.size, 0)
})

test('ignores repeated clicks and candidate IDs outside the current results', () => {
  const first = startRecommendationSession(input, candidates)
  const second = recordRecommendationFeedback(first, 'a', 'met')

  assert.equal(recordRecommendationFeedback(second, 'a', 'not_a_fit'), second)
  assert.equal(recordRecommendationFeedback(second, 'x', 'met'), second)
  assert.equal(recordRecommendationFeedback(first, 'g', 'met'), first)
})

test('returns an empty list when the pool is exhausted and resets feedback for a new submission', () => {
  const smallPool = [candidates[0], candidates[7]]
  const first = startRecommendationSession(input, smallPool)
  const done = recordRecommendationFeedback(first, 'a', 'not_a_fit')
  const next = startRecommendationSession(input, smallPool)

  assert.deepEqual(ids(done), [])
  assert.deepEqual(ids(next), ['a'])
  assert.equal(next.feedback.size, 0)
})

test('localizing a session keeps input, feedback, and candidate IDs while translating texts', () => {
  const initial = startRecommendationSession(input, candidates, 'ru')
  const afterFeedback = recordRecommendationFeedback(initial, 'a', 'met')
  const inKazakh = localizeRecommendationSession(afterFeedback, 'kk')
  const inEnglish = localizeRecommendationSession(inKazakh, 'en')
  const afterNextFeedback = recordRecommendationFeedback(inEnglish, 'b', 'not_a_fit')

  assert.deepEqual(ids(afterFeedback), ['b', 'c', 'd', 'e', 'f'])
  assert.deepEqual(ids(inKazakh), ['b', 'c', 'd', 'e', 'f'])
  assert.deepEqual(ids(inEnglish), ['b', 'c', 'd', 'e', 'f'])
  assert.equal(inKazakh.input, input)
  assert.deepEqual([...inEnglish.feedback], [['a', 'met']])
  assert.match(inKazakh.recommendations[0].explanation, /Сіз жұмыс іздеп жүрсіз/)
  assert.match(inEnglish.recommendations[0].explanation, /You are looking for a job/)
  assert.match(afterNextFeedback.recommendations[0].explanation, /You are looking for a job/)
  assert.deepEqual(ids(afterNextFeedback), ['c', 'd', 'e', 'f', 'g'])
})
