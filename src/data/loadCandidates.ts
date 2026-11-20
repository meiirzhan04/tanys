import type { Candidate, Goal } from '../matching/types'

const VALID_GOALS: ReadonlySet<string> = new Set<Goal>([
  'find_job',
  'hire',
  'find_mentor',
  'be_mentor',
  'find_cofounder',
  'exchange_experience',
])

const MIN_FULL_DATASET_SIZE = 10

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string')
}

function isGoal(value: unknown): value is Goal {
  return typeof value === 'string' && VALID_GOALS.has(value)
}

function toCandidate(entry: unknown): Candidate | null {
  if (!entry || typeof entry !== 'object') return null
  const record = entry as Record<string, unknown>
  if (
    typeof record.id !== 'string' ||
    !record.id.trim() ||
    typeof record.name !== 'string' ||
    !record.name.trim() ||
    typeof record.role !== 'string' ||
    !isStringArray(record.skills) ||
    typeof record.experienceYears !== 'number' ||
    !Number.isFinite(record.experienceYears) ||
    record.experienceYears < 0 ||
    !isStringArray(record.interests) ||
    typeof record.about !== 'string' ||
    !isGoal(record.goal)
  ) {
    return null
  }

  if (record.lookingFor !== undefined && !isStringArray(record.lookingFor)) {
    return null
  }

  return {
    id: record.id.trim(),
    name: record.name.trim(),
    role: record.role.trim(),
    skills: record.skills,
    experienceYears: record.experienceYears,
    interests: record.interests,
    about: record.about,
    goal: record.goal,
    ...(record.lookingFor ? { lookingFor: record.lookingFor } : {}),
  }
}

/** Validate raw JSON profiles, dropping invalid records and duplicate IDs. */
export function parseCandidates(raw: unknown): Candidate[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const result: Candidate[] = []

  for (const entry of raw) {
    const candidate = toCandidate(entry)
    if (!candidate || seen.has(candidate.id)) continue
    seen.add(candidate.id)
    result.push(candidate)
  }

  return result
}

/** Use validated profiles.json exclusively once populated (#4), otherwise include demo fallback. */
export function resolveAppCandidates(
  rawProfiles: unknown,
  fallbackProfiles: readonly Candidate[],
): Candidate[] {
  const primary = parseCandidates(rawProfiles)
  if (primary.length >= MIN_FULL_DATASET_SIZE) {
    return primary
  }

  const seen = new Set(primary.map(candidate => candidate.id))
  const combined = [...primary]
  for (const fallback of fallbackProfiles) {
    if (seen.has(fallback.id)) continue
    seen.add(fallback.id)
    combined.push(fallback)
  }
  return combined
}
