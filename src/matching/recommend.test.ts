import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { recommend } from './recommend.ts'
import { normalizeSkill } from '../../server/src/matching/recommend.ts'
import { createAiSkillResolver } from '../../server/src/matching/skill-ai.ts'
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
  const ios = candidate('ios', 'find_job', { role: 'iOS Developer', skills: ['iOS Developer', 'Swift'] })
  const frontend = candidate('frontend', 'find_job', { role: 'Frontend Developer', skills: ['FrontDev'] })
  const other = candidate('generalist', 'find_job', { role: 'Full Stack Developer', skills: ['Full Stack Developer', 'Python'] })
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

test('matches the requested hiring role against the applicant role in both directions', () => {
  const employer = candidate('employer', 'hire', { role: 'Recruiter', lookingFor: ['Backend Developer'], skills: ['Swift'] })
  const backend = candidate('backend', 'find_job', { role: 'Backend', skills: ['Go', 'PostgreSQL'] })
  const ios = candidate('ios', 'find_job', { role: 'iOS Developer', skills: ['Swift'], lookingFor: ['Swift'] })

  const hired = recommend(employer, [ios, backend], 'en')
  assert.deepEqual(hired.map(result => result.candidate.id), ['backend'])
  assert.match(hired[0].explanation, /applicant's role matches your request: Backend/)
  assert.match(hired[0].icebreaker ?? '', /"Backend"/)
  const hiring = recommend(backend, [employer], 'en')
  assert.deepEqual(hiring.map(result => result.candidate.id), ['employer'])
  assert.match(hiring[0].explanation, /employer is looking for someone in your role: Backend Developer/)
  assert.match(hiring[0].icebreaker ?? '', /"Backend Developer"/)
  assert.deepEqual(recommend(employer, [ios]), [])
  assert.deepEqual(recommend(ios, [employer]), [])
  assert.deepEqual(recommend({ ...employer, lookingFor: ['Go'] }, [{ ...ios, role: 'Go' }]), [])
})

test('corrects a single typo in a known role and preserves distinct technologies', () => {
  const employer = candidate('employer', 'hire', { lookingFor: ['Backend Developer'] })
  const backend = candidate('backend', 'find_job', { skills: ['BacEnd'] })
  const ios = candidate('ios', 'find_job', { role: 'iOS Developer', skills: ['Swift'] })
  assert.deepEqual(recommend(employer, [backend, ios]).map(result => result.candidate.id), ['backend'])
  assert.deepEqual(recommend(backend, [employer]).map(result => result.candidate.id), ['employer'])
  for (const label of ['BacEnd', 'backeend', 'BakCend', 'backand developer']) {
    assert.equal(normalizeSkill(label), 'backend')
  }
  assert.notEqual(normalizeSkill('Swift'), normalizeSkill('Backend'))
  assert.notEqual(normalizeSkill('Java'), normalizeSkill('JavaScript'))
  assert.notEqual(normalizeSkill('C#'), normalizeSkill('C++'))
})

test('uses embeddings to nominate a role and accepts only LLM-approved nominations', async () => {
  const paths: string[] = []
  const resolver = createAiSkillResolver({
    baseUrl: 'http://ollama.test:11434',
    fetcher: async (url, init) => {
      const path = new URL(String(url)).pathname
      paths.push(path)
      const body = JSON.parse(String(init?.body))
      if (path === '/api/embed') {
        assert.deepEqual(body.input.slice(-3), ['server-side engineer', 'mobile engineer', 'web developer'])
        const basis = (i: number) => Array.from({ length: 5 }, (_, j) => Number(i === j))
        return Response.json({
          embeddings: [basis(0), basis(1), basis(2), basis(3), basis(4), basis(0), basis(3), [1, 1, 0, 0, 0]],
        })
      }
      assert.equal(path, '/api/chat')
      const nominations = JSON.parse(body.messages[1].content)
      assert.deepEqual(nominations.map((item: { id: number }) => item.id), [0, 1])
      return Response.json({ message: { content: JSON.stringify({ approved: [0, 2] }) } })
    },
  })
  const labels = ['server-side engineer', 'mobile engineer', 'web developer', 'Swift', 'BacEnd']
  const key = await resolver(labels, normalizeSkill)
  assert.deepEqual(paths, ['/api/embed', '/api/chat'])
  assert.equal(key('Server-side Engineer'), 'backend')
  assert.equal(key('mobile engineer'), 'mobile engineer')
  assert.equal(key('web developer'), 'web developer')
  assert.equal(key('Swift'), 'swift')
  assert.equal(key('BacEnd'), 'backend')
  const recruiter = candidate('employer', 'hire', { lookingFor: ['Backend'] })
  const backend = candidate('backend', 'find_job', { skills: ['Server-side Engineer'] })
  const ios = candidate('ios', 'find_job', { skills: ['Swift'] })
  assert.deepEqual(recommend(recruiter, [ios, backend], 'kk', key).map(item => item.candidate.id), ['backend'])
  assert.deepEqual(recommend(backend, [recruiter], 'kk', key).map(item => item.candidate.id), ['employer'])
  await resolver(labels, normalizeSkill)
  assert.equal(paths.length, 2)
})

test('falls back to local matching on model failure or when models are disabled', async () => {
  const disabled = createAiSkillResolver({ fetcher: () => assert.fail('unexpected network call') })
  const offline = createAiSkillResolver({
    baseUrl: 'http://ollama.test:11434',
    fetcher: async () => new Response('', { status: 503 }),
  })
  for (const resolve of [disabled, offline]) {
    const key = await resolve(['server-side engineer', 'BacEnd', 'Swift'], normalizeSkill)
    assert.equal(key('server-side engineer'), 'server-side engineer')
    assert.equal(key('BacEnd'), 'backend')
    assert.equal(key('Swift'), 'swift')
  }
})

test('prefers complementary skills when seeking a cofounder', () => {
  const skills = ['Python', 'FastAPI', 'PostgreSQL', 'Redis']
  const results = recommend({ ...input, goal: 'find_cofounder', skills, lookingFor: ['Sales', 'Product management'] }, [
    candidate('developer', 'find_cofounder', { skills, lookingFor: skills }),
    candidate('sales', 'find_cofounder', { skills: ['B2B-продажи'] }),
    candidate('product-and-sales', 'find_cofounder', { skills: ['Продажи', 'Продуктовая стратегия'] }),
  ])
  assert.deepEqual(results.map(result => result.candidate.id), ['product-and-sales', 'sales', 'developer'])
  assert.match(results[0].explanation, /Продажи, Продуктовая стратегия/)
  assert.match(results[1].icebreaker ?? '', /B2B-продажи/)
})

test('uses multilingual aliases and keeps specialized cofounder requests directional', () => {
  const aliases = [
    ['Sales', 'Продажи', 'Сату'],
    ['Marketing', 'Маркетинг'],
    ['Product management', 'Product', 'Продукт', 'Управление продуктом', 'Өнімді басқару'],
    ['Computer Vision', 'Компьютерное зрение'],
    ['A/B testing', 'A/B', 'A/B-тест', 'A/B-тесты', 'A/B-тестирование'],
    ['Go', 'Golang'],
    ['Kubernetes', 'k8s'],
    ['Node.js', 'Node', 'NodeJS'],
  ]
  for (const [canonical, ...variants] of aliases) {
    for (const variant of variants) {
      assert.equal(normalizeSkill(variant), normalizeSkill(canonical), variant)
    }
  }
  assert.notEqual(normalizeSkill('B2B-продажи'), normalizeSkill('Продажи'))

  const [match] = recommend(
    { ...input, goal: 'find_cofounder', lookingFor: ['B2B Sales'], interests: ['A/B-тесты'] },
    [
      candidate('general', 'find_cofounder', { skills: ['Продажи'], interests: [] }),
      candidate('specialist', 'find_cofounder', { skills: ['B2B-продажи'], interests: ['A/B-тестирование'] }),
    ],
  )
  assert.equal(match.candidate.id, 'specialist')
  assert.match(match.explanation, /общие интересы: A\/B-тестирование/)
})

test('finds at least three relevant people in each of the three audit scenarios', () => {
  const pool: Candidate[] = JSON.parse(readFileSync(new URL('../data/profiles.json', import.meta.url), 'utf8'))
  const j1 = recommend({
    ...input, role: 'Junior Frontend-разработчик', skills: ['JavaScript', 'React', 'HTML', 'CSS'],
    interests: ['Веб-доступность', 'Стартапы'],
  }, pool)
  const j2 = recommend({
    ...input, role: 'Аналитик данных', goal: 'find_mentor', skills: ['SQL', 'Excel'],
    lookingFor: ['Python', 'A/B-тестирование'], interests: ['Продуктовая аналитика', 'A/B-тесты'],
  }, pool)
  const j3 = recommend({
    ...input, role: 'ML engineer', goal: 'find_cofounder', experienceYears: 4,
    skills: ['Python', 'PyTorch', 'Computer Vision'], lookingFor: ['Sales', 'Marketing', 'Product management'],
    interests: ['EdTech', 'Startups'],
  }, pool)

  const j1Skills = new Set(['javascript', 'react', 'html', 'css', 'typescript'])
  const analyst = /аналитик|продуктов.*аналит/i
  const businessSkills = new Set([
    'sales', 'b2b sales', 'marketing', 'product management', 'product strategy', 'управление пилотами',
  ])
  const j1Relevant = j1.filter(({ candidate }) => candidate.goal === 'hire' &&
    candidate.lookingFor?.some(skill => j1Skills.has(normalizeSkill(skill))))
  const j2Experienced = j2.filter(({ candidate }) => candidate.goal === 'be_mentor' && candidate.experienceYears > 1)
  const j2Strict = j2Experienced.filter(({ candidate }) => analyst.test(candidate.role))
  const j2Formal = j2Experienced.filter(({ candidate }) => analyst.test(candidate.role) ||
    candidate.skills.map(normalizeSkill).some(skill => skill === 'python' || skill === 'a/b testing'))
  const j3Relevant = j3.filter(({ candidate }) => candidate.goal === 'find_cofounder' &&
    candidate.skills.some(skill => businessSkills.has(normalizeSkill(skill))))
  assert.ok(j1Relevant.length >= 3, `J1: ${j1Relevant.length}/5`)
  assert.ok(j2Formal.length >= 3 && j2Strict.length >= 3, `J2: ${j2Formal.length}/5, strict ${j2Strict.length}/5`)
  assert.ok(j3Relevant.length >= 3, `J3: ${j3Relevant.length}/5`)
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

test('uses a confirmed searched-for skill in the icebreaker', () => {
  const [result] = recommend(input, [
    candidate('a', 'hire', { name: 'Данияр', role: 'Рекрутер', skills: [], lookingFor: ['FastAPI'], interests: [] }),
  ])
  assert.match(result.icebreaker ?? '', /Данияр.*FastAPI.*задачи/)
})

test('excludes unrelated pairs for mentoring, cofounders and experience exchange', () => {
  const ios: ProfileInput = {
    ...input, role: 'iOS Developer', skills: ['Swift'], lookingFor: ['SwiftUI', 'Combine'],
    interests: ['iOS'],
  }
  for (const [goal, reciprocal] of pairs.slice(2)) {
    const unrelated = [
      candidate('go', reciprocal, { role: 'Go Developer', skills: ['Go'], experienceYears: 9, interests: [] }),
      candidate('ux', reciprocal, { role: 'UX Designer', skills: ['Figma'], experienceYears: 0, interests: ['UX'] }),
    ]
    assert.deepEqual(recommend({ ...ios, goal }, unrelated), [], goal)
  }
})

test('returns only confirmed unique matches below five and caps larger pools at five', () => {
  const request: ProfileInput = { ...input, goal: 'exchange_experience', skills: [], interests: ['A/B-тесты'] }
  const unrelated = candidate('unrelated', 'exchange_experience', { interests: [] })
  const matches = ['a', 'b', 'c', 'd', 'e', 'f'].map(id =>
    candidate(id, 'exchange_experience', { interests: ['A/B-тестирование'] }))

  for (let count = 0; count <= matches.length; count++) {
    const available = matches.slice(0, count)
    const result = recommend(request, [unrelated, ...available, ...available])
    assert.deepEqual(result.map(item => item.candidate.id), available.slice(0, 5).map(item => item.id))
    assert.ok(result.every(item => item.icebreaker?.includes('A/B-тестирование')))
  }
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

test('keeps requested hiring skills once in explanations in all locales', () => {
  const employer = candidate('employer', 'hire', {
    skills: ['Golang', 'Postgres'], lookingFor: ['Go', 'PostgreSQL'],
  })
  const backend = candidate('backend', 'find_job', { skills: ['Go', 'PostgreSQL'] })
  const ios = candidate('ios', 'find_job', { role: 'iOS Developer', skills: ['Swift'] })

  for (const locale of ['ru', 'kk', 'en'] as const) {
    const results = recommend(employer, [ios, backend], locale)
    assert.deepEqual(results.map(result => result.candidate.id), ['backend'])
    assert.deepEqual(recommend(ios, [employer], locale), [])
    for (const result of [results[0], ...recommend(backend, [employer], locale)]) {
      assert.deepEqual(result.explanation.match(/\b(?:Go|Golang|Postgres|PostgreSQL)\b/g), ['Go', 'PostgreSQL'])
      assert.match(result.explanation, /API/)
      assert.match(result.icebreaker ?? '', /\bGo\b/)
    }
  }
})

test('gives the requested cofounder skills priority in a deduplicated explanation', () => {
  const [result] = recommend(
    { ...input, goal: 'find_cofounder', skills: ['JS', 'Python'], lookingFor: ['Sales', 'JavaScript'] },
    [candidate('cofounder', 'find_cofounder', {
      skills: ['JavaScript', 'Продажи'], lookingFor: ['JavaScript', 'Python'], interests: [],
    })],
    'en',
  )
  assert.match(result.explanation, /this participant has skills you need: JavaScript, Продажи, this participant is looking for your skills: Python/)
  assert.doesNotMatch(result.explanation, /\bJS\b/)
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
