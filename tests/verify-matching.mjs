import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { performance } from 'node:perf_hooks'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const VALID_GOALS = new Set([
  'find_job',
  'hire',
  'find_mentor',
  'be_mentor',
  'find_cofounder',
  'exchange_experience',
])

export const COMPATIBLE_GOALS = {
  find_job: new Set(['hire']),
  hire: new Set(['find_job']),
  find_mentor: new Set(['be_mentor']),
  be_mentor: new Set(['find_mentor']),
  find_cofounder: new Set(['find_cofounder']),
  exchange_experience: new Set(['exchange_experience']),
}

const MAX_LATENCY_MS = 3000

/** Validate candidate dataset shape without importing runtime TS modules. */
export function validateCandidates(candidates) {
  const errors = []
  if (!Array.isArray(candidates)) {
    return ['profiles.json must contain an array']
  }

  const seenIds = new Set()
  for (const [index, candidate] of candidates.entries()) {
    const label = candidate?.id ?? `#${index}`
    if (!candidate || typeof candidate !== 'object') {
      errors.push(`Candidate ${label} is not an object`)
      continue
    }
    if (typeof candidate.id !== 'string' || !candidate.id.trim()) {
      errors.push(`Candidate #${index} has invalid id`)
    } else if (seenIds.has(candidate.id)) {
      errors.push(`Duplicate candidate id: ${candidate.id}`)
    } else {
      seenIds.add(candidate.id)
    }
    if (!VALID_GOALS.has(candidate.goal)) {
      errors.push(`Candidate ${label} has invalid goal: ${String(candidate.goal)}`)
    }
    if (typeof candidate.experienceYears !== 'number' || Number.isNaN(candidate.experienceYears)) {
      errors.push(`Candidate ${label} has non-numeric experienceYears`)
    }
    if (!Array.isArray(candidate.skills) || !Array.isArray(candidate.interests)) {
      errors.push(`Candidate ${label} must have skills and interests arrays`)
    }
  }
  return errors
}

/** Normalize different fixture JSON layouts into a list of test cases. */
export function normalizeFixtures(raw, fallbackId) {
  const items = Array.isArray(raw) ? raw : [raw]
  return items.map((item, idx) => {
    const input = item?.input ?? item?.profile ?? item
    const id = item?.id ?? (items.length === 1 ? fallbackId : `${fallbackId}-${idx + 1}`)
    return {
      id,
      label: item?.label ?? item?.title ?? item?.description ?? id,
      input,
      expected: item?.expected ?? null,
    }
  })
}

export function loadScenariosFromDir(dirPath) {
  if (!existsSync(dirPath)) return []
  const files = readdirSync(dirPath).filter((name) => name.endsWith('.json')).sort()
  return files.flatMap((file) => {
    const raw = JSON.parse(readFileSync(join(dirPath, file), 'utf8'))
    return normalizeFixtures(raw, file.replace(/\.json$/i, ''))
  })
}

function normalizeTerms(values) {
  return (Array.isArray(values) ? values : [])
    .map((v) => String(v).trim().toLowerCase())
    .filter(Boolean)
}

/** Check whether a recommendation matches mutual goal and optional fixture criteria. */
export function evaluateRecommendation(input, recommendation, expected) {
  const candidate = recommendation?.candidate
  if (!candidate) return { ok: false, reason: 'missing candidate' }

  const allowedGoals = COMPATIBLE_GOALS[input.goal]
  if (!allowedGoals?.has(candidate.goal)) {
    return { ok: false, reason: `incompatible goal ${candidate.goal} for ${input.goal}` }
  }
  if (!recommendation.explanation || !String(recommendation.explanation).trim()) {
    return { ok: false, reason: 'empty explanation' }
  }

  const expectedTerms = normalizeTerms(
    expected?.anySkillsOrLookingFor ?? expected?.keywords ?? expected?.skills,
  )
  if (expectedTerms.length > 0) {
    const candidateTerms = new Set([
      ...normalizeTerms(candidate.skills),
      ...normalizeTerms(candidate.lookingFor),
      ...normalizeTerms(candidate.interests),
    ])
    const matched = expectedTerms.some(
      (term) =>
        candidateTerms.has(term) ||
        String(candidate.about ?? '').toLowerCase().includes(term) ||
        String(candidate.role ?? '').toLowerCase().includes(term),
    )
    if (!matched) {
      return { ok: false, reason: `missing expected terms (${expectedTerms.join(', ')})` }
    }
  }

  return { ok: true }
}

