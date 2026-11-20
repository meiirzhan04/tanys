import assert from 'node:assert/strict'
import test from 'node:test'
import { getProfileCompleteness } from './profileCompleteness.ts'
import type { ProfileSnapshot } from './profileCompleteness.ts'

const full: ProfileSnapshot = {
  goal: 'find_job',
  role: 'Backend Developer',
  experienceYears: 3,
  skills: ['Python', 'FastAPI', 'PostgreSQL'],
  interests: ['API', 'DevOps'],
  about: 'Пишу backend на Python, ищу команду с сильной инженерной культурой и code review.',
  lookingFor: ['Backend Developer'],
}

test('a fully filled profile scores 100% with nothing missing', () => {
  assert.deepEqual(getProfileCompleteness(full), { percent: 100, missing: [] })
})

test('lists thin skills, interests and a short bio as missing', () => {
  const result = getProfileCompleteness({ ...full, skills: ['Python'], interests: ['API'], about: 'Коротко.' })
  assert.deepEqual(result.missing, ['skills', 'interests', 'about'])
  assert.equal(result.percent, 57)
})

test('only asks for "looking for" on goals that use it', () => {
  assert.deepEqual(getProfileCompleteness({ ...full, lookingFor: [] }).missing, ['lookingFor'])
  assert.deepEqual(getProfileCompleteness({ ...full, goal: 'exchange_experience', lookingFor: [] }).missing, [])
})

test('an empty draft reports every check as missing', () => {
  const result = getProfileCompleteness({
    goal: '',
    role: ' ',
    experienceYears: null,
    skills: [],
    interests: [],
    about: '',
    lookingFor: [],
  })
  assert.equal(result.percent, 0)
  assert.deepEqual(result.missing, ['goal', 'role', 'experience', 'skills', 'interests', 'about'])
})
