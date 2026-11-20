import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  evaluateRecommendation,
  loadScenariosFromDir,
  runScenario,
  validateCandidates,
} from './verify-matching.mjs'

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')

test('validateCandidates accepts current profiles.json and rejects duplicate ids', () => {
  const candidates = JSON.parse(readFileSync(join(rootDir, 'src', 'data', 'profiles.json'), 'utf8'))
  assert.deepEqual(validateCandidates(candidates), [])

  const duplicateErrors = validateCandidates([candidates[0], candidates[0]])
  assert.equal(duplicateErrors.length, 1)
  assert.match(duplicateErrors[0], /Duplicate candidate id/)
})

test('team-inputs.json loads 3 valid evaluation scenarios', () => {
  const scenarios = loadScenariosFromDir(join(rootDir, 'tests', 'scenarios'))
  assert.equal(scenarios.length, 3)
  for (const s of scenarios) {
    assert.ok(s.input.role)
    assert.ok(Array.isArray(s.input.skills))
    assert.equal(typeof s.input.experienceYears, 'number')
    assert.ok(s.input.goal)
  }
})

test('runScenario flags incompatible goals and checks SLA under 3000ms', () => {
  const candidates = JSON.parse(readFileSync(join(rootDir, 'src', 'data', 'profiles.json'), 'utf8'))
  const scenarios = loadScenariosFromDir(join(rootDir, 'tests', 'scenarios'))
  const mockRecommend = () => [
    { candidate: candidates[1], explanation: 'Совпадает Python и цель найма.' },
  ]
  const report = runScenario(mockRecommend, candidates, scenarios[0])
  assert.equal(report.total, 1)
  assert.equal(report.relevantCount, 1)
  assert.equal(report.withinSla, true)

  const incompatible = evaluateRecommendation(
    scenarios[0].input,
    { candidate: candidates[0], explanation: 'Тот же стек.' },
    scenarios[0].expected,
  )
  assert.equal(incompatible.ok, false)
})

test('checks the strict criteria recorded in independent fixtures', () => {
  const input = { goal: 'find_job' }
  const candidate = {
    goal: 'hire',
    skills: [' Python ', 'FastAPI'],
    lookingFor: ['Python', 'PostgreSQL'],
    interests: ['API'],
    experienceYears: 3,
    about: 'Ищем начинающего разработчика.',
  }
  const result = { candidate, explanation: 'Взаимные цели и общий стек.' }
  assert.deepEqual(evaluateRecommendation(input, result, {
    goal: 'hire',
    skillsAll: ['python', 'fastapi'],
    lookingForAny: ['Flask', 'PostgreSQL'],
    interestsAny: ['API'],
    minExperienceYears: 2,
    maxExperienceYears: 4,
    aboutIncludesAny: ['стажёр', 'Начинающ'],
  }), { ok: true })

  for (const [criteria, reason] of [
    [{ skillsAll: ['Python', 'Flask'] }, /required skills/],
    [{ lookingForAll: ['Python', 'FastAPI'] }, /required lookingFor/],
    [{ lookingForAny: ['React'] }, /any lookingFor/],
    [{ interestsAny: ['React'] }, /any interests/],
    [{ minExperienceYears: 4 }, /experience below/],
    [{ maxExperienceYears: 2 }, /experience above/],
    [{ aboutIncludesAny: ['senior'] }, /profile text/],
  ]) {
    const check = evaluateRecommendation(input, result, criteria)
    assert.equal(check.ok, false)
    assert.match(check.reason, reason)
  }
})
