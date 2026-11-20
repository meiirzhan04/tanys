import { performance } from 'node:perf_hooks'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

/** Check /health and /ready endpoints and return a PII-free probe report. */
export async function checkServiceHealth({
  baseUrl,
  env = process.env.APP_ENV || 'staging',
  timeoutMs = 5000,
  simulateFailure = false,
}) {
  const checkedAt = new Date().toISOString()
  if (simulateFailure) {
    return {
      ok: false,
      env,
      baseUrl,
      checkedAt,
      latencyMs: 0,
      reason: 'simulated_outage_test',
    }
  }

  const start = performance.now()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const [healthRes, readyRes] = await Promise.all([
      fetch(`${baseUrl.replace(/\/$/, '')}/health`, { signal: controller.signal }),
      fetch(`${baseUrl.replace(/\/$/, '')}/ready`, { signal: controller.signal }),
    ])
    const latencyMs = Number((performance.now() - start).toFixed(1))

    if (healthRes.status !== 200) {
      return { ok: false, env, baseUrl, checkedAt, latencyMs, reason: `health_http_${healthRes.status}` }
    }
    const readyBody = await readyRes.json().catch(() => ({}))
    if (readyRes.status !== 200 || readyBody.status !== 'ready') {
      return {
        ok: false,
        env,
        baseUrl,
        checkedAt,
        latencyMs,
        reason: `ready_http_${readyRes.status}_${readyBody.status || 'unknown'}`,
      }
    }

    return { ok: true, env, baseUrl, checkedAt, latencyMs, reason: 'ok' }
  } catch (error) {
    const latencyMs = Number((performance.now() - start).toFixed(1))
    const code = error instanceof Error ? error.name : 'network_error'
    return { ok: false, env, baseUrl, checkedAt, latencyMs, reason: `probe_error_${code}` }
  } finally {
    clearTimeout(timer)
  }
}

/** Deliver a PII-free alert payload to ALERT_WEBHOOK_URL. */
export async function dispatchAlert(webhookUrl, report) {
  if (!webhookUrl) {
    throw new Error('ALERT_WEBHOOK_URL is required to send alerts')
  }
  const payload = {
    service: 'tanys',
    env: report.env,
    severity: 'critical',
    reason: report.reason,
    checkedAt: report.checkedAt,
    latencyMs: report.latencyMs,
    text: `[CRITICAL][tanys/${report.env}] Availability check failed: ${report.reason} (${report.checkedAt})`,
  }
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    throw new Error(`Alert webhook returned HTTP ${response.status}`)
  }
  return payload
}

async function main() {
  const args = new Set(process.argv.slice(2))
  const simulateFailure = args.has('--simulate-failure')
  const baseUrl = process.env.MONITOR_BASE_URL || `https://${process.env.APP_DOMAIN || 'localhost:3000'}`
  const webhookUrl = process.env.ALERT_WEBHOOK_URL || ''

  const report = await checkServiceHealth({ baseUrl, simulateFailure })
  console.log(JSON.stringify(report))
  if (!report.ok) {
    if (webhookUrl) {
      await dispatchAlert(webhookUrl, report)
      console.log(JSON.stringify({ alertDelivered: true, env: report.env, reason: report.reason }))
    } else {
      console.error('ALERT_WEBHOOK_URL is not configured; alert not delivered.')
    }
    process.exitCode = 1
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
