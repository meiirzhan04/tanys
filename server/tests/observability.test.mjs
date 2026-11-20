import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { test } from 'node:test'
import {
  createMetricsTracker,
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
