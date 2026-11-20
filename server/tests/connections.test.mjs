import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import test from 'node:test'
import { fixture, profile, resolveIsolatedComposeConfig } from './event-fixture.mjs'

const quarter = 15 * 60_000
const run = Date.now().toString(36).slice(-6)

function sql(query) {
  const { args } = resolveIsolatedComposeConfig()
  return execFileSync('docker', [...args, 'exec', '-T', 'db', 'psql', '-U', 'tanys', '-At', '-v', 'ON_ERROR_STOP=1', '-c', query]).toString().trim()
}

async function raw(person, method, path, body) {
  const response = await fetch('http://127.0.0.1:' + (process.env.API_PORT || 3000) + '/api/v1' + path, {
    method,
    headers: { cookie: 'tanys_session=' + person.token, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await response.text()
  return { status: response.status, text, body: text ? JSON.parse(text) : undefined }
}

test('handle search finds the participant by any case or @, and never leaks email or private contact', async () => {
  const { people: [a, b, c], event, call } = fixture(3)
  const handle = `backendlead${run}`
  assert.equal((await raw(a, 'PUT', '/me/handle', { handle: `  @${handle.toUpperCase()} ` })).body.handle, handle)
  assert.equal((await raw(c, 'PUT', '/me/handle', { handle })).status, 409)
  assert.equal((await raw(c, 'PUT', '/me/handle', { handle: 'admin' })).status, 400)
  assert.equal((await raw(c, 'PUT', '/me/handle', { handle: 'a b' })).status, 400)
  await call(a, 'PUT', '/me/contact', 204, { value: `@private_${run}` })
  assert.equal((await raw(a, 'PUT', '/me/contact', { value: 'javascript:alert(1)' })).status, 400)
  assert.equal((await raw(a, 'PUT', '/me/contact', { value: '<img src=x>' })).status, 400)
  for (const person of [a, b, c]) await call(person, 'PUT', '/profile', 200, { ...profile, visible: true })

  for (const q of ['backend', `@${handle}`, handle.toUpperCase()]) {
    const result = await raw(b, 'GET', `/events/${event}/participants?q=${encodeURIComponent(q)}`)
    assert.equal(result.status, 200)
    assert.equal(result.body.items[0]?.userId, a.id, q)
    assert.equal(result.body.items[0].handle, handle)
    assert.equal(result.body.items[0].introduction, null)
    assert.equal(result.text.includes('@participant.test'), false)
    assert.equal(result.text.includes(`private_${run}`), false)
    assert.equal(result.body.items.some(item => item.userId === b.id), false)
  }
  assert.deepEqual((await raw(b, 'GET', `/events/${event}/participants?q=b`)).body.items, [])
  const outsider = fixture(1).people[0]
  assert.equal((await raw(outsider, 'GET', `/events/${event}/participants?q=backend`)).status, 404)

  // A hidden questionnaire disappears from search.
  await call(a, 'PUT', '/profile', 200, { ...profile, visible: false })
  assert.deepEqual((await raw(b, 'GET', `/events/${event}/participants?q=${handle}`)).body.items, [])
})

test('introduction: pending hides contacts, acceptance reveals them only to the pair, transitions stay consistent', async () => {
  const { people: [a, b, c, d, e], event, call } = fixture(5)
  for (const person of [a, b, c, d, e]) await call(person, 'PUT', '/profile', 200, { ...profile, visible: true })
  await call(a, 'PUT', '/me/contact', 204, { value: `tg_a_${run}` })
  await call(b, 'PUT', '/me/contact', 204, { value: `b_${run}@mail.test` })

  const sent = await call(b, 'POST', '/introductions', 201, { recipientId: a.id, message: '  Привет! Обсудим Go?  ' })
  assert.equal(sent.status, 'pending')
  assert.equal(sent.contact, null)
  assert.equal(sent.message, 'Привет! Обсудим Go?')
  const incoming = await call(a, 'GET', '/introductions', 200)
  assert.equal(incoming.items[0].direction, 'incoming')
  assert.equal(incoming.items[0].contact, null)
  assert.equal(JSON.stringify(incoming).includes(`b_${run}`), false)

  // Repeats and the reverse direction reuse the same row.
  assert.equal((await call(b, 'POST', '/introductions', 200, { recipientId: a.id })).id, sent.id)
  const reverse = await call(a, 'POST', '/introductions', 200, { recipientId: b.id })
  assert.equal(reverse.id, sent.id)
  assert.equal(reverse.direction, 'incoming')
  await call(b, 'POST', '/introductions', 400, { recipientId: b.id })
  await call(c, 'GET', '/introductions/' + sent.id, 404)
  await call(c, 'PATCH', '/introductions/' + sent.id, 404, { status: 'accepted' })
  await call(b, 'PATCH', '/introductions/' + sent.id, 403, { status: 'accepted' })

  const accepted = await call(a, 'PATCH', '/introductions/' + sent.id, 200, { status: 'accepted' })
  assert.equal(accepted.contact, `b_${run}@mail.test`)
  assert.equal((await call(b, 'GET', '/introductions/' + sent.id, 200)).contact, `tg_a_${run}`)
  await call(a, 'PATCH', '/introductions/' + sent.id, 409, { status: 'declined' })
  const search = await raw(b, 'GET', `/events/${event}/participants?q=${encodeURIComponent((await raw(a, 'GET', '/me')).body.handle ?? 'zz')}`)
  assert.equal(search.status, 200)

  // Removing a contact is reflected immediately.
  await call(a, 'PUT', '/me/contact', 204, { value: '' })
  assert.equal((await call(b, 'GET', '/introductions/' + sent.id, 200)).contact, null)

  // Withdraw and re-send by the original sender; a decline is final.
  const toC = await call(b, 'POST', '/introductions', 201, { recipientId: c.id })
  assert.equal((await call(b, 'PATCH', '/introductions/' + toC.id, 200, { status: 'withdrawn' })).status, 'withdrawn')
  assert.equal((await call(b, 'POST', '/introductions', 200, { recipientId: c.id })).status, 'pending')
  assert.equal((await call(c, 'PATCH', '/introductions/' + toC.id, 200, { status: 'declined' })).status, 'declined')
  assert.equal((await call(b, 'POST', '/introductions', 200, { recipientId: c.id })).status, 'declined')
  assert.equal((await call(b, 'GET', '/introductions/' + toC.id, 200)).contact, null)

  // Two simultaneous requests between D and E create exactly one introduction.
  await Promise.all([
    raw(d, 'POST', `/events/${event}/introductions`, { recipientId: e.id }),
    raw(e, 'POST', `/events/${event}/introductions`, { recipientId: d.id }),
  ])
  assert.equal(sql(`SELECT count(*) FROM introductions WHERE event_id='${event}' AND '${d.id}' IN (sender,recipient)`), '1')
})

test('introductions stay inside their event, and meetings accept only 15-minute steps without double booking', async () => {
  const first = fixture(2)
  const second = fixture(2)
  const [a, b] = first.people
  sql(`INSERT INTO memberships VALUES('${second.event}','${a.id}','participant'),('${second.event}','${b.id}','participant')`)
  for (const call of [first.call, second.call]) {
    await call(a, 'PUT', '/profile', 200, { ...profile, visible: true })
    await call(b, 'PUT', '/profile', 200, { ...profile, visible: true })
  }
  const intro = await first.call(b, 'POST', '/introductions', 201, { recipientId: a.id })
  await first.call(a, 'PATCH', '/introductions/' + intro.id, 200, { status: 'accepted' })
  assert.deepEqual((await second.call(a, 'GET', '/introductions', 200)).items, [])
  await second.call(a, 'GET', '/introductions/' + intro.id, 404)

  const start = new Date(Math.ceil((Date.now() + 3_600_000) / quarter) * quarter)
  const availability = { slots: [{ start: start.toISOString(), end: new Date(+start + 2 * 3_600_000).toISOString() }] }
  await first.call(a, 'PUT', '/availability/me', 204, availability)
  await first.call(b, 'PUT', '/availability/me', 204, availability)
  const slot = new Date(+start + quarter)
  const offGrid = new Date(+start + 31 * 60_000)
  assert.equal((await raw(b, 'POST', `/events/${first.event}/meetings`, { introductionId: intro.id, slotId: offGrid.toISOString() })).body.error.code, 'invalid_time_step')
  const proposed = await first.call(b, 'POST', '/meetings', 201, { introductionId: intro.id, slotId: slot.toISOString() })
  assert.equal(proposed.status, 'pending')
  await first.call(b, 'PATCH', '/meetings/' + proposed.id, 403, { status: 'confirmed' })
  const confirmed = await first.call(a, 'PATCH', '/meetings/' + proposed.id, 200, { status: 'confirmed' })
  assert.equal(new Date(confirmed.start).toISOString(), slot.toISOString())
  const slots = (await first.call(b, 'GET', `/introductions/${intro.id}/slots`, 200)).items
  assert.equal(slots.some(item => item.id === slot.toISOString()), false)
})
