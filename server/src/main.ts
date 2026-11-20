import { eventRoute } from './events.js'
import { authRoute, appOrigin } from './auth.js'
import { createServer } from 'node:http'
import { readdir } from 'node:fs/promises'
import { pool } from './db.js'
import { createMetricsTracker, createObservedRequestHandler } from './observability.js'

const migrations = (await readdir(new URL('../migrations/', import.meta.url))).filter(name => name.endsWith('.sql'))
const metrics = createMetricsTracker()
const handler = createObservedRequestHandler({
  appOrigin,
  routes: [authRoute, eventRoute],
  checkReady: async () => {
    const result = await pool.query('SELECT name FROM schema_migrations WHERE name = ANY($1::text[])', [migrations])
    return result.rowCount === migrations.length
  },
  metrics,
})
const server = createServer(handler)
server.listen(Number(process.env.PORT || 3000), '0.0.0.0')
process.on('SIGTERM', () => server.close(() => void pool.end()))
