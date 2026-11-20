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

test('shows the job seeker only employers looking for a skill they have', () => {
  const results = recommend(input, [
    candidate('design', 'hire', { skills: ['Python'], lookingFor: ['Figma'], interests: ['API'] }),
    candidate('python', 'hire', { skills: [], lookingFor: [' python ', 'PYTHON', 'FastAPI'], interests: [] }),
  ])
  assert.deepEqual(results.map(result => result.candidate.id), ['python'])
  assert.match(results[0].explanation, /Python, FastAPI/)
})

test('shows only the two matching backend applicants in a mixed pool, with a relevant introduction', () => {
  const employer = { ...input, goal: 'hire' as const, skills: ['Swift'], lookingFor: ['Python', 'Postgres'] }
  const backendPython = candidate('backend-python', 'find_job', { skills: ['Python', 'FastAPI'] })
  const backendPostgres = candidate('backend-postgres', 'find_job', { skills: ['PostgreSQL'] })
  const frontend = candidate('frontend', 'find_job', { skills: ['React', 'TypeScript'] })
  const ios = candidate('ios', 'find_job', { skills: ['Swift'] })

  const results = recommend(employer, [ios, frontend, backendPython, backendPostgres], 'kk')
  assert.deepEqual(results.map(result => result.candidate.id), ['backend-postgres', 'backend-python'])
  assert.match(results[0].icebreaker ?? '', /«PostgreSQL»/)
  assert.match(results[1].icebreaker ?? '', /«Python»/)
  assert.deepEqual(recommend(employer, [ios, frontend]), [])
  assert.deepEqual(recommend(ios, [candidate('employer', 'hire', employer)]), [])
})

test('uses shared skills for older hiring profiles without requested skills', () => {
  const employer = { ...input, goal: 'hire' as const }
  const backend = candidate('backend', 'find_job', { skills: ['Python'] })
  const ios = candidate('ios', 'find_job', { skills: ['Swift'] })
  assert.deepEqual(recommend(employer, [backend, ios]).map(result => result.candidate.id), ['backend'])
  assert.deepEqual(recommend(ios, [candidate('employer', 'hire', employer)]), [])
})

test('recognizes role aliases in both hiring directions without treating related stacks as equivalents', () => {
  const employer = candidate('employer', 'hire', { lookingFor: ['Backend Developer'] })
  const backend = candidate('backend', 'find_job', { skills: ['BackDev'] })
  const ios = candidate('ios', 'find_job', { skills: ['iOS Developer', 'Swift'] })
  const frontend = candidate('frontend', 'find_job', { skills: ['FrontDev'] })
  const other = candidate('generalist', 'find_job', { skills: ['Full Stack Developer', 'Python'] })
  const candidates = [ios, frontend, other, backend]

  const results = recommend(employer, candidates, 'kk')
  assert.deepEqual(results.map(result => result.candidate.id), ['backend'])
  assert.match(results[0].icebreaker ?? '', /«BackDev»/)
  assert.deepEqual(recommend(backend, [employer]).map(result => result.candidate.id), ['employer'])
  assert.deepEqual(recommend(ios, [employer]), [])

  for (const alias of ['back-end dev', 'BACK-END   ENGINEER', 'бэкенд-разработчик', 'бекенд әзірлеуші']) {
    assert.deepEqual(recommend({ ...employer, lookingFor: [alias] }, candidates).map(result => result.candidate.id), ['backend'])
  }
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
  const [result] = recommend(input, [
    candidate('a', 'hire', { name: 'Данияр', role: 'Рекрутер', skills: [], lookingFor: ['FastAPI'], interests: [] }),
  ])
  const [fallback] = recommend({ ...input, goal: 'exchange_experience' }, [
    candidate('b', 'exchange_experience', { name: 'Алия', role: 'Продакт-менеджер', skills: [], interests: [] }),
  ])

  assert.match(result.icebreaker ?? '', /Данияр.*FastAPI.*задачи/)
  assert.match(fallback.icebreaker ?? '', /Алия.*Продакт-менеджер.*\?$/)
})

