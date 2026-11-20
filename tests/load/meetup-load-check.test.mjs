import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateCandidates } from '../verify-matching.mjs'
import { generateSyntheticMeetupPool, runLocalMeetupBenchmark } from './meetup-load-check.mjs'

const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

describe('meetup scale load & quality verification (#61)', () => {
  test('generates >= 300 unique valid synthetic participants covering all six goals', () => {
    const base = JSON.parse(readFileSync(join(ROOT_DIR, 'src', 'data', 'profiles.json'), 'utf8'))
    const pool = generateSyntheticMeetupPool(base, 320)
    assert.equal(pool.length, 320)
    assert.deepEqual(validateCandidates(pool), [])
    const goals = new Set(pool.map(p => p.goal))
    assert.equal(goals.size, 6)
  })

  test('passes p95 < 3000ms, 0 double bookings, 0 HTTP errors, and >= 3/5 relevance across 13 scenarios on 320 participants', async () => {
    const report = await runLocalMeetupBenchmark({
      participantCount: 320,
      loginRequests: 40,
      loginConcurrency: 20,
      matchingRequests: 120,
      matchingConcurrency: 24,
      bookingRaceAttempts: 20,
    })

    assert.ok(report.participants >= 300)
    assert.equal(report.login.errors, 0)
    assert.equal(report.matching.errors, 0)
    assert.ok(report.matching.p95Ms < 3000, `Expected p95 < 3000ms, got ${report.matching.p95Ms}ms`)
    assert.equal(report.bookingRace.confirmedCount, 1)
    assert.equal(report.bookingRace.conflictCount, 19)
    assert.equal(report.bookingRace.unexpectedErrors, 0)
    assert.equal(report.bookingRace.confirmedDoubleBookings, 0)
    assert.equal(report.relevance.passedScenarios, report.relevance.totalScenarios)
    for (const scenario of report.relevance.scenarios) {
      assert.ok(scenario.relevantCount >= 3, `${scenario.id} had only ${scenario.relevantCount}/5 relevant`)
    }
  })
})
