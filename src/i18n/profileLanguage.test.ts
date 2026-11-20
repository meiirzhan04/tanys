import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { detectSkillLocale, detectTextLocale, inspectCandidateLanguage } from './profileLanguage.ts'

describe('profileLanguage (#153)', () => {
  it('detects Russian, Kazakh, and English natural-language text while leaving acronyms universal', () => {
    assert.equal(detectTextLocale('Руководитель веб-разработки'), 'ru')
    assert.equal(detectTextLocale('Backend-әзірлеуші'), 'kk')
    assert.equal(detectTextLocale('iOS Engineering Lead'), 'en')
    assert.equal(detectTextLocale('CTO'), null)
    assert.equal(detectTextLocale('SRE / DevOps'), 'en')
    assert.equal(detectTextLocale('QA'), null)
  })

  it('keeps Latin technical tags universal and flags only Cyrillic/Kazakh skills', () => {
    assert.equal(detectSkillLocale('React'), null)
    assert.equal(detectSkillLocale('PostgreSQL'), null)
    assert.equal(detectSkillLocale('Веб-доступность'), 'ru')
    assert.equal(detectSkillLocale('Бағдарламалау'), 'kk')
  })

  it('marks Russian profile fields only when viewed in kk or en UI', () => {
    const ruCandidate = {
      role: 'Руководитель frontend-команды',
      skills: ['React', 'TypeScript', 'Веб-доступность'],
      interests: ['Дизайн-системы'],
      about: 'Ищу инженеров в команду.',
    }

    assert.deepEqual(inspectCandidateLanguage(ruCandidate, 'ru'), {
      roleLocale: 'ru',
      originLocale: null,
      hasOriginalLanguageFields: false,
    })
    assert.deepEqual(inspectCandidateLanguage(ruCandidate, 'en'), {
      roleLocale: 'ru',
      originLocale: 'ru',
      hasOriginalLanguageFields: true,
    })
    assert.deepEqual(inspectCandidateLanguage(ruCandidate, 'kk'), {
      roleLocale: 'ru',
      originLocale: 'ru',
      hasOriginalLanguageFields: true,
    })
  })

  it('marks English profile fields when viewed in ru or kk UI and stays clean in en UI', () => {
    const enCandidate = {
      role: 'iOS Engineering Lead',
      skills: ['Swift', 'SwiftUI', 'iOS'],
      interests: ['Mobile'],
      about: 'Hiring iOS developers for our mobile apps.',
    }

    assert.deepEqual(inspectCandidateLanguage(enCandidate, 'en'), {
      roleLocale: 'en',
      originLocale: null,
      hasOriginalLanguageFields: false,
    })
    assert.deepEqual(inspectCandidateLanguage(enCandidate, 'ru'), {
      roleLocale: 'en',
      originLocale: 'en',
      hasOriginalLanguageFields: true,
    })
    assert.deepEqual(inspectCandidateLanguage(enCandidate, 'kk'), {
      roleLocale: 'en',
      originLocale: 'en',
      hasOriginalLanguageFields: true,
    })
  })

  it('marks Kazakh profile fields when viewed in ru or en UI and stays clean in kk UI', () => {
    const kkCandidate = {
      role: 'Backend-әзірлеуші',
      skills: ['Go', 'PostgreSQL', 'Жүйелік жобалау'],
      interests: ['API'],
      about: 'Жоғары жүктемелі сервистер жасаймын.',
    }

    assert.deepEqual(inspectCandidateLanguage(kkCandidate, 'kk'), {
      roleLocale: 'kk',
      originLocale: null,
      hasOriginalLanguageFields: false,
    })
    assert.deepEqual(inspectCandidateLanguage(kkCandidate, 'ru'), {
      roleLocale: 'kk',
      originLocale: 'kk',
      hasOriginalLanguageFields: true,
    })
    assert.deepEqual(inspectCandidateLanguage(kkCandidate, 'en'), {
      roleLocale: 'kk',
      originLocale: 'kk',
      hasOriginalLanguageFields: true,
    })
  })
})