/** Execute recommend() over a scenario and verify timing, uniqueness, and relevance. */
export function runScenario(recommend, candidates, scenario) {
  const start = performance.now()
  const results = recommend(scenario.input, candidates)
  const durationMs = Number((performance.now() - start).toFixed(2))

  const seenIds = new Set()
  const checks = results.map((rec) => {
    const id = rec?.candidate?.id
    if (seenIds.has(id)) {
      return { ok: false, reason: `duplicate candidate id ${id}` }
    }
    seenIds.add(id)
    return evaluateRecommendation(scenario.input, rec, scenario.expected)
  })

  const relevantCount = checks.filter((c) => c.ok).length
  const issues = checks.filter((c) => !c.ok).map((c) => c.reason)

  return {
    id: scenario.id,
    goal: scenario.input.goal,
    total: results.length,
    relevantCount,
    durationMs,
    withinSla: durationMs < MAX_LATENCY_MS,
    issues,
  }
}

async function main() {
  const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const profilesPath = join(rootDir, 'src', 'data', 'profiles.json')
  const candidates = JSON.parse(readFileSync(profilesPath, 'utf8'))

  const dataErrors = validateCandidates(candidates)
  console.log(`Profiles loaded: ${candidates.length}, schema errors: ${dataErrors.length}`)
  if (dataErrors.length > 0) {
    console.error(dataErrors.slice(0, 10).join('\n'))
    process.exitCode = 1
  }

  const fixtures = loadScenariosFromDir(join(rootDir, 'tests', 'fixtures'))
  const teamScenarios = loadScenariosFromDir(join(rootDir, 'tests', 'scenarios'))
  const allScenarios = [...fixtures, ...teamScenarios]
  console.log(`Scenarios: ${fixtures.length} fixtures (#4) + ${teamScenarios.length} team inputs`)

  const recommendPath = join(rootDir, 'src', 'matching', 'recommend.ts')
  if (!existsSync(recommendPath)) {
    console.log('PENDING #3: src/matching/recommend.ts not present yet; scenario check skipped.')
    return
  }

  const mod = await import(pathToFileURL(recommendPath).href)
  const recommend = mod.recommend ?? mod.default
  if (typeof recommend !== 'function') {
    throw new Error('recommend() export not found in src/matching/recommend.ts')
  }

  const emptyResult = recommend(teamScenarios[0].input, [])
  if (!Array.isArray(emptyResult) || emptyResult.length !== 0) {
    throw new Error(`Expected empty array for empty candidates, got ${JSON.stringify(emptyResult)}`)
  }

  let hasFailures = false
  const requireFullFiveCheck = candidates.length >= 100
  for (const scenario of allScenarios) {
    const report = runScenario(recommend, candidates, scenario)
    const minExpected = requireFullFiveCheck ? 3 : Math.min(3, report.total)
    const passed = report.withinSla && report.relevantCount >= minExpected && report.total <= 5
    if (!passed) hasFailures = true
    console.log(
      `[${passed ? 'PASS' : 'FAIL'}] ${report.id} (${report.goal}): ${report.relevantCount}/${report.total} relevant in ${report.durationMs}ms${
        report.issues.length ? ` | issues: ${report.issues.join('; ')}` : ''
      }`,
    )
  }

  if (hasFailures) process.exitCode = 1
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
}
