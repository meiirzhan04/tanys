import { createHash } from 'node:crypto'
import type { ServerResponse } from 'node:http'
import { pool } from './db.js'
import { HttpError } from './http.js'

/**
 * Fixed-window counter stored in Postgres so every API instance shares it.
 * Keys are per account (never per IP), so a whole venue behind one Wi-Fi is not throttled together.
 */
export async function consumeRequest(key: string, limit: number, windowSeconds: number, res: ServerResponse) {
  const digest = createHash('sha256').update(key).digest('hex')
  const result = await pool.query(`
    INSERT INTO request_buckets AS bucket (bucket_key, hits, expires_at)
    VALUES ($1, 1, now() + make_interval(secs => $3))
    ON CONFLICT (bucket_key) DO UPDATE SET
      hits = CASE WHEN bucket.expires_at <= now() THEN 1 ELSE bucket.hits + 1 END,
      expires_at = CASE WHEN bucket.expires_at <= now() THEN EXCLUDED.expires_at ELSE bucket.expires_at END
    WHERE bucket.expires_at <= now() OR bucket.hits < $2
    RETURNING bucket_key`, [digest, limit, windowSeconds])
  if (!result.rowCount) {
    res.setHeader('Retry-After', String(windowSeconds))
    throw new HttpError(429, 'try_later')
  }
}
