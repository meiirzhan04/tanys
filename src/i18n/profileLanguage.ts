import type { Candidate, Locale } from '../matching/types'

const KAZAKH_CYRILLIC = /[әғқңөұүһі]/iu
const CYRILLIC = /[а-яё]/iu
const ENGLISH_WORD = /[a-z]{2,}/
const UNIVERSAL_ACRONYM = /^[A-Z0-9/+.#&\- ]{1,12}$/

export function detectTextLocale(value: string): Locale | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (KAZAKH_CYRILLIC.test(trimmed)) return 'kk'
  if (CYRILLIC.test(trimmed)) return 'ru'
  if (UNIVERSAL_ACRONYM.test(trimmed)) return null
  if (ENGLISH_WORD.test(trimmed)) return 'en'
  return null
}

export function detectSkillLocale(value: string): Locale | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (KAZAKH_CYRILLIC.test(trimmed)) return 'kk'
  if (CYRILLIC.test(trimmed)) return 'ru'
  return null
}

export interface CandidateLanguageInfo {
  roleLocale: Locale | null
  originLocale: Locale | null
  hasOriginalLanguageFields: boolean
}

export function inspectCandidateLanguage(
  candidate: Pick<Candidate, 'role' | 'skills' | 'interests' | 'about'>,
  uiLocale: Locale,
): CandidateLanguageInfo {
  const roleLocale = detectTextLocale(candidate.role)
  const foreignSkillLocale =
    candidate.skills.map(detectSkillLocale).find((lang): lang is Locale => lang !== null && lang !== uiLocale) ?? null
  const roleDiffers = roleLocale !== null && roleLocale !== uiLocale
  const hasOriginalLanguageFields = roleDiffers || foreignSkillLocale !== null
  const originLocale = roleDiffers
    ? roleLocale
    : foreignSkillLocale ?? (hasOriginalLanguageFields ? detectTextLocale(candidate.about) : null)

  return {
    roleLocale,
    originLocale,
    hasOriginalLanguageFields,
  }
}
