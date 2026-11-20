import { profileRoute } from './profiles.js'
import { eventRoute } from './events.js'
import { moderationRoute } from './moderation.js'
import { organizerRoute } from './organizer.js'
import { authRoute, appOrigin } from './auth.js'

import { readdir } from 'node:fs/promises'
import { pool } from './db.js'
import { createMetricsTracker, createObservedRequestHandler } from './observability.js'


const metrics = createMetricsTracker()
export const handler = createObservedRequestHandler({
  appOrigin,
  routes: [authRoute, eventRoute, organizerRoute, moderationRoute, profileRoute],
  checkReady: async () => {
    const migrations = (await readdir(new URL('../migrations/', import.meta.url))).filter(name => name.endsWith('.sql'))
    const result = await pool.query('SELECT name FROM schema_migrations WHERE name = ANY($1::text[])', [migrations])
    return result.rowCount === migrations.length
  },
  metrics,
})