test('preserves eligible candidate IDs and raw profile facts across ru, kk, and en locales', () => {
  const pool = [
    candidate('c1', 'hire', { name: 'Данияр', role: 'Tech Lead', skills: ['Go'], lookingFor: ['Python', 'FastAPI'], interests: ['API'] }),
    candidate('c2', 'hire', { name: 'Алия', role: 'Engineering Manager', skills: ['Python'], lookingFor: ['FastAPI'], interests: ['API'] }),
    candidate('c3', 'hire', { name: 'Тимур', role: 'CTO', skills: ['Python'], lookingFor: [], interests: ['API'] }),
    candidate('c4', 'hire', { name: 'Мадина', role: 'HR', skills: [], lookingFor: ['React'], interests: ['API'] }),
    candidate('c5', 'hire', { name: 'Арман', role: 'Recruiter', skills: [], lookingFor: [], interests: [] }),
    candidate('c6', 'hire', { name: 'Жанна', role: 'Recruiter', skills: [], lookingFor: [], interests: [] }),
  ]

  const ru = recommend(input, pool, 'ru')
  const kk = recommend(input, pool, 'kk')
  const en = recommend(input, pool, 'en')

  assert.deepEqual(ru.map(item => item.candidate.id), ['c1', 'c2', 'c3'])
  assert.deepEqual(kk.map(item => item.candidate.id), ['c1', 'c2', 'c3'])
  assert.deepEqual(en.map(item => item.candidate.id), ['c1', 'c2', 'c3'])

  assert.match(kk[0].explanation, /Сіз жұмыс іздеп жүрсіз.*Python, FastAPI/)
  assert.match(kk[0].icebreaker ?? '', /^Сәлем, Данияр!.*«Python».*\?$/)
  assert.match(en[0].explanation, /You are looking for a job.*Python, FastAPI/)
  assert.match(en[0].icebreaker ?? '', /^Hi Данияр!.*"Python".*\?$/)
  assert.notEqual(ru[0].explanation, kk[0].explanation)
  assert.notEqual(ru[0].explanation, en[0].explanation)
  assert.notEqual(kk[0].explanation, en[0].explanation)
})

test('matches common skill aliases for skills and lookingFor without mutating labels (#92)', () => {
  const pool = [
    candidate('java-only', 'hire', { skills: ['Java'], lookingFor: ['Java'], interests: [] }),
    candidate('web-stack', 'hire', {
      skills: ['JavaScript', 'TypeScript', 'PostgreSQL', 'Node.js'],
      lookingFor: ['JavaScript', 'TypeScript', 'PostgreSQL', 'Node.js'],
      interests: [],
    }),
    candidate('partial', 'hire', { skills: ['TypeScript'], lookingFor: ['PostgreSQL'], interests: [] }),
  ]

  const shortForm = recommend(
    { ...input, skills: ['JS', 'TS', 'Postgres', 'NodeJS'], interests: [] },
    pool,
  )
  const longForm = recommend(
    { ...input, skills: ['JavaScript', 'TypeScript', 'PostgreSQL', 'Node.js'], interests: [] },
    pool,
  )

  assert.deepEqual(
    shortForm.map(item => item.candidate.id),
    longForm.map(item => item.candidate.id),
  )
  assert.equal(shortForm[0].candidate.id, 'web-stack')
  assert.match(shortForm[0].explanation, /JS, TS/)
  assert.deepEqual(shortForm[0].candidate.skills, ['JavaScript', 'TypeScript', 'PostgreSQL', 'Node.js'])
  assert.deepEqual(shortForm.map(item => item.candidate.id), ['web-stack', 'partial'])

  // JS and Java stay distinct.
  const jsVsJava = recommend({ ...input, skills: ['JS'], interests: [] }, [
    candidate('java', 'hire', { skills: ['Java'], lookingFor: ['Java'], interests: [] }),
    candidate('js', 'hire', { skills: ['JavaScript'], lookingFor: ['JavaScript'], interests: [] }),
  ])
  assert.deepEqual(jsVsJava.map(item => item.candidate.id), ['js'])

  // Repeating both aliases in one profile must not double-count score.
  const deduped = recommend(
    { ...input, goal: 'hire', skills: ['JS', 'JavaScript'], lookingFor: ['JS', 'JavaScript'], interests: [] },
    [
      candidate('duplicate-alias', 'find_job', { skills: ['JS', 'JavaScript'], interests: [] }),
      candidate('two-distinct', 'find_job', { skills: ['JavaScript', 'Postgres'], interests: [] }),
    ],
  )
  assert.equal(deduped[0].candidate.id, 'duplicate-alias')

  const noBoost = recommend(
    { ...input, goal: 'hire', skills: ['Postgres'], lookingFor: ['JS', 'Postgres'], interests: [] },
    [
      candidate('only-js-duplicated', 'find_job', { skills: ['JS', 'JavaScript'], interests: [] }),
      candidate('js-and-postgres', 'find_job', { skills: ['JavaScript', 'PostgreSQL'], interests: [] }),
    ],
  )
  assert.deepEqual(noBoost.map(item => item.candidate.id), ['js-and-postgres', 'only-js-duplicated'])
})
