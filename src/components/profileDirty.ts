import type { Goal } from '../matching/types'

export interface EventProfileDraft {
  name: string
  goal: Goal | ''
  role: string
  experience: string
  skills: string
  interests: string
  about: string
  lookingFor: string
  visible: boolean
  consentAccepted: boolean
}

export function parseProfileTopics(value: string): string[] {
  return value.split(/[,;\n]/).map(item => item.trim()).filter(Boolean)
}

/**
 * Skills typed without commas ("Python FastAPI PostgreSQL") become separate skills. Two-word skills such as
 * "Spring Boot" or "Компьютерное зрение" stay whole; only items of three or more words are split.
 */
export function parseSkillTopics(value: string): string[] {
  return parseProfileTopics(value).flatMap(item => {
    const words = item.split(/\s+/)
    return words.length >= 3 ? words : [item]
  })
}

function goalUsesLookingFor(goal: Goal | ''): boolean {
  return goal === 'hire' || goal === 'find_cofounder' || goal === 'find_mentor'
}

/**
 * Compares the current profile draft against the last saved server profile.
 * Returns false when no saved profile exists yet or when edited fields match
 * the original saved values again.
 */
export function hasUnsavedProfileChanges(
  savedBaseline: EventProfileDraft | null,
  current: EventProfileDraft,
): boolean {
  if (!savedBaseline) return false

  if (savedBaseline.name.trim() !== current.name.trim()) return true
  if (savedBaseline.goal !== current.goal) return true
  if (savedBaseline.role.trim() !== current.role.trim()) return true
  if (savedBaseline.experience.trim() !== current.experience.trim()) return true
  if (savedBaseline.about.trim() !== current.about.trim()) return true
  if (savedBaseline.visible !== current.visible) return true
  if (savedBaseline.consentAccepted !== current.consentAccepted) return true

  const savedSkills = parseProfileTopics(savedBaseline.skills).join('\0')
  const currentSkills = parseProfileTopics(current.skills).join('\0')
  if (savedSkills !== currentSkills) return true

  const savedInterests = parseProfileTopics(savedBaseline.interests).join('\0')
  const currentInterests = parseProfileTopics(current.interests).join('\0')
  if (savedInterests !== currentInterests) return true

  const savedLooking = goalUsesLookingFor(savedBaseline.goal)
    ? parseProfileTopics(savedBaseline.lookingFor).join('\0')
    : ''
  const currentLooking = goalUsesLookingFor(current.goal)
    ? parseProfileTopics(current.lookingFor).join('\0')
    : ''
  if (savedLooking !== currentLooking) return true

  return false
}
