import assert from 'node:assert/strict'
import { test } from 'node:test'
import { contactHref, initialsOf } from './contactLink.ts'

test('links only safe contact formats', () => {
  assert.equal(contactHref('@parasat_dev'), 'https://t.me/parasat_dev')
  assert.equal(contactHref('t.me/parasat_dev'), 'https://t.me/parasat_dev')
  assert.equal(contactHref('https://t.me/parasat_dev'), 'https://t.me/parasat_dev')
  assert.equal(contactHref('aliya@mail.kz'), 'mailto:aliya@mail.kz')
  assert.equal(contactHref('https://linkedin.com/in/aliya'), 'https://linkedin.com/in/aliya')
  assert.equal(contactHref('http://example.com'), null)
  assert.equal(contactHref('javascript:alert(1)'), null)
  assert.equal(contactHref('data:text/html,hi'), null)
  assert.equal(contactHref('+7 701 000 00 00'), null)
  assert.equal(contactHref('@ab'), null)
})

test('builds initials from names, handles and Kazakh letters', () => {
  assert.equal(initialsOf('Parasat Dauletbai'), 'PD')
  assert.equal(initialsOf('Әсел'), 'Ә')
  assert.equal(initialsOf(null, '@daniyar'), 'D')
  assert.equal(initialsOf('', ''), '?')
})
