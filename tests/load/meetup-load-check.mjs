import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { performance } from 'node:perf_hooks'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { recommend } from '../../src/matching/recommend.ts'
import {
  loadScenariosFromDir,
  runScenario,
  validateCandidates,
} from '../verify-matching.mjs'

const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

/** Deterministically expand synthetic base profiles to >= 300 unique participants for one meetup event. */
export function generateSyntheticMeetupPool(baseProfiles, targetCount = 320) {
  if (!Array.isArray(baseProfiles) || baseProfiles.length === 0) {
    throw new Error('Base profiles array must be non-empty')
  }
  const pool = []
  for (let i = 0; i < targetCount; i += 1) {
    const src = baseProfiles[i % baseProfiles.length]
    const cohort = Math.floor(i / baseProfiles.length)
    const id = `meetup-${String(i + 1).padStart(3, '0')}`
    if (cohort === 0) {
      pool.push({ ...src, id })
    } else {
      pool.push({
        ...src,
        id,
        name: `${src.name} (${cohort + 1})`,
        skills: [...src.skills],
        interests: [...src.interests],
        lookingFor: src.lookingFor ? [...src.lookingFor] : undefined,
      })
    }
  }
  return pool
}

export function percentile(samples, p) {
  if (!samples.length) return 0
  const sorted = [...samples].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1)
  return Number(sorted[index].toFixed(2))
}

async function runWithConcurrency(total, concurrency, worker) {
  const results = new Array(total)
  let nextIndex = 0
  async function runner() {
    while (nextIndex < total) {
      const idx = nextIndex
      nextIndex += 1
      results[idx] = await worker(idx)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, total) }, () => runner()))
  return results
}

function readJsonBody(req) {
  return new Promise((resolveBody, rejectBody) => {
    let raw = ''
    req.on('data', chunk => {
      raw += chunk
    })
    req.on('end', () => {
      try {
        resolveBody(raw ? JSON.parse(raw) : {})
      } catch (err) {
        rejectBody(err)
      }
    })
    req.on('error', rejectBody)
  })
}

/**
 * Local end-to-end HTTP load, concurrency, double-booking exclusion, and 320-participant
 * matching quality benchmark using the production recommend() engine.
 */
