import assert from 'node:assert/strict'
import test from 'node:test'
import { fixture, profile } from './event-fixture.mjs'

test('пересекающиеся встречи допускают одно подтверждение, отмена освобождает время', async () => {
  const {
    people: [a, b, c],
    call,
    event,
  } = fixture(3)
  const start = new Date(Math.ceil((Date.now() + 3600000) / 900000) * 900000)
  const availability = { slots: [{ start, end: new Date(+start + 3600000) }] }
  for (const person of [a, b, c]) {
    await call(person, 'PUT', '/profile', 200, { ...profile, visible: true })
    await call(person, 'PUT', '/availability/me', 204, availability)
  }
  async function propose(to) {
    const intro = await call(a, 'POST', '/introductions', 201, { recipientId: to.id })
    await call(to, 'PATCH', '/introductions/' + intro.id, 200, { status: 'accepted' })
    const slots = await call(a, 'GET', '/introductions/' + intro.id + '/slots', 200)
    assert.equal(slots.items.length, 4)
    return call(a, 'POST', '/meetings', 201, { introductionId: intro.id, slotId: slots.items[0].id })
  }
  const first = await propose(b),
    second = await propose(c)
  await call(c, 'PATCH', '/meetings/' + first.id, 404, { status: 'cancelled' })
  const pairs = [
    [b, first],
    [c, second],
  ]
  const statuses = await Promise.all(
    pairs.map(async ([person, m]) => {
      const url =
        'http://127.0.0.1:' + (process.env.API_PORT || 3000) + '/api/v1/events/' + event + '/meetings/' + m.id
      return (
        await fetch(url, {
          method: 'PATCH',
          headers: { cookie: 'tanys_session=' + person.token, 'Content-Type': 'application/json' },
          body: '{"status":"confirmed"}',
        })
      ).status
    }),
  )
  assert.deepEqual(statuses.slice().sort(), [200, 409])
  const winner = statuses.indexOf(200)
  const [person, meeting] = pairs[winner]
  assert.equal((await call(person, 'GET', '/meetings', 200)).items[0].start, start.toISOString())
  await call(a, 'PATCH', '/meetings/' + meeting.id, 200, { status: 'cancelled' })
  assert.equal((await call(person, 'GET', '/meetings', 200)).items[0].status, 'cancelled')
  const [other, remaining] = pairs[1 - winner]
  await call(other, 'PATCH', '/meetings/' + remaining.id, 200, { status: 'confirmed' })
})

test('сдвиг границ события не оставляет встреч за пределом; свободное время и приглашения подрезаются', async () => {
  const { people: [org, b], call } = fixture(2)
  const start = new Date(Math.ceil((Date.now() + 3600000) / 900000) * 900000)
  const hour = new Date(+start + 3600000)
  for (const person of [org, b]) {
    await call(person, 'PUT', '/profile', 200, { ...profile, visible: true })
    await call(person, 'PUT', '/availability/me', 204, { slots: [{ start, end: hour }] })
  }
  const intro = await call(org, 'POST', '/introductions', 201, { recipientId: b.id })
  await call(b, 'PATCH', '/introductions/' + intro.id, 200, { status: 'accepted' })
  const slots = await call(org, 'GET', '/introductions/' + intro.id + '/slots', 200)
  const late = slots.items.at(-1)
  const meeting = await call(org, 'POST', '/meetings', 201, { introductionId: intro.id, slotId: late.id })
  await call(b, 'PATCH', '/meetings/' + meeting.id, 200, { status: 'confirmed' })
  const invite = await call(org, 'POST', '/invites', 201, { expiresAt: new Date(+start + 2 * 3600000).toISOString() })

  // Ending the event 30 minutes after start would strand the confirmed late meeting.
  const shorter = new Date(+start + 30 * 60000).toISOString()
  const blocked = await call(org, 'PATCH', '', 409, { endsAt: shorter })
  assert.equal(blocked.error.code, 'meetings_outside_window')
  assert.equal(blocked.error.count, 1)
  assert.equal((await call(org, 'GET', '', 200)).endsAt === shorter, false)

  await call(org, 'PATCH', '/meetings/' + meeting.id, 200, { status: 'cancelled' })
  assert.equal((await call(org, 'PATCH', '', 200, { endsAt: shorter })).endsAt, shorter)
  const mine = await call(b, 'GET', '/availability/me', 200)
  assert.deepEqual(mine.slots.map(slot => [slot.start, slot.end]), [[start.toISOString(), shorter]])
  const listed = await call(org, 'GET', '/invites', 200)
  assert.equal(listed.items.find(item => item.id === invite.id).expiresAt, shorter)
})
