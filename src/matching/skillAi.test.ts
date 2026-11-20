import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createAiSkillResolver } from '../../server/src/matching/skill-ai.ts'

const baseUrl = 'http://ollama.test:11434'
const label = 'server-side developer'
const normalize = (value: string) => value.toLowerCase()

function embeddings() {
  return Response.json({ embeddings: [[1, 0], [0, 1], [0, 1], [0, 1], [0, 1], [1, 0]] })
}

function verification() {
  return Response.json({ message: { content: '{"approved":[0]}' } })
}

test('reuses deterministic fallback during an Ollama outage and retries after ten seconds', async t => {
  t.mock.timers.enable({ apis: ['Date'], now: 0 })
  const paths: string[] = []
  let online = false
  const resolve = createAiSkillResolver({
    baseUrl,
    fetcher: async url => {
      const path = new URL(String(url)).pathname
      paths.push(path)
      if (!online) return new Response(null, { status: 503 })
      return path === '/api/embed' ? embeddings() : verification()
    },
  })

  assert.equal((await resolve([label], normalize))(label), label)
  online = true
  t.mock.timers.tick(9_999)
  for (const unknown of [label, 'edge developer', label, 'edge developer', label]) {
    assert.equal((await resolve([unknown], normalize))(unknown), unknown)
  }
  assert.deepEqual(paths, ['/api/embed'])

  t.mock.timers.tick(1)
  assert.equal((await resolve([label], normalize))(label), 'backend')
  assert.equal((await resolve([label], normalize))(label), 'backend')
  assert.deepEqual(paths, ['/api/embed', '/api/embed', '/api/chat'])
})

test('backs off when either Ollama response is invalid', async () => {
  const invalidResponses = [
    [() => Response.json({ embeddings: [] })],
    [embeddings, () => Response.json({ message: { content: '{"approved":null}' } })],
  ]
  for (const responses of invalidResponses) {
    let calls = 0
    const resolve = createAiSkillResolver({
      baseUrl,
      fetcher: async () => responses[calls++](),
    })
    assert.equal((await resolve([label], normalize))(label), label)
    assert.equal((await resolve([label], normalize))(label), label)
    assert.equal(calls, responses.length)
  }
})

test('embedding and verification share one 800 ms deadline', async t => {
  const signal = new AbortController().signal
  const timeout = t.mock.method(AbortSignal, 'timeout', () => signal)
  let calls = 0
  const resolve = createAiSkillResolver({
    baseUrl,
    fetcher: async (_url, init) => {
      assert.equal(init?.signal, signal)
      return calls++ === 0 ? embeddings() : verification()
    },
  })

  assert.equal((await resolve([label], normalize))(label), 'backend')
  assert.equal(calls, 2)
  assert.deepEqual(timeout.mock.calls.map(call => call.arguments), [[800]])
})
