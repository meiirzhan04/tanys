import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { test } from 'node:test'
import {
  createMetricsTracker,
  createObservedRequestHandler,
  evaluateAlertThresholds,
  formatSafeLog,
  redactPii,
} from '../dist/observability.js'
import { checkServiceHealth, dispatchAlert } from '../../deploy/health-alert.mjs'

test('redactPii and formatSafeLog strip personal data and mask inline emails', () => {
  const input = {
    email: 'participant@example.kz',
    contact: '@participant',
    about: 'Личный текст о себе',
    code: '123456',
    nested: { cookie: 'tanys_session=secret', note: 'contact user@tanys.kz for help' },
    status: 500,
    route: '/api/v1/auth/sessions',
  }

  const sanitized = redactPii(input)
  assert.equal(sanitized.email, '[redacted]')
  assert.equal(sanitized.contact, '[redacted]')
  assert.equal(sanitized.about, '[redacted]')
  assert.equal(sanitized.code, '[redacted]')
  assert.equal(sanitized.nested.cookie, '[redacted]')
  assert.equal(sanitized.nested.note, 'contact [redacted-email] for help')
  assert.equal(sanitized.status, 500)

  const line = formatSafeLog('error', 'auth_failed', input)
  assert.doesNotMatch(line, /participant@example\.kz|user@tanys\.kz|123456|tanys_session|Личный текст/)
  assert.equal(JSON.parse(line).event, 'auth_failed')
})

test('metrics tracker and threshold evaluator fire alerts on 5xx, auth, latency, and email failures', () => {
  const tracker = createMetricsTracker()
  for (let i = 0; i < 5; i += 1) tracker.recordHttp(500, false)
  for (let i = 0; i < 20; i += 1) tracker.recordHttp(401, true)
  for (let i = 0; i < 10; i += 1) tracker.recordMatchingLatency(i === 9 ? 1850 : 120)
  for (let i = 0; i < 9; i += 1) tracker.recordEmailDelivery(true)
  tracker.recordEmailDelivery(false)
  tracker.setReady(false)

  const snapshot = tracker.snapshot()
  const codes = evaluateAlertThresholds(snapshot).map(alert => alert.code).sort()
  assert.deepEqual(codes, [
    'api_5xx_spike',
    'auth_error_spike',
    'email_delivery_degraded',
    'matching_latency_high',
    'readiness_down',
  ])
})

test('simulated failure and 503 readiness deliver PII-free alert to responsible webhook', async () => {
  const received = []
  const webhookServer = createServer((req, res) => {
    let body = ''
    req.on('data', chunk => {
      body += chunk
    })
    req.on('end', () => {
      received.push(JSON.parse(body))
      res.writeHead(200)
      res.end('ok')
    })
  })

  const apiServer = createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ status: 'alive' }))
      return
    }
    res.writeHead(503, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'unavailable' }))
  })

  await new Promise(resolve => webhookServer.listen(0, '127.0.0.1', resolve))
  await new Promise(resolve => apiServer.listen(0, '127.0.0.1', resolve))

  try {
    const webhookPort = webhookServer.address().port
    const apiPort = apiServer.address().port

    // 1) Simulated outage test
    const simReport = await checkServiceHealth({
      baseUrl: `http://127.0.0.1:${apiPort}`,
      env: 'staging',
      simulateFailure: true,
    })
    assert.equal(simReport.ok, false)
    assert.equal(simReport.reason, 'simulated_outage_test')
    await dispatchAlert(`http://127.0.0.1:${webhookPort}`, simReport)

    // 2) Real HTTP 503 readiness probe failure
    const liveReport = await checkServiceHealth({
      baseUrl: `http://127.0.0.1:${apiPort}`,
      env: 'staging',
    })
    assert.equal(liveReport.ok, false)
    assert.equal(liveReport.reason, 'ready_http_503_unavailable')
    await dispatchAlert(`http://127.0.0.1:${webhookPort}`, liveReport)

    assert.equal(received.length, 2)
    assert.equal(received[0].severity, 'critical')
    assert.equal(received[0].reason, 'simulated_outage_test')
    assert.equal(received[1].reason, 'ready_http_503_unavailable')
  } finally {
    await new Promise(resolve => webhookServer.close(resolve))
    await new Promise(resolve => apiServer.close(resolve))
  }
})

