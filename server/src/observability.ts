const REDACTED_KEYS = new Set([
  'email',
  'contact',
  'value',
  'about',
  'name',
  'code',
  'token',
  'password',
  'pass',
  'secret',
  'cookie',
  'authorization',
  'smtp_url',
  'pgpassword',
  'session_secret',
])

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

/** Recursively strip PII fields and mask inline emails before logging or alerting. */
export function redactPii(input: unknown): unknown {
  if (typeof input === 'string') {
    return input.replace(EMAIL_PATTERN, '[redacted-email]')
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
