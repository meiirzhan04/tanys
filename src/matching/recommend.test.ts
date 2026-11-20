import assert from 'node:assert/strict'
import { test } from 'node:test'
import { recommend } from './recommend.ts'
import type { Candidate, Goal, ProfileInput } from './types'

const input: ProfileInput = {
  role: 'Backend-разработчик',
  skills: ['Python', 'FastAPI'],
  experienceYears: 1,
  interests: ['API'],
  about: '',
  goal: 'find_job',
}

function candidate(id: string, goal: Goal, overrides: Partial<Candidate> = {}): Candidate {
  return { ...input, id, name: id, goal, ...overrides }
}

const pairs: ReadonlyArray<readonly [Goal, Goal]> = [
  ['find_job', 'hire'],
  ['hire', 'find_job'],
  ['find_mentor', 'be_mentor'],
  ['be_mentor', 'find_mentor'],
  ['find_cofounder', 'find_cofounder'],
  ['exchange_experience', 'exchange_experience'],
]

for (const [goal, reciprocal] of pairs) {
  test(`matches ${goal} only with ${reciprocal}`, () => {
    const candidates = pairs.map(([candidateGoal]) => candidate(candidateGoal, candidateGoal))
    const results = recommend({ ...input, goal }, candidates)
    assert.deepEqual(results.map(result => result.candidate.goal), [reciprocal])
    assert.ok(results[0].explanation.length > 0)
    assert.match(results[0].icebreaker ?? '', /Python.*\?$/)
  })
}

test('ranks a recruiter looking for the participant’s skills ahead of another recruiter', () => {
  const results = recommend(input, [
    candidate('design', 'hire', { skills: [], lookingFor: ['Figma'], interests: [] }),
    candidate('python', 'hire', { skills: [], lookingFor: [' python ', 'PYTHON', 'FastAPI'], interests: [] }),
  ])
  assert.deepEqual(results.map(result => result.candidate.id), ['python', 'design'])
  assert.match(results[0].explanation, /Python, FastAPI/)
  assert.doesNotMatch(results[1].explanation, /Figma|Python/)
})

test('prefers complementary skills when seeking a cofounder', () => {
  const results = recommend({ ...input, goal: 'find_cofounder', lookingFor: ['Продажи'] }, [
    candidate('developer', 'find_cofounder'),
    candidate('sales', 'find_cofounder', { skills: ['Продажи'], lookingFor: ['Python'] }),
  ])
  assert.equal(results[0].candidate.id, 'sales')
  assert.match(results[0].explanation, /Продажи/)
})

test('rewards experience in the correct mentorship direction', () => {
  const mentors = recommend({ ...input, goal: 'find_mentor' }, [
    candidate('a', 'be_mentor', { experienceYears: 0 }),
    candidate('b', 'be_mentor', { experienceYears: 5 }),
  ])
  assert.equal(mentors[0].candidate.id, 'b')
  assert.match(mentors[0].explanation, /больше лет опыта/)

  const mentees = recommend({ ...input, goal: 'be_mentor' }, [
    candidate('a', 'find_mentor', { experienceYears: 5 }),
    candidate('b', 'find_mentor', { experienceYears: 0 }),
  ])
  assert.equal(mentees[0].candidate.id, 'b')
})

test('returns up to five unique results with deterministic ties', () => {
  const candidates = ['g', 'f', 'e', 'd', 'c', 'b', 'a', 'g'].map(id => candidate(id, 'hire'))
  const ids = (pool: Candidate[]) => recommend(input, pool).map(result => result.candidate.id)
  assert.deepEqual(ids(candidates), ['a', 'b', 'c', 'd', 'e'])
  assert.deepEqual(ids([...candidates].reverse()), ['a', 'b', 'c', 'd', 'e'])
  assert.deepEqual(ids([candidates[0], candidates[7]]), ['g'])
  assert.deepEqual(ids([]), [])
})

test('uses a searched-for skill in the icebreaker and falls back to a fact from the profile', () => {
  const results = recommend(input, [
    candidate('a', 'hire', { name: 'Данияр', role: 'Рекрутер', skills: [], lookingFor: ['FastAPI'], interests: [] }),
    candidate('b', 'hire', { name: 'Алия', role: 'Продакт-менеджер', skills: [], interests: [] }),
  ])

  assert.match(results[0].icebreaker ?? '', /Данияр.*FastAPI.*задачи/)
  assert.match(results[1].icebreaker ?? '', /Алия.*Продакт-менеджер.*задачи/)
})
