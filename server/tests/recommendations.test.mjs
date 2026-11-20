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

test('«Python Developer» в запросе нанимающего находит Backend Developer с Python в обе стороны и не пропускает Go и iOS', async () => {
  const {people:[employer,python,goOnly,ios],call} = fixture(4)
  const outsider = fixture(1)
  const ids = async (person) => (await call(person,'GET','/recommendations?locale=ru',200)).items.map(item=>item.candidate.id)
  for (const request of ['Python Developer','pyhton developer']) {
    await call(employer,'PUT','/profile',200,{...profile,goal:'hire',role:'Tech Lead',skills:['Go','Kubernetes'],lookingFor:[request],visible:true})
    await call(python,'PUT','/profile',200,{...profile,role:'Backend Developer',skills:['Python'],visible:true})
    await call(goOnly,'PUT','/profile',200,{...profile,role:'Backend Developer',skills:['Go'],visible:true})
    await call(ios,'PUT','/profile',200,{...profile,role:'iOS Developer',skills:['Swift'],interests:['API'],visible:true})
    assert.deepEqual(await ids(employer),[python.id],request)
    assert.deepEqual(await ids(python),[employer.id],request)
    assert.deepEqual(await ids(goOnly),[],request)
    assert.deepEqual(await ids(ios),[],request)
  }
  await outsider.call(outsider.people[0],'PUT','/profile',200,{...profile,role:'Backend Developer',skills:['Python'],visible:true})
  assert.deepEqual(await ids(employer),[python.id])
  await call(python,'PUT','/profile',200,{...profile,role:'Backend Developer',skills:['Python'],visible:false})
  assert.deepEqual(await ids(employer),[])
})