export async function runLocalMeetupBenchmark(options = {}) {
  const participantCount = options.participantCount ?? 320
  const loginRequests = options.loginRequests ?? 40
  const loginConcurrency = options.loginConcurrency ?? 20
  const matchingRequests = options.matchingRequests ?? 120
  const matchingConcurrency = options.matchingConcurrency ?? 24
  const bookingRaceAttempts = options.bookingRaceAttempts ?? 20

  const baseProfiles = JSON.parse(
    readFileSync(join(ROOT_DIR, 'src', 'data', 'profiles.json'), 'utf8'),
  )
  const participants = generateSyntheticMeetupPool(baseProfiles, participantCount)
  const schemaErrors = validateCandidates(participants)
  if (schemaErrors.length > 0) {
    throw new Error(`Synthetic meetup pool schema errors: ${schemaErrors.slice(0, 5).join('; ')}`)
  }

  const fixtures = loadScenariosFromDir(join(ROOT_DIR, 'tests', 'fixtures'))
  const teamScenarios = loadScenariosFromDir(join(ROOT_DIR, 'tests', 'scenarios'))
  const allScenarios = [...fixtures, ...teamScenarios]

  // In-memory event API server modeling auth, matching over 320 visible profiles,
  // and atomic overlap exclusion for meeting confirmation (same invariant as server/src/meetings.ts).
  const eventId = '11111111-1111-4111-8111-111111111111'
  const confirmedByUser = new Map()
  const meetings = new Map()
  for (let i = 0; i < bookingRaceAttempts; i += 1) {
    const id = `22222222-2222-4222-8222-${String(i + 1).padStart(12, '0')}`
    meetings.set(id, {
      id,
      userA: 'meetup-001',
      userB: `meetup-${String(i + 2).padStart(3, '0')}`,
      startMs: Date.parse('2027-02-01T07:00:00Z'),
      endMs: Date.parse('2027-02-01T07:20:00Z'),
      status: 'pending',
    })
  }

  function hasOverlap(userId, startMs, endMs) {
    const slots = confirmedByUser.get(userId) ?? []
    return slots.some(slot => slot.startMs < endMs && startMs < slot.endMs)
  }

  const server = createServer(async (req, res) => {
    const url = new URL(req.url || '/', 'http://127.0.0.1')
    const write = (status, payload) => {
      res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
      res.end(JSON.stringify(payload))
    }

    if (req.method === 'POST' && url.pathname === '/api/v1/auth/challenges') {
      await readJsonBody(req)
      return write(202, { challengeId: 'chg-load' })
    }
    if (req.method === 'POST' && url.pathname === '/api/v1/auth/sessions') {
      await readJsonBody(req)
      return write(200, { id: 'meetup-001' })
    }
    if (req.method === 'GET' && url.pathname === `/api/v1/events/${eventId}/recommendations`) {
      const idx = Number(url.searchParams.get('scenario') ?? 0) % allScenarios.length
      const locale = url.searchParams.get('locale') || 'ru'
      const scenario = allScenarios[idx]
      const items = recommend(scenario.input, participants, locale)
      return write(200, { items })
    }
    const meetMatch = url.pathname.match(/^\/api\/v1\/events\/[^/]+\/meetings\/([^/]+)$/)
    if (req.method === 'PATCH' && meetMatch) {
      const body = await readJsonBody(req)
      const meeting = meetings.get(meetMatch[1])
      if (!meeting) return write(404, { error: { code: 'not_found' } })
      if (body.status === 'confirmed') {
        if (
          hasOverlap(meeting.userA, meeting.startMs, meeting.endMs) ||
          hasOverlap(meeting.userB, meeting.startMs, meeting.endMs)
        ) {
          return write(409, { error: { code: 'slot_conflict' } })
        }
        meeting.status = 'confirmed'
        for (const uid of [meeting.userA, meeting.userB]) {
          const list = confirmedByUser.get(uid) ?? []
          list.push({ id: meeting.id, startMs: meeting.startMs, endMs: meeting.endMs })
          confirmedByUser.set(uid, list)
        }
        return write(200, { id: meeting.id, status: 'confirmed' })
      }
      return write(400, { error: { code: 'invalid_status' } })
    }

    return write(404, { error: { code: 'not_found' } })
  })

  await new Promise(resolveListen => server.listen(0, '127.0.0.1', resolveListen))
  const baseUrl = `http://127.0.0.1:${server.address().port}`

  try {
    // 1) Peak concurrent logins
    const loginStats = await runWithConcurrency(loginRequests, loginConcurrency, async idx => {
      const t0 = performance.now()
      const chg = await fetch(`${baseUrl}/api/v1/auth/challenges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: `synthetic-${idx}@meetup.test`, purpose: 'login' }),
      })
      const ses = await fetch(`${baseUrl}/api/v1/auth/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId: 'chg-load', code: '000000' }),
      })
      const ok = chg.status === 202 && ses.status === 200
      return { ok, durationMs: performance.now() - t0 }
    })

    // 2) Peak concurrent matching over 320 participants
    const matchingStats = await runWithConcurrency(matchingRequests, matchingConcurrency, async idx => {
      const t0 = performance.now()
      const response = await fetch(
        `${baseUrl}/api/v1/events/${eventId}/recommendations?scenario=${idx % allScenarios.length}&locale=ru`,
      )
      const data = await response.json()
      const ok = response.status === 200 && Array.isArray(data.items) && data.items.length === 5
      return { ok, durationMs: performance.now() - t0 }
    })

    // 3) Concurrent overlapping booking confirmations
    const meetingIds = [...meetings.keys()]
    const raceResults = await Promise.all(
      meetingIds.map(async id => {
        const response = await fetch(`${baseUrl}/api/v1/events/${eventId}/meetings/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'confirmed' }),
        })
        return response.status
      }),
    )

    const confirmedCount = raceResults.filter(status => status === 200).length
    const conflictCount = raceResults.filter(status => status === 409).length
    const bookingErrors = raceResults.filter(status => status !== 200 && status !== 409).length
    const userASlots = confirmedByUser.get('meetup-001') ?? []
    const confirmedDoubleBookings = Math.max(0, userASlots.length - 1)

    // 4) Relevance & explanations check on all 13 control scenarios against 320 participants
    const scenarios = allScenarios.map(scenario => {
      const report = runScenario(recommend, participants, scenario)
      const minExpected = scenario.expected?.minRelevantInTopFive ?? 3
      return {
        ...report,
        minExpected,
        passed: report.withinSla && report.total === 5 && report.relevantCount >= minExpected,
      }
    })

    const loginDurations = loginStats.map(s => s.durationMs)
    const matchDurations = matchingStats.map(s => s.durationMs)

    return {
      mode: 'local',
      participants: participants.length,
      goalsDistribution: Object.fromEntries(
        ['find_job', 'hire', 'find_mentor', 'be_mentor', 'find_cofounder', 'exchange_experience'].map(goal => [
          goal,
          participants.filter(p => p.goal === goal).length,
        ]),
      ),
      loadProfile: {
        loginRequests,
        loginConcurrency,
        matchingRequests,
        matchingConcurrency,
        bookingRaceAttempts,
      },
      login: {
        errors: loginStats.filter(s => !s.ok).length,
        p50Ms: percentile(loginDurations, 0.5),
        p95Ms: percentile(loginDurations, 0.95),
        maxMs: percentile(loginDurations, 1),
      },
      matching: {
        errors: matchingStats.filter(s => !s.ok).length,
        p50Ms: percentile(matchDurations, 0.5),
        p95Ms: percentile(matchDurations, 0.95),
        p99Ms: percentile(matchDurations, 0.99),
        maxMs: percentile(matchDurations, 1),
      },
      bookingRace: {
        attempts: bookingRaceAttempts,
        confirmedCount,
        conflictCount,
        unexpectedErrors: bookingErrors,
        confirmedDoubleBookings,
      },
      relevance: {
        totalScenarios: scenarios.length,
        passedScenarios: scenarios.filter(s => s.passed).length,
        relevantTotal: scenarios.reduce((sum, s) => sum + s.relevantCount, 0),
        cardsTotal: scenarios.reduce((sum, s) => sum + s.total, 0),
        scenarios,
      },
    }
  } finally {
    await new Promise(resolveClose => server.close(resolveClose))
  }
}

async function main() {
  const args = process.argv.slice(2)
  const modeIndex = args.indexOf('--mode')
  const mode = modeIndex >= 0 ? args[modeIndex + 1] : 'local'
  const baseUrlIndex = args.indexOf('--base-url')
  const baseUrl = baseUrlIndex >= 0 ? args[baseUrlIndex + 1] : process.env.STAGING_BASE_URL || ''

  if (mode === 'staging') {
    if (!baseUrl) {
      console.error('Missing --base-url or STAGING_BASE_URL for staging mode.')
      process.exitCode = 2
      return
    }
    const t0 = performance.now()
    const ready = await fetch(`${baseUrl.replace(/\/$/, '')}/ready`)
    const latencyMs = Number((performance.now() - t0).toFixed(2))
    console.log(JSON.stringify({ mode: 'staging', baseUrl, readyStatus: ready.status, latencyMs }))
    if (ready.status !== 200) {
      process.exitCode = 1
    }
    return
  }

  const report = await runLocalMeetupBenchmark()
  console.log(JSON.stringify(report, null, 2))
  const failed =
    report.participants < 300 ||
    report.login.errors > 0 ||
    report.matching.errors > 0 ||
    report.matching.p95Ms >= 3000 ||
    report.bookingRace.confirmedCount !== 1 ||
    report.bookingRace.confirmedDoubleBookings > 0 ||
    report.bookingRace.unexpectedErrors > 0 ||
    report.relevance.passedScenarios !== report.relevance.totalScenarios
  if (failed) process.exitCode = 1
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(err => {
    console.error(err)
    process.exitCode = 1
  })
}
