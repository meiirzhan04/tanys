import assert from 'node:assert/strict'
import { test } from 'node:test'
import { summarizeInterests } from './interestSummary.ts'

test('ranks topics by participants after normalizing case and spacing', () => {
  const profiles = [
    { interests: [' API ', 'api', 'Data   Engineering', '  '] },
    { interests: ['data engineering', 'Api', 'DATA\tENGINEERING'] },
    { interests: ['API'] },
    { interests: [] },
  ]

  assert.deepEqual(summarizeInterests(profiles), {
    profileCount: 4,
    topics: [
      { topic: 'API', count: 3 },
      { topic: 'Data Engineering', count: 2 },
    ],
  })

  profiles[2] = { interests: ['Data Engineering'] }
  assert.deepEqual(summarizeInterests(profiles).topics, [
    { topic: 'Data Engineering', count: 3 },
    { topic: 'API', count: 2 },
  ])
})

test('reports the number of profiles even when their interests are blank', () => {
  assert.deepEqual(summarizeInterests([{ interests: [] }, { interests: ['  '] }]), {
    profileCount: 2,
    topics: [],
  })
  assert.deepEqual(summarizeInterests([]), { profileCount: 0, topics: [] })
})
