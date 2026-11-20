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
