import assert from 'node:assert/strict'
import test from 'node:test'
import { fixture, profile } from './event-fixture.mjs'

test('выдача учитывает видимость, взаимность целей, границы события, блок и отзыв', async () => {
  const {people:[me,a,b,c],call} = fixture(4)
  const other = fixture().people[0]
  await call(me,'PUT','/profile',200,{...profile,visible:true})
  for (const person of [a,b,c]) await call(person,'PUT','/profile',200,{...profile,goal:'hire',visible:true})
  const items = async () => (await call(me,'GET','/recommendations?locale=kk',200)).items
  assert.equal((await items()).length,3)
  await call(other,'GET','/recommendations',404)
  await call(a,'PUT','/profile',200,{...profile,goal:'hire',visible:false})
  await call(b,'PUT','/blocks/'+me.id,204)
  const remaining = await items()
  assert.deepEqual(remaining.map(item=>item.candidate.id),[c.id])
  assert.ok(remaining[0].explanation)
  await call(me,'PUT','/feedback/'+c.id,204,{response:'met'})
  assert.deepEqual(await items(),[])
})
