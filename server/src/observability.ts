import { randomUUID } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { performance } from 'node:perf_hooks'

const REDACTED_KEYS = new Set([
  'email',
  'contact',
  'value',
  'about',
  'details',
  'name',
  'code',
  'token',
  'password',
  'pass',
  'secret',
  'cookie',
  'authorization',
  'smtp_url',
  'database_url',
  'pgpassword',
  'session_secret',
])

const CREDENTIAL_URL_PATTERN = /\b(postgres(?:ql)?|smtps?):\/\/[^:\s/]+:[^@\s]+@/gi
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi

export interface MetricsSnapshot {
  requestsTotal: number
  status4xx: number
  status5xx: number
  authErrors: number
  emailSent: number
  emailFailed: number
  matchingSamples: number
  matchingP95Ms: number
  ready: boolean
}

export interface AlertThresholds {
  maxStatus5xx: number
  maxAuthErrors: number
  maxMatchingP95Ms: number
  maxEmailFailureRate: number
  minEmailsForRateAlert: number
}

export interface AlertEvent {
  code: 'readiness_down' | 'api_5xx_spike' | 'auth_error_spike' | 'matching_latency_high' | 'email_delivery_degraded'
  severity: 'critical' | 'warning'
  message: string
}

export const DEFAULT_ALERT_THRESHOLDS: AlertThresholds = {
  maxStatus5xx: 5,
  maxAuthErrors: 20,
  maxMatchingP95Ms: 1500,
  maxEmailFailureRate: 0.05,
  minEmailsForRateAlert: 5,
}

/** Recursively strip PII fields and mask inline credentials/emails before logging or alerting. */
export function redactPii(input: unknown): unknown {
  if (typeof input === 'string') {
    return input
      .replace(CREDENTIAL_URL_PATTERN, '$1://[redacted]@')
      .replace(EMAIL_PATTERN, '[redacted-email]')
  }
  if (Array.isArray(input)) {
    return input.map(item => redactPii(item))
  }
  if (input && typeof input === 'object') {
    const output: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(input as Record<string, unknown>)) {
      if (REDACTED_KEYS.has(key.toLowerCase())) {
        output[key] = '[redacted]'
      } else {
        output[key] = redactPii(val)
      }
    }
    return output
  }
  return input
}

/** Format a single-line JSON log entry guaranteed to exclude PII. */
export function formatSafeLog(
  level: 'info' | 'warn' | 'error',
  event: string,
  details: Record<string, unknown> = {},
): string {
  return JSON.stringify({
    ts: new Date().toISOString(),
    level,
    event,
    ...(redactPii(details) as Record<string, unknown>),
  })
}

function percentile95(samples: readonly number[]): number {
  if (!samples.length) return 0
  const sorted = [...samples].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)
  return Number(sorted[index].toFixed(2))
}

/** Track API availability, auth errors, matching latency, and email delivery without PII. */
export function createMetricsTracker(maxLatencySamples = 500) {
  let requestsTotal = 0
  let status4xx = 0
  let status5xx = 0
  let authErrors = 0
  let emailSent = 0
  let emailFailed = 0
  let ready = true
  const matchingDurationsMs: number[] = []

  return {
    recordHttp(status: number, isAuthRoute = false) {
      requestsTotal += 1
      if (status >= 500) status5xx += 1
      else if (status >= 400) status4xx += 1
      if (isAuthRoute && status >= 400) authErrors += 1
    },
    recordMatchingLatency(durationMs: number) {
      if (!Number.isFinite(durationMs) || durationMs < 0) return
      matchingDurationsMs.push(durationMs)
      if (matchingDurationsMs.length > maxLatencySamples) {
        matchingDurationsMs.shift()
      }
    },
    recordEmailDelivery(ok: boolean) {
      if (ok) emailSent += 1
      else emailFailed += 1
    },
    setReady(isReady: boolean) {
      ready = isReady
    },
    snapshot(): MetricsSnapshot {
      return {
        requestsTotal,
        status4xx,
        status5xx,
        authErrors,
        emailSent,
        emailFailed,
        matchingSamples: matchingDurationsMs.length,
        matchingP95Ms: percentile95(matchingDurationsMs),
        ready,
      }
    },
  }
}

/** Evaluate alert thresholds and emit PII-free operational alerts. */
export function evaluateAlertThresholds(
  snapshot: MetricsSnapshot,
  thresholds: AlertThresholds = DEFAULT_ALERT_THRESHOLDS,
): AlertEvent[] {
  const alerts: AlertEvent[] = []
  if (!snapshot.ready) {
    alerts.push({
      code: 'readiness_down',
      severity: 'critical',
      message: 'Service /ready probe is unavailable',
    })
  }
  if (snapshot.status5xx >= thresholds.maxStatus5xx) {
    alerts.push({
      code: 'api_5xx_spike',
      severity: 'critical',
      message: `API 5xx count reached ${snapshot.status5xx} (threshold ${thresholds.maxStatus5xx})`,
    })
  }
  if (snapshot.authErrors >= thresholds.maxAuthErrors) {
    alerts.push({
      code: 'auth_error_spike',
      severity: 'warning',
      message: `Auth error count reached ${snapshot.authErrors} (threshold ${thresholds.maxAuthErrors})`,
    })
  }
  if (snapshot.matchingP95Ms > thresholds.maxMatchingP95Ms) {
    alerts.push({
      code: 'matching_latency_high',
      severity: 'warning',
      message: `Matching p95 latency ${snapshot.matchingP95Ms}ms exceeds ${thresholds.maxMatchingP95Ms}ms`,
    })
  }
  const emailTotal = snapshot.emailSent + snapshot.emailFailed
  if (emailTotal >= thresholds.minEmailsForRateAlert) {
    const failureRate = snapshot.emailFailed / emailTotal
    if (failureRate > thresholds.maxEmailFailureRate) {
      alerts.push({
        code: 'email_delivery_degraded',
        severity: 'critical',
        message: `Email delivery failure rate ${(failureRate * 100).toFixed(1)}% exceeds ${(thresholds.maxEmailFailureRate * 100).toFixed(1)}%`,
      })
    }
  }
  return alerts
}

