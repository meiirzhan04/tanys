import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DEMO_PARTNER_BOOTHS, recommendBooths } from './booths.ts'

test('every demonstration booth in the catalog is marked as demo with topics and localized descriptions', () => {
  assert.ok(DEMO_PARTNER_BOOTHS.length >= 4)
  for (const booth of DEMO_PARTNER_BOOTHS) {
    assert.equal(booth.demo, true)
    assert.ok(booth.name.trim().length > 0)
    assert.ok(booth.topics.length > 0)
    assert.ok(booth.description.ru.trim().length > 0)
    assert.ok(booth.description.kk.trim().length > 0)
    assert.ok(booth.description.en.trim().length > 0)
  }
})

test('profiles with different interests get distinct booths with catalog-backed explanations', () => {
  const backendBooths = recommendBooths({
    skills: ['Python', 'FastAPI'],
    interests: ['API', 'Стажировки'],
  })
  const frontendBooths = recommendBooths({
    skills: ['React', 'TypeScript', 'Figma'],
    interests: ['Веб-доступность', 'Дизайн-системы'],
  })

  assert.ok(backendBooths.length >= 1)
  assert.ok(frontendBooths.length >= 1)
  assert.notEqual(backendBooths[0].booth.id, frontendBooths[0].booth.id)
  assert.equal(backendBooths[0].booth.id, 'booth-python-api')
  assert.equal(frontendBooths[0].booth.id, 'booth-frontend-ui')

  for (const rec of [...backendBooths, ...frontendBooths]) {
    for (const topic of rec.matchedTopics) {
      assert.ok(rec.booth.topics.includes(topic))
    }
    assert.ok(rec.explanation.includes(rec.matchedTopics[0]))
  }
})

test('returns an empty list when a profile has no thematic overlap and localizes explanations', () => {
  const none = recommendBooths({
    skills: ['COBOL'],
    interests: ['Астрономия'],
  })
  assert.deepEqual(none, [])

  // Aliases and case match like in people matching.
  const alias = recommendBooths({ skills: ['golang', 'k8s'], interests: [] }, DEMO_PARTNER_BOOTHS, 'ru')
  assert.ok(alias.some(item => item.matchedTopics.includes('Go')), JSON.stringify(alias))
  const kk = recommendBooths({ skills: ['Kubernetes'], interests: ['Наблюдаемость'] }, DEMO_PARTNER_BOOTHS, 'kk')
  const en = recommendBooths({ skills: ['Kubernetes'], interests: ['Наблюдаемость'] }, DEMO_PARTNER_BOOTHS, 'en')
  assert.match(kk[0].explanation, /Сәйкес тақырыптар:.*Kubernetes/)
  assert.match(en[0].explanation, /Matched topics:.*Kubernetes/)
})