test('observed request handler emits PII-safe logs, 5xx support requestId, and metrics/alerts', async () => {
  const logs = []
  const metrics = createMetricsTracker()
  let ready = true
  let challengeShouldFail = false

  const stubRoute = async (req, res, path) => {
    if (req.method === 'POST' && path === '/auth/challenges') {
      if (challengeShouldFail) {
        const err = new Error('mail_unavailable')
        err.status = 503
        err.code = 'mail_unavailable'
        throw err
      }
      res.writeHead(202, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ challengeId: 'c1' }))
      return true
    }
    if (req.method === 'GET' && path === '/events/11111111-1111-4111-8111-111111111111/recommendations') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ items: [] }))
      return true
    }
    if (req.method === 'GET' && path === '/explode') {
      throw new Error('Unexpected failure for participant@example.kz')
    }
    return false
  }

  const handler = createObservedRequestHandler({
    appOrigin: 'https://tanys.example.kz',
    routes: [stubRoute],
    checkReady: async () => ready,
    metrics,
    log: line => logs.push(line),
  })

  const server = createServer(handler)
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const baseUrl = `http://127.0.0.1:${server.address().port}`

  try {
    // 1) Successful OTP challenge records emailSent
    const okChallenge = await fetch(`${baseUrl}/api/v1/auth/challenges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://tanys.example.kz',
        Cookie: 'tanys_session=topsecretcookie',
      },
      body: JSON.stringify({ email: 'secret@example.kz', purpose: 'login' }),
    })
    assert.equal(okChallenge.status, 202)

    // 2) Failed SMTP challenge returns 503 + requestId and records emailFailed + authErrors
    challengeShouldFail = true
    const failChallenge = await fetch(`${baseUrl}/api/v1/auth/challenges`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://tanys.example.kz' },
      body: JSON.stringify({ email: 'secret@example.kz', purpose: 'login' }),
    })
    assert.equal(failChallenge.status, 503)
    const failBody = await failChallenge.json()
    assert.equal(failBody.error.code, 'mail_unavailable')
    assert.match(failBody.error.requestId, /^[0-9a-f-]{36}$/i)

    // 3) Matching route tracks latency and strips query string from logs
    const recRes = await fetch(
      `${baseUrl}/api/v1/events/11111111-1111-4111-8111-111111111111/recommendations?email=leak@example.kz`,
    )
    assert.equal(recRes.status, 200)

    // 4) Unhandled 500 error returns internal_error + requestId without leaking error text/PII
    const boomRes = await fetch(`${baseUrl}/api/v1/explode`)
    assert.equal(boomRes.status, 500)
    const boomBody = await boomRes.json()
    assert.equal(boomBody.error.code, 'internal_error')
    assert.match(boomBody.error.requestId, /^[0-9a-f-]{36}$/i)

    // 5) Cross-origin POST rejected with 403 invalid_origin (no requestId needed on 4xx)
    const badOrigin = await fetch(`${baseUrl}/api/v1/auth/challenges`, {
      method: 'POST',
      headers: { Origin: 'https://evil.example' },
    })
    assert.equal(badOrigin.status, 403)
    assert.deepEqual(await badOrigin.json(), { error: { code: 'invalid_origin' } })

    // 6) Readiness outage returns 503 and emits readiness_down alert
    ready = false
    const readyRes = await fetch(`${baseUrl}/ready`)
    assert.equal(readyRes.status, 503)

    const snapshot = metrics.snapshot()
    assert.equal(snapshot.emailSent, 1)
    assert.equal(snapshot.emailFailed, 1)
    assert.equal(snapshot.status5xx, 2)
    assert.equal(snapshot.authErrors, 2)
    assert.equal(snapshot.matchingSamples, 1)
    assert.equal(snapshot.ready, false)

    const joinedLogs = logs.join('\n')
    assert.doesNotMatch(joinedLogs, /secret@example\.kz|leak@example\.kz|participant@example\.kz|topsecretcookie/)
    const parsedLogs = logs.map(line => JSON.parse(line))
    assert.ok(parsedLogs.some(entry => entry.requestId === boomBody.error.requestId && entry.status === 500))
    assert.ok(
      parsedLogs.some(
        entry =>
          entry.event === 'alert_threshold_triggered' &&
          entry.alerts.some(alert => alert.alertCode === 'readiness_down'),
      ),
    )
  } finally {
    await new Promise(resolve => server.close(resolve))
  }
})
