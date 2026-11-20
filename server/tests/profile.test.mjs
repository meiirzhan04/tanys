import assert from 'node:assert/strict'
import test from 'node:test'
import { fixture, profile } from './event-fixture.mjs'

test('анкета принадлежит участнику и событию, доступность меняется после сохранения', async () => {
  const {people:[owner,member],call} = fixture()
  const outsider = fixture().people[0]
  await call(member,'PUT','/profile',400,{...profile,consentVersion:''})
  await call(member,'PUT','/profile',400,{...profile,experienceYears:-1})
  await call(outsider,'PUT','/profile',404,profile)
  assert.equal((await call(member,'PUT','/profile',200,profile)).visible,false)
  await call(owner,'GET','/profile',404)
  await call(member,'PUT','/profile',200,{...profile,visible:true})
  assert.equal((await call(member,'GET','/profile',200)).name,profile.name)
  assert.equal((await call(owner,'GET','/interests',200)).topics.length,1)
  await call(member,'PUT','/profile',200,profile)
  assert.equal((await call(owner,'GET','/interests',200)).topics.length,0)
})
