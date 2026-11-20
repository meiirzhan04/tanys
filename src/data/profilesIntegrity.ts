import type { Candidate, Goal } from '../matching/types'
import { parseCandidates } from './loadCandidates.ts'

export const REQUIRED_GOALS: readonly Goal[] = [
  'find_job',
  'hire',
  'find_mentor',
  'be_mentor',
  'find_cofounder',
  'exchange_experience',
]

const REQUIRED_GOAL_SET: ReadonlySet<string> = new Set<string>(REQUIRED_GOALS)
const MIN_PROFILES_COUNT = 100

function describeRejection(entry: unknown, index: number): string {
  if (!entry || typeof entry !== 'object') {
    return `Profile at index ${index} is not an object`
  }
  const record = entry as Record<string, unknown>
  const label = typeof record.id === 'string' && record.id.trim() ? `id="${record.id.trim()}" (index ${index})` : `index ${index}`

  if (typeof record.id !== 'string' || !record.id.trim()) {
    return `Profile at ${label} has invalid id`
  }
  if (typeof record.name !== 'string' || !record.name.trim()) {
    return `Profile ${label} has invalid name`
  }
  if (typeof record.role !== 'string') {
    return `Profile ${label} has invalid role`
  }
  if (!Array.isArray(record.skills) || !record.skills.every(item => typeof item === 'string')) {
    return `Profile ${label} has invalid skills array`
  }
  if (typeof record.experienceYears !== 'number' || !Number.isFinite(record.experienceYears) || record.experienceYears < 0) {
    return `Profile ${label} has invalid experienceYears: ${String(record.experienceYears)}`
  }
  if (!Array.isArray(record.interests) || !record.interests.every(item => typeof item === 'string')) {
    return `Profile ${label} has invalid interests array`
  }
  if (typeof record.about !== 'string') {
    return `Profile ${label} has invalid about text`
  }
  if (typeof record.goal !== 'string' || !REQUIRED_GOAL_SET.has(record.goal)) {
    return `Profile ${label} has unknown goal "${String(record.goal)}"`
  }
  if (record.lookingFor !== undefined && (!Array.isArray(record.lookingFor) || !record.lookingFor.every(item => typeof item === 'string'))) {
    return `Profile ${label} has invalid lookingFor array`
  }
  return `Profile ${label} was rejected by parseCandidates`
}

/** Validate shipped profiles.json through parseCandidates, throwing specific causes on failure. */
export function assertProfileDatasetIntegrity(raw: unknown, minCount = MIN_PROFILES_COUNT): Candidate[] {
  if (!Array.isArray(raw)) {
    throw new Error('Shipped profiles dataset must be a JSON array')
  }

  const seenIds = new Set<string>()
  for (let index = 0; index < raw.length; index += 1) {
    const entry = raw[index]
    const parsedSingle = parseCandidates([entry])
    if (parsedSingle.length !== 1) {
      throw new Error(describeRejection(entry, index))
    }
    const id = parsedSingle[0].id
    if (seenIds.has(id)) {
      throw new Error(`Duplicate candidate id "${id}" at index ${index}`)
    }
    seenIds.add(id)
  }

  const parsed = parseCandidates(raw)
  if (parsed.length !== raw.length) {
    throw new Error(`parseCandidates dropped ${raw.length - parsed.length} of ${raw.length} records`)
  }

  if (parsed.length < minCount) {
    throw new Error(`Expected at least ${minCount} valid profiles, got ${parsed.length}`)
  }

  const presentGoals = new Set<Goal>(parsed.map(candidate => candidate.goal))
  const missingGoals = REQUIRED_GOALS.filter(goal => !presentGoals.has(goal))
  if (missingGoals.length > 0) {
    throw new Error(`Missing required goal(s) in profiles dataset: ${missingGoals.join(', ')}`)
  }

  return parsed
}
