import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import test from 'node:test'

const api = 'http://127.0.0.1:' + (process.env.API_PORT || 3000) + '/api/v1'
const mailbox = 'http://127.0.0.1:' + (process.env.MAILBOX_PORT || 8025)
const email = randomUUID() + '@participant.test'

async function call(path, method, data, cookie) {
  return fetch(api + path, { method, headers: { 'Content-Type': 'application/json', ...(cookie && { cookie }) },
    body: data && JSON.stringify(data) })
}

async function login(purpose) {
  const challenge = await call('/auth/challenges', 'POST', { email, purpose })
  assert.equal(challenge.status, 202)
  const { challengeId } = await challenge.json()
  const messages = await (await fetch(mailbox + '/api/v1/messages')).json()
  const message = messages.messages.find(item => item.To.some(recipient => recipient.Address === email))
  assert.ok(message, 'confirmation email received')
  const detail = await (await fetch(mailbox + '/api/v1/message/' + message.ID)).json()
  const code = detail.Text.match(/[0-9a-f]{24}/)?.[0]
  assert.ok(code)
  const credentials = { challengeId, code }
  const result = await call('/auth/sessions', 'POST', credentials)
  assert.equal(result.status, 200)
  assert.equal((await call('/auth/sessions', 'POST', credentials)).status, 401)
  const cookie = result.headers.get('set-cookie').split(';')[0]
  assert.equal((await call('/me', 'GET', undefined, cookie)).status, 200)
  return cookie
}

test('регистрация, повторный вход, восстановление, отзыв сессий и лимит писем', async () => {
  const first = await login('login')
  const second = await login('login')
  const recovered = await login('recover')
  for (const previous of [first, second]) {
    assert.equal((await call('/me', 'GET', undefined, previous)).status, 401)
  }
  assert.equal((await call('/auth/session', 'DELETE', undefined, recovered)).status, 204)
  assert.equal((await call('/me', 'GET', undefined, recovered)).status, 401)
  assert.equal((await call('/auth/challenges', 'POST', { email })).status, 429)
})
