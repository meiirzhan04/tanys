import type { Goal } from '../../matching/types'
import type { ProfileCheckKey } from './profileCopy'

export interface ProfileSnapshot {
  goal: Goal | ''
  role: string
  experienceYears: number | null
  skills: readonly string[]
  interests: readonly string[]
  about: string
  lookingFor: readonly string[]
}

export interface ProfileCompleteness {
  percent: number
  missing: ProfileCheckKey[]
}

const MIN_SKILLS = 3
const MIN_INTERESTS = 2
const MIN_ABOUT_LENGTH = 60

/** Goals whose matching benefits from an explicit "looking for" list. */
export function goalUsesLookingFor(goal: Goal | ''): boolean {
  return goal === 'find_job' || goal === 'hire' || goal === 'find_mentor' || goal === 'find_cofounder'
}

/** Scores how much signal a profile gives the matcher and lists what is still missing. */
export function getProfileCompleteness(profile: ProfileSnapshot): ProfileCompleteness {
  const checks: [ProfileCheckKey, boolean][] = [
    ['goal', profile.goal !== ''],
    ['role', profile.role.trim().length > 0],
    ['experience', profile.experienceYears !== null],
    ['skills', profile.skills.length >= MIN_SKILLS],
    ['interests', profile.interests.length >= MIN_INTERESTS],
    ['about', profile.about.trim().length >= MIN_ABOUT_LENGTH],
  ]
  if (goalUsesLookingFor(profile.goal)) checks.push(['lookingFor', profile.lookingFor.length > 0])

  const passed = checks.filter(([, ok]) => ok).length
  return {
    percent: Math.round((passed / checks.length) * 100),
    missing: checks.filter(([, ok]) => !ok).map(([key]) => key),
  }
}
