import assert from 'node:assert/strict'
import { test } from 'node:test'
import { deduplicateExplanationSkills, formatIcebreakerName } from '../../server/src/matching/explanation-skills.ts'

test('requested Go and PostgreSQL appear only once across explanation reasons', () => {
  const requested = [{ key: 'go', label: 'Go' }, { key: 'postgresql', label: 'PostgreSQL' }]
  const shared = [{ key: 'go', label: 'Go' }, { key: 'postgresql', label: 'Postgres' }]

  assert.deepEqual(deduplicateExplanationSkills([requested, shared]), [['Go', 'PostgreSQL'], []])
})

test('keeps the original label and order from the first reason with a confirmed key', () => {
  const requested = [{ key: 'javascript', label: 'JS' }, { key: 'postgresql', label: 'Postgres' }]
  const otherRequest = [{ key: 'javascript', label: 'JavaScript' }, { key: 'c++', label: 'C++' }]
  const shared = [{ key: 'c#', label: 'C#' }, { key: 'c++', label: 'C++' }, { key: 'rust', label: 'Rust' }]

  assert.deepEqual(deduplicateExplanationSkills([requested, otherRequest, shared]), [
    ['JS', 'Postgres'],
    ['C++'],
    ['C#', 'Rust'],
  ])
})

test('keeps empty reason positions and drops repeated keys within a reason', () => {
  const skills = [{ key: 'go', label: 'Go' }, { key: 'go', label: 'Golang' }]

  assert.deepEqual(deduplicateExplanationSkills([[], skills, []]), [[], ['Go'], []])
  assert.deepEqual(deduplicateExplanationSkills([]), [])
})

test('uses the existing punctuation after initials and adds it to a plain name', () => {
  assert.equal(formatIcebreakerName('Қанат А.'), 'Қанат А.')
  assert.equal(formatIcebreakerName('Данияр'), 'Данияр!')
  for (const punctuated of ['Ada!', 'Ada?', 'Ada…']) {
    assert.equal(formatIcebreakerName(punctuated), punctuated)
  }
})
