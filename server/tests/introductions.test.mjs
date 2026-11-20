import assert from 'node:assert/strict'
import test from 'node:test'
import { fixture,profile } from './event-fixture.mjs'

test('контакт доступен участникам только после взаимного согласия',async () => {
  const {people:[a,b,third],call}=fixture(3)
  for (const p of [a,b]) await call(p,'PUT','/profile',200,{...profile,visible:true})
  await call(b,'PUT','/me/contact',204,{value:'chosen@example.test'})
  const icebreaker='Привет! Как вы используете Python в своей работе?'
  const pending=await call(a,'POST','/introductions',201,{recipientId:b.id,icebreaker})
  assert.equal(pending.contact,null)
  const reverse=await call(b,'POST','/introductions',200,{recipientId:a.id})
  assert.equal(reverse.id,pending.id)
  const path='/introductions/'+pending.id
  assert.equal(pending.icebreaker,null)
  assert.equal((await call(b,'GET',path,200)).icebreaker,null)
  await call(a,'PATCH',path,403,{status:'accepted'})
  await call(third,'GET',path,404)
  assert.equal((await call(b,'PATCH',path,200,{status:'accepted'})).icebreaker,icebreaker)
  assert.equal((await call(a,'GET',path,200)).contact,'chosen@example.test')
  for (const person of [a,b]) {
    assert.equal((await call(person,'GET','/introductions',200)).items[0].icebreaker,icebreaker)
  }
  await call(b,'PATCH',path,200,{status:'accepted'})
  await call(b,'PUT','/blocks/'+a.id,204)
  await call(a,'GET',path,404)
  assert.deepEqual((await call(a,'GET','/introductions',200)).items,[])
})

test('для существующей пары без сохранённой фразы используется профиль отправителя', async () => {
  const {people:[a,b],call}=fixture()
  await call(a,'PUT','/profile',200,{...profile,name:'Алия',visible:true})
  await call(b,'PUT','/profile',200,{...profile,name:'Данияр',goal:'hire',lookingFor:['Python'],visible:true})
  const pending=await call(a,'POST','/introductions',201,{recipientId:b.id})
  const path='/introductions/'+pending.id
  await call(b,'PATCH',path,200,{status:'accepted'})
  const sent=await call(a,'GET',path+'?locale=en',200)
  const received=await call(b,'GET',path+'?locale=en',200)
  assert.match(sent.icebreaker,/^Hi Данияр!.*Python/)
  assert.equal(received.icebreaker,sent.icebreaker)
  assert.equal(received.ownProfile,undefined)
  assert.equal(received.peerProfile,undefined)
})
