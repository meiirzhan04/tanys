import type { IncomingMessage, ServerResponse } from 'node:http'
import { viewer } from './auth.js'
import { pool } from './db.js'
import { normalizeHandleInput } from './handle.js'
import { HttpError, json, uuid } from './http.js'
import { consumeRequest } from './rate-limit.js'

const MIN_QUERY = 2
const DEFAULT_LIMIT = 8
const MAX_LIMIT = 20
const MAX_SCANNED = 5000

type Row = {
  userId: string
  handle: string | null
  name: string | null
  role: string | null
  goal: string | null
  introductionId: string | null
  introductionStatus: string | null
  introductionDirection: string | null
}

/** Lower-cases in JavaScript so Cyrillic and Kazakh names match regardless of the database locale. */
function fold(value: string): string {
  return value.normalize('NFC').toLowerCase()
}

/** 0 exact handle, 1 handle prefix, 2 a name word starts with the query, 3 name contains it; -1 no match. */
function rank(row: Row, query: string): number {
  const handle = row.handle ?? ''
  if (handle === query) return 0
  if (handle.startsWith(query)) return 1
  const name = fold(row.name ?? '')
  if (!name) return -1
  if (name.split(/[\s\-_.]+/).some(word => word.startsWith(query))) return 2
  return name.includes(query) ? 3 : -1
}

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
  const query = fold(normalizeHandleInput(params.get('q')))
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

  // Eligible people of this event only; matching and ranking happen below in JavaScript.
  const result = await pool.query<Row>(
    `SELECT p.user_id AS "userId", u.handle, NULLIF(btrim(p.name),'') AS name, p.role, p.goal,
            i.id AS "introductionId", i.status AS "introductionStatus",
            CASE WHEN i.id IS NULL THEN NULL WHEN i.sender=$2 THEN 'outgoing' ELSE 'incoming' END AS "introductionDirection"
       FROM event_profiles p
       JOIN users u ON u.id = p.user_id
       LEFT JOIN introductions i ON i.event_id = p.event_id
            AND least(i.sender, i.recipient) = least(p.user_id, $2::uuid)
            AND greatest(i.sender, i.recipient) = greatest(p.user_id, $2::uuid)
      WHERE p.event_id = $1 AND p.visible AND p.user_id <> $2
        AND NOT EXISTS (SELECT 1 FROM event_blocks b WHERE b.event_id = p.event_id
              AND (b.blocker_id, b.blocked_id) IN ((p.user_id, $2::uuid), ($2::uuid, p.user_id)))
        AND NOT EXISTS (SELECT 1 FROM event_restrictions r WHERE r.event_id = p.event_id AND r.user_id IN (p.user_id, $2::uuid))
      LIMIT $3`,
    [event, user, MAX_SCANNED],
  )
  const items = result.rows
    .map(row => ({ row, score: rank(row, query) }))
    .filter(({ score }) => score >= 0)
    .sort((a, b) => a.score - b.score || (a.row.handle ?? '￿').localeCompare(b.row.handle ?? '￿') || a.row.userId.localeCompare(b.row.userId))
    .slice(0, limit)
    .map(({ row: { introductionId, introductionStatus, introductionDirection, ...row } }) => ({
      ...row,
      introduction: introductionId ? { id: introductionId, status: introductionStatus, direction: introductionDirection } : null,
    }))
  json(res, 200, { items, query, minLength: MIN_QUERY })
  return true
}
