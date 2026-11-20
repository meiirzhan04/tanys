import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Candidate } from '../matching/types'
import { parseCandidates, resolveAppCandidates } from './loadCandidates.ts'
import './interestSummary.test.ts'
import './profilesIntegrity.test.ts'
import './booths.test.ts'

function validProfile(id: string): Candidate {
  return {
    id,
    name: `Участник ${id}`,
    role: 'Backend-разработчик',
    skills: ['Python'],
    experienceYears: 2,
    interests: ['API'],
    about: 'Разрабатываю сервисы.',
    goal: 'find_job',
  }
}

test('parseCandidates filters malformed records and deduplicates IDs', () => {
  const parsed = parseCandidates([
    validProfile('p-1'),
    validProfile('p-1'),
    { ...validProfile('p-bad-goal'), goal: 'unknown' },
    { ...validProfile('p-bad-exp'), experienceYears: -1 },
    { ...validProfile('p-bad-skills'), skills: 'Python' },
    null,
  ])

  assert.deepEqual(parsed.map(c => c.id), ['p-1'])
  assert.deepEqual(parseCandidates([]), [])
  assert.deepEqual(parseCandidates('not-an-array'), [])
})

test('resolveAppCandidates uses fallback until profiles.json has >= 10 valid profiles', () => {
  const fallback = [validProfile('preview-1'), validProfile('p-1')]
  const small = resolveAppCandidates([validProfile('p-1')], fallback)
  assert.deepEqual(small.map(c => c.id), ['p-1', 'preview-1'])

  const fullDataset = Array.from({ length: 10 }, (_, idx) => validProfile(`real-${idx + 1}`))
  const resolved = resolveAppCandidates(fullDataset, fallback)
  assert.equal(resolved.length, 10)
  assert.ok(resolved.every(c => c.id.startsWith('real-')))
})
