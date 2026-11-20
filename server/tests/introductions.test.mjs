import assert from 'node:assert/strict'
import test from 'node:test'
import { fixture,profile } from './event-fixture.mjs'

test('контакт доступен участникам только после взаимного согласия',async () => {
  const {people:[a,b,third],call}=fixture(3)
  for (const p of [a,b]) await call(p,'PUT','/profile',200,{...profile,visible:true})
  await call(b,'PUT','/me/contact',204,{value:'chosen@example.test'})
  const pending=await call(a,'POST','/introductions',201,{recipientId:b.id})
  assert.equal(pending.contact,null)
  const reverse=await call(b,'POST','/introductions',200,{recipientId:a.id})
  assert.equal(reverse.id,pending.id)
  const path='/introductions/'+pending.id
  await call(a,'PATCH',path,403,{status:'accepted'})
  await call(third,'GET',path,404)
  await call(b,'PATCH',path,200,{status:'accepted'})
  assert.equal((await call(a,'GET',path,200)).contact,'chosen@example.test')
  await call(b,'PATCH',path,200,{status:'accepted'})
  await call(b,'PUT','/blocks/'+a.id,204)
  await call(a,'GET',path,404)
  assert.deepEqual((await call(a,'GET','/introductions',200)).items,[])
})
