import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { hasUnsavedProfileChanges } from './profileDirty.ts'
import type { EventProfileDraft } from './profileDirty.ts'

const saved: EventProfileDraft = {
  name: 'Алия',
  goal: 'find_job',
  role: 'Backend-разработчик',
  experience: '2',
  skills: 'Python, FastAPI',
  interests: 'API, Startups',
  about: 'Ищу команду backend.',
  lookingFor: '',
  visible: true,
  consentAccepted: true,
}

describe('hasUnsavedProfileChanges', () => {
  it('returns false when there is no saved baseline or when viewing without edits', () => {
    assert.equal(hasUnsavedProfileChanges(null, saved), false)
    assert.equal(hasUnsavedProfileChanges(saved, { ...saved }), false)
    assert.equal(
      hasUnsavedProfileChanges(saved, { ...saved, skills: ' Python , FastAPI ', name: ' Алия ' }),
      false,
    )
  })

  it('returns true after editing any field and false again when reverted to original', () => {
    const editedRole = { ...saved, role: 'Senior Backend' }
    assert.equal(hasUnsavedProfileChanges(saved, editedRole), true)
    assert.equal(hasUnsavedProfileChanges(saved, { ...editedRole, role: 'Backend-разработчик' }), false)

    assert.equal(hasUnsavedProfileChanges(saved, { ...saved, visible: false }), true)
    assert.equal(hasUnsavedProfileChanges(saved, { ...saved, goal: 'hire', lookingFor: 'Go' }), true)
  })
})
