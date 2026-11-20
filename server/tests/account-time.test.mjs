import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import test from 'node:test'
import { fixture, profile, resolveIsolatedComposeConfig } from './event-fixture.mjs'

const quarter = 15 * 60_000
const aligned = offset => new Date(Math.ceil((Date.now() + offset) / quarter) * quarter)

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
  return { status: response.status, body: response.status === 204 ? undefined : await response.json() }
}

test('время мероприятия и свободных слотов принимается только с шагом 15 минут, старые значения не округляются', async () => {
  const { people: [organizer, participant], event, call } = fixture(2)
  const other = fixture(1)
  sql(`UPDATE users SET can_create_events=true WHERE id='${organizer.id}'`)
  const start = aligned(86_400_000)
  const end = new Date(+start + 4 * 3_600_000)

  const offGrid = await raw(organizer, 'POST', '/events', { name: 'Off grid', timeZone: 'Asia/Almaty', startsAt: new Date(+start + 60_000).toISOString(), endsAt: end.toISOString() })
  assert.equal(offGrid.status, 400)
  assert.equal(offGrid.body.error.code, 'invalid_time_step')
  const created = await raw(organizer, 'POST', '/events', { name: 'On grid', timeZone: 'Asia/Almaty', startsAt: start.toISOString(), endsAt: end.toISOString() })
  assert.equal(created.status, 201)
  assert.equal((await raw(participant, 'POST', '/events', { name: 'Nope', timeZone: 'UTC', startsAt: start.toISOString(), endsAt: end.toISOString() })).status, 403)

  // The fixture event starts at now(): a legacy off-grid time that renaming must keep untouched.
  const before = sql(`SELECT starts_at FROM events WHERE id='${event}'`)
  await call(organizer, 'PATCH', '', 200, { name: 'Renamed' })
  assert.equal(sql(`SELECT starts_at FROM events WHERE id='${event}'`), before)
  await call(organizer, 'PATCH', '', 400, { startsAt: new Date(+start + 46 * 60_000).toISOString() })
  await call(participant, 'PATCH', '', 403, { name: 'Hijack' })
  await call(other.people[0], 'PATCH', '', 404, { name: 'Hijack' })

  // A saved off-grid availability slot survives a later save; a new off-grid slot is refused.
  sql(`UPDATE events SET starts_at=now(), ends_at=now()+interval '3 days' WHERE id='${event}'`)
  await call(participant, 'PUT', '/profile', 200, { ...profile, visible: true })
  const legacyStart = new Date(+aligned(7_200_000) + 46 * 60_000)
  sql(`INSERT INTO availability VALUES('${event}','${participant.id}','${legacyStart.toISOString()}','${new Date(+legacyStart + 3_600_000).toISOString()}')`)
  const legacy = { start: legacyStart.toISOString(), end: new Date(+legacyStart + 3_600_000).toISOString() }
  const fresh = { start: aligned(10 * 3_600_000).toISOString(), end: aligned(11 * 3_600_000).toISOString() }
  await call(participant, 'PUT', '/availability/me', 204, { slots: [legacy, fresh] })
  const offGridSlot = { start: new Date(+aligned(20 * 3_600_000) + 60_000).toISOString(), end: aligned(21 * 3_600_000).toISOString() }
  await call(participant, 'PUT', '/availability/me', 400, { slots: [legacy, fresh, offGridSlot] })
  assert.equal((await call(participant, 'GET', '/availability/me', 200)).slots.length, 2)
})

test('выход из мероприятия скрывает анкету только в нём, выход из аккаунта не трогает данные, организатора нельзя удалить', async () => {
  const first = fixture(2)
  const second = fixture(2)
  const [organizer, participant] = first.people
  const [, peer] = second.people
  // The same participant also belongs to the second event.
  sql(`INSERT INTO memberships VALUES('${second.event}','${participant.id}','participant')`)
  await first.call(participant, 'PUT', '/profile', 200, { ...profile, visible: true })
  await second.call(participant, 'PUT', '/profile', 200, { ...profile, visible: true })
  await second.call(peer, 'PUT', '/profile', 200, { ...profile, goal: 'hire', visible: true })
  await first.call(organizer, 'PUT', '/profile', 200, { ...profile, goal: 'hire', visible: true })

  await first.call(participant, 'DELETE', '/members/me', 204)
  const ids = (await first.call(organizer, 'GET', '/recommendations', 200)).items.map(item => item.candidate.id)
  assert.equal(ids.includes(participant.id), false)
  const stillVisible = (await second.call(peer, 'GET', '/recommendations', 200)).items.map(item => item.candidate.id)
  assert.deepEqual(stillVisible, [participant.id])
  assert.equal((await raw(participant, 'GET', '/me')).status, 200)

  assert.equal((await raw(organizer, 'DELETE', '/members/me'.replace('/members', `/events/${first.event}/members`))).status, 409)
  const blocked = await raw(organizer, 'DELETE', '/me', { confirm: true })
  assert.equal(blocked.status, 409)
  assert.equal(blocked.body.error.code, 'organizer_owns_events')
  assert.equal((await raw(organizer, 'GET', '/me')).status, 200)

  assert.equal((await raw(participant, 'DELETE', '/me', { confirm: true })).status, 204)
  assert.equal((await raw(participant, 'GET', '/me')).status, 401)
  assert.equal(sql(`SELECT count(*) FROM event_profiles WHERE user_id='${participant.id}'`), '0')
})