export type RouteHandler = (
  request: IncomingMessage,
  response: ServerResponse,
  path: string,
) => Promise<boolean>

export interface ObservedServerOptions {
  appOrigin: string
  routes: readonly RouteHandler[]
  checkReady: () => Promise<boolean>
  metrics?: ReturnType<typeof createMetricsTracker>
  thresholds?: AlertThresholds
  log?: (line: string) => void
}

interface HttpErrorLike {
  status: number
  code: string
}

function isHttpErrorLike(error: unknown): error is HttpErrorLike {
  return Boolean(
    error &&
      typeof error === 'object' &&
      typeof (error as { status?: unknown }).status === 'number' &&
      typeof (error as { code?: unknown }).code === 'string',
  )
}

function isLoopbackHttpOrigin(origin: string): boolean {
  try {
    const url = new URL(origin)
    return url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
  } catch {
    return false
  }
}

function isAllowedOrigin(requestOrigin: string | undefined, appOrigin: string): boolean {
  if (!requestOrigin || requestOrigin === appOrigin) return true
  return isLoopbackHttpOrigin(appOrigin) && isLoopbackHttpOrigin(requestOrigin)
}

function writeJson(response: ServerResponse, status: number, payload: unknown) {
  response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
  response.end(JSON.stringify(payload))
}

/** Create an HTTP request handler with PII-safe logging, metrics tracking, and 5xx support IDs. */
export function createObservedRequestHandler(options: ObservedServerOptions) {
  const metrics = options.metrics ?? createMetricsTracker()
  const thresholds = options.thresholds ?? DEFAULT_ALERT_THRESHOLDS
  const log = options.log ?? ((line: string) => console.log(line))
  const activeAlerts = new Set<AlertEvent['code']>()

  const emitNewAlerts = () => {
    const current = evaluateAlertThresholds(metrics.snapshot(), thresholds)
    const currentCodes = new Set(current.map(item => item.code))
    const newlyTriggered = current.filter(item => !activeAlerts.has(item.code))
    for (const code of [...activeAlerts]) {
      if (!currentCodes.has(code)) activeAlerts.delete(code)
    }
    if (newlyTriggered.length) {
      for (const item of newlyTriggered) activeAlerts.add(item.code)
      log(
        formatSafeLog('warn', 'alert_threshold_triggered', {
          alerts: newlyTriggered.map(({ code, severity, message }) => ({
            alertCode: code,
            severity,
            message,
          })),
        }),
      )
    }
  }

  return async (request: IncomingMessage, response: ServerResponse) => {
    const requestId = randomUUID()
    const startMs = performance.now()
    const rawPath = (request.url || '/').split('?')[0]
    const method = request.method || 'GET'

    if (request.url?.startsWith('/api/v1/')) {
      const path = rawPath.slice('/api/v1'.length)
      const isAuthRoute = path.startsWith('/auth/')
      let errorCode: string | undefined

      try {
        if (method !== 'GET' && !isAllowedOrigin(request.headers.origin, options.appOrigin)) {
          errorCode = 'invalid_origin'
          writeJson(response, 403, { error: { code: errorCode } })
        } else {
          let handled = false
          for (const route of options.routes) {
            if (await route(request, response, path)) {
              handled = true
              break
            }
          }
          if (!handled) {
            errorCode = 'not_found'
            writeJson(response, 404, { error: { code: errorCode } })
          }
        }
      } catch (error) {
        const known = isHttpErrorLike(error)
        const status = known ? error.status : 500
        errorCode = known ? error.code : 'internal_error'
        if (!response.headersSent) {
          writeJson(response, status, {
            error: status >= 500 ? { code: errorCode, requestId } : { code: errorCode },
          })
        }
      }

      const durationMs = Number((performance.now() - startMs).toFixed(2))
      const status = response.statusCode || 500
      metrics.recordHttp(status, isAuthRoute)
      if (method === 'POST' && path === '/auth/challenges') {
        if (status === 202) metrics.recordEmailDelivery(true)
        else if (errorCode === 'mail_unavailable' || status === 503) metrics.recordEmailDelivery(false)
      }
      if (method === 'GET' && /^\/events\/[^/]+\/recommendations$/.test(path) && status < 400) {
        metrics.recordMatchingLatency(durationMs)
      }

      const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info'
      log(
        formatSafeLog(level, 'http_request', {
          requestId,
          method,
          path: rawPath,
          status,
          durationMs,
          ...(errorCode ? { errorCode } : {}),
        }),
      )
      emitNewAlerts()
      return
    }

    let status = 404
    let message = 'not_found'
    if (method === 'GET' && request.url === '/health') {
      status = 200
      message = 'alive'
    }
    if (method === 'GET' && request.url === '/ready') {
      try {
        if (!(await options.checkReady())) throw new Error('Pending migrations')
        status = 200
        message = 'ready'
        metrics.setReady(true)
      } catch {
        status = 503
        message = 'unavailable'
        metrics.setReady(false)
      }
    }

    writeJson(response, status, { status: message })
    if (status >= 500) {
      const durationMs = Number((performance.now() - startMs).toFixed(2))
      log(formatSafeLog('error', 'probe_failed', { requestId, method, path: rawPath, status, durationMs }))
      emitNewAlerts()
    }
  }
}
