import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { assertProfileDatasetIntegrity, REQUIRED_GOALS } from './profilesIntegrity.ts'

const shippedProfiles: unknown[] = JSON.parse(
  readFileSync(new URL('./profiles.json', import.meta.url), 'utf8'),
)

test('shipped src/data/profiles.json has >=100 valid unique profiles covering all six goals with 0 dropped', () => {
  const candidates = assertProfileDatasetIntegrity(shippedProfiles)
  assert.equal(candidates.length, shippedProfiles.length)
  assert.ok(candidates.length >= 100)

  const goals = new Set(candidates.map(candidate => candidate.goal))
  for (const goal of REQUIRED_GOALS) {
    assert.ok(goals.has(goal), `Expected goal ${goal} in profiles.json`)
  }
})

test('assertProfileDatasetIntegrity reports offending ID on duplicate ID copy', () => {
  const withDuplicate = structuredClone(shippedProfiles) as Array<Record<string, unknown>>
  const duplicatedId = String(withDuplicate[0].id)
  withDuplicate[1] = { ...withDuplicate[1], id: duplicatedId }

  assert.throws(
    () => assertProfileDatasetIntegrity(withDuplicate),
    new RegExp(`Duplicate candidate id "${duplicatedId}".*index 1`),
  )
})

test('assertProfileDatasetIntegrity reports record ID and invalid goal on unknown goal copy', () => {
  const withUnknownGoal = structuredClone(shippedProfiles) as Array<Record<string, unknown>>
  const targetId = String(withUnknownGoal[5].id)
  withUnknownGoal[5] = { ...withUnknownGoal[5], goal: 'find_investor' }

  assert.throws(
    () => assertProfileDatasetIntegrity(withUnknownGoal),
    new RegExp(`id="${targetId}".*unknown goal "find_investor"`),
  )
})

test('assertProfileDatasetIntegrity reports missing goal when one of six goals is absent', () => {
  const withoutHire = (structuredClone(shippedProfiles) as Array<Record<string, unknown>>).filter(
    profile => profile.goal !== 'hire',
  )

  assert.throws(
    () => assertProfileDatasetIntegrity(withoutHire),
    /Missing required goal\(s\).*hire/,
  )
})
