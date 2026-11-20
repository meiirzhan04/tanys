import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import test from 'node:test'

const api = 'http://127.0.0.1:' + (process.env.API_PORT || 3000) + '/api/v1'
const username = 'test-' + randomUUID().slice(0, 16)
const password = 'a unique test passphrase!'

function call(path, method = 'GET', body, cookie) {
  return fetch(api + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie && { cookie }) },
    body: body && JSON.stringify(body),
  })
}

test('password signup, normalization, session, logout, and login throttling', async () => {
  const invalid = await call('/auth/register', 'POST', { username, password: '12345' })
  assert.equal(invalid.status, 400)

  const signup = await call('/auth/register', 'POST', { username: username.toUpperCase(), password })
  assert.equal(signup.status, 201)
  const { id } = await signup.json()
  const cookie = signup.headers.get('set-cookie').split(';')[0]
  assert.match(signup.headers.get('set-cookie'), /HttpOnly; SameSite=Lax/)
  assert.equal((await (await call('/me', 'GET', undefined, cookie)).json()).id, id)

  const conflict = await call('/auth/register', 'POST', { username, password })
  assert.equal(conflict.status, 409)
  const missing = await call('/auth/password', 'POST', { username: username + '-x', password })
  const wrong = await call('/auth/password', 'POST', { username, password: password + 'x' })
  assert.equal(missing.status, 401)
  assert.equal(wrong.status, 401)
  assert.deepEqual(await missing.json(), await wrong.json())

  assert.equal((await call('/auth/session', 'DELETE', undefined, cookie)).status, 204)
  assert.equal((await call('/me', 'GET', undefined, cookie)).status, 401)
  const login = await call('/auth/password', 'POST', { username, password })
  assert.equal(login.status, 200)
  assert.equal((await login.json()).id, id)

  for (let i = 0; i < 10; i++) {
    assert.equal((await call('/auth/password', 'POST', { username, password: password + 'x' })).status, 401)
  }
  const limited = await call('/auth/password', 'POST', { username, password })
  assert.equal(limited.status, 429)
  assert.equal(limited.headers.get('retry-after'), '900')
})
