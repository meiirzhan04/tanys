import assert from 'node:assert/strict'
import { randomBytes, randomUUID, createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import test from 'node:test'
import { resolveIsolatedComposeConfig } from './event-fixture.mjs'

const base = 'http://127.0.0.1:' + (process.env.API_PORT || 3000) + '/api/v1/events'
const fixture = randomUUID()

function account(canOrganize) {
  const { args: compose } = resolveIsolatedComposeConfig()
  const id = randomUUID()
  const email = id + '@participant.test'
  const token = randomBytes(32).toString('hex')
  const digest = createHash('sha256').update(token).digest('hex')
  execFileSync('docker', [...compose,'exec','-T','db','psql','-U','tanys','-v','ON_ERROR_STOP=1'], {
    input: `INSERT INTO users(id,email) VALUES('${id}','${email}');
      INSERT INTO sessions(digest,user_id) VALUES('${digest}','${id}');`
  })
  if (canOrganize) execFileSync('docker', [...compose,'exec','-T','api','node','dist/grant-organizer.js',email])
  return 'tanys_session=' + token
}

async function request(cookie, method, path, status, data) {
  const response = await fetch(base + path, { method, headers: { cookie,'Content-Type':'application/json' },
    body: data && JSON.stringify(data) })
  assert.equal(response.status,status,method + ' ' + path)
  if (status !== 204) return response.json()
}

test('организаторы управляют своими событиями, приглашения учитывают отзыв и закрытие', async () => {
  const first = account(true)
  const second = account(true)
  const guest = account(false)
  const iso = offset => new Date(Math.ceil((Date.now()+offset)/900000)*900000).toISOString()
  const event = { name:'Pilot ' + fixture,timeZone:'Asia/Almaty',startsAt:iso(1000),endsAt:iso(86400000) }
  const a = await request(first,'POST','',201,event)
  const b = await request(second,'POST','',201,event)
  const path = '/' + a.id
  await request(guest,'POST','',403,event)
  await request(first,'PATCH','/' + b.id,404,{ name:'Other' })
  await request(second,'GET',path,404)
  await request(first,'PATCH',path,200,{ name:'New name' })
  const invite = await request(first,'POST',path+'/invites',201,{ expiresAt:iso(3600000) })
  const join = () => request(guest,'PUT',path+'/members/me',200,{ token:invite.token })
  await Promise.all([join(),join()])
  const mine = await request(guest,'GET','',200)
  assert.equal(mine.items.length,1)
  assert.equal(mine.items[0].role,'participant')
  await request(guest,'PATCH',path,403,{ status:'closed' })
  await request(guest,'DELETE',path+'/members/me',204)
  await request(first,'DELETE',path+'/invites/'+invite.id,204)
  await request(guest,'PUT',path+'/members/me',404,{ token:invite.token })
  const next = await request(first,'POST',path+'/invites',201,{ expiresAt:iso(3600000) })
  await request(first,'PATCH',path,200,{ status:'closed' })
  await request(guest,'PUT',path+'/members/me',409,{ token:next.token })
})
