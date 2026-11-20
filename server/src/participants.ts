import type { IncomingMessage, ServerResponse } from 'node:http'
import { viewer } from './auth.js'
import { pool } from './db.js'
import { normalizeHandleInput } from './handle.js'
import { HttpError, json, uuid } from './http.js'
import { consumeRequest } from './rate-limit.js'

const MIN_QUERY = 2
const DEFAULT_LIMIT = 8
const MAX_LIMIT = 20

/**
 * GET /events/:eventId/participants?q=<handle or name>&limit=<n>
 * Finds visible participants of one event for the signed-in member. Returns public fields only:
 * handle, the event questionnaire name/role/goal and the viewer's introduction state with that person.
 * Never returns the login email, login username or private contact. Exact handle first, then handle
 * prefix, then name matches. Hidden profiles, blocked pairs, restricted users and the viewer are excluded.
 */
export async function participantRoute(req: IncomingMessage, res: ServerResponse, path: string) {
  const match = /^\/events\/([^/]+)\/participants$/.exec(path)
  if (!match || req.method !== 'GET') return false
  const event = match[1]
  if (!uuid(event)) throw new HttpError(404, 'not_found')
  const user = await viewer(req)
  const params = new URL(req.url ?? '', 'http://localhost').searchParams
  const query = normalizeHandleInput(params.get('q'))
  const limit = Number(params.get('limit') ?? DEFAULT_LIMIT)
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) throw new HttpError(400, 'invalid_limit')

  const member = await pool.query('SELECT 1 FROM memberships WHERE event_id=$1 AND user_id=$2', [event, user])
  if (!member.rowCount) throw new HttpError(404, 'not_found')
  const browse = !query && params.get('browse') === '1'
  if ((!browse && query.length < MIN_QUERY) || query.length > 64) {
    json(res, 200, { items: [], query, minLength: MIN_QUERY })
    return true
  }
  await consumeRequest(`participants:${user}`, 120, 60, res)

  const escaped = query.replace(/[\\%_]/g, character => `\\${character}`)
  const result = await pool.query(
    `SELECT p.user_id AS "userId", u.handle, NULLIF(btrim(p.name),'') AS name, p.role, p.goal,
            i.id AS "introductionId", i.status AS "introductionStatus",
            CASE WHEN i.id IS NULL THEN NULL WHEN i.sender=$2 THEN 'outgoing' ELSE 'incoming' END AS "introductionDirection",
            CASE WHEN u.handle = $3 THEN 0 WHEN u.handle LIKE $4 ESCAPE '\\' THEN 1 ELSE 2 END AS rank
       FROM event_profiles p
       JOIN users u ON u.id = p.user_id
       LEFT JOIN introductions i ON i.event_id = p.event_id
            AND least(i.sender, i.recipient) = least(p.user_id, $2::uuid)
            AND greatest(i.sender, i.recipient) = greatest(p.user_id, $2::uuid)
      WHERE p.event_id = $1 AND p.visible AND p.user_id <> $2
        AND ($3 = '' OR u.handle LIKE $4 ESCAPE '\\' OR lower(p.name) LIKE $5 ESCAPE '\\')
        AND NOT EXISTS (SELECT 1 FROM event_blocks b WHERE b.event_id = p.event_id
              AND (b.blocker_id, b.blocked_id) IN ((p.user_id, $2::uuid), ($2::uuid, p.user_id)))
        AND NOT EXISTS (SELECT 1 FROM event_restrictions r WHERE r.event_id = p.event_id AND r.user_id IN (p.user_id, $2::uuid))
      ORDER BY rank, u.handle NULLS LAST, p.user_id
      LIMIT $6`,
    [event, user, query, `${escaped}%`, `%${escaped}%`, limit],
  )
  const items = result.rows.map(({ rank: _rank, introductionId, introductionStatus, introductionDirection, ...row }) => ({
    ...row,
    introduction: introductionId ? { id: introductionId, status: introductionStatus, direction: introductionDirection } : null,
  }))
  json(res, 200, { items, query, minLength: MIN_QUERY })
  return true
}
