import type { IncomingMessage, ServerResponse } from 'node:http'
import { viewer } from './auth.js'
import { pool } from './db.js'
import { HttpError, json, readBody, transaction, uuid } from './http.js'

const VALID_REASONS = new Set(['spam', 'harassment', 'fake_profile', 'other'])
const VALID_ACTIONS = new Set(['dismiss', 'warn', 'restrict'])
const missing = () => new HttpError(404, 'not_found')

/**
 * Checks whether two users are prevented from matching, introducing, or meeting
 * inside an event due to a block in either direction or an active moderator restriction.
 */
export async function isInteractionBlocked(eventId: string, userA: string, userB: string): Promise<boolean> {
  const result = await pool.query(
    `SELECT 1 FROM event_blocks
      WHERE event_id = $1 AND ((blocker_id = $2 AND blocked_id = $3) OR (blocker_id = $3 AND blocked_id = $2))
     UNION ALL
     SELECT 1 FROM event_restrictions
      WHERE event_id = $1 AND user_id IN ($2, $3)
     LIMIT 1`,
    [eventId, userA, userB],
  )
  return (result.rowCount ?? 0) > 0
}

export async function isUserRestricted(eventId: string, userId: string): Promise<boolean> {
  const result = await pool.query(
    `SELECT 1 FROM event_restrictions WHERE event_id = $1 AND user_id = $2 LIMIT 1`,
    [eventId, userId],
  )
  return (result.rowCount ?? 0) > 0
}

export async function moderationRoute(req: IncomingMessage, res: ServerResponse, path: string): Promise<boolean> {
  if (!path.startsWith('/events/')) return false
  const [, , eventId, ...suffix] = path.split('/')
  if (!uuid(eventId)) return false

  const isBlockPath = suffix[0] === 'blocks' && suffix.length === 2 && uuid(suffix[1])
  const isReportsCollection = suffix[0] === 'reports' && suffix.length === 1
  const isReportItem = suffix[0] === 'reports' && suffix.length === 2 && uuid(suffix[1])
  if (!isBlockPath && !isReportsCollection && !isReportItem) return false

  const userId = await viewer(req)
  const membership = await pool.query(
    `SELECT role FROM memberships WHERE event_id = $1 AND user_id = $2`,
    [eventId, userId],
  )
  if (!membership.rowCount) throw missing()
  const { role } = membership.rows[0] as { role: string }

  // PUT /events/:eventId/blocks/:targetUserId
  if (isBlockPath && req.method === 'PUT') {
    const targetId = suffix[1]
    if (targetId === userId) throw new HttpError(400, 'cannot_block_self')
    const targetMember = await pool.query(
      `SELECT 1 FROM memberships WHERE event_id = $1 AND user_id = $2`,
      [eventId, targetId],
    )
    if (!targetMember.rowCount) throw missing()

    await pool.query(
      `INSERT INTO event_blocks(event_id, blocker_id, blocked_id)
       VALUES($1, $2, $3)
       ON CONFLICT (event_id, blocker_id, blocked_id) DO NOTHING`,
      [eventId, userId, targetId],
    )
    json(res, 204)
    return true
  }

  // POST /events/:eventId/reports
  if (isReportsCollection && req.method === 'POST') {
    const body = await readBody(req)
    const subjectId = typeof body.subjectId === 'string' ? body.subjectId : ''
    const reason = typeof body.reason === 'string' ? body.reason : ''
    const details = typeof body.details === 'string' ? body.details.trim() : ''

    if (!uuid(subjectId) || subjectId === userId) throw new HttpError(400, 'invalid_subject')
    if (!VALID_REASONS.has(reason)) throw new HttpError(400, 'invalid_reason')
    if (details.length > 500) throw new HttpError(400, 'invalid_details')

    const subjectMember = await pool.query(
      `SELECT 1 FROM memberships WHERE event_id = $1 AND user_id = $2`,
      [eventId, subjectId],
    )
    if (!subjectMember.rowCount) throw missing()

    const created = await pool.query(
      `INSERT INTO event_reports(event_id, reporter_id, subject_id, reason, details)
       VALUES($1, $2, $3, $4, $5)
       RETURNING id, status`,
      [eventId, userId, subjectId, reason, details],
    )
    json(res, 201, created.rows[0])
    return true
  }

  // GET /events/:eventId/reports (organizer-only closed queue)
  if (isReportsCollection && req.method === 'GET') {
    if (role !== 'organizer') throw new HttpError(403, 'organizer_required')
    const result = await pool.query(
      `SELECT id, subject_id AS "subjectId", reason, details, status, action,
              resolved_by AS "resolvedBy", resolved_at AS "resolvedAt", created_at AS "createdAt"
       FROM event_reports
       WHERE event_id = $1
       ORDER BY (status = 'open') DESC, created_at DESC`,
      [eventId],
    )
    json(res, 200, { items: result.rows, nextCursor: null })
    return true
  }

  // PATCH /events/:eventId/reports/:reportId (organizer-only moderation decision + audit log)
  if (isReportItem && req.method === 'PATCH') {
    if (role !== 'organizer') throw new HttpError(403, 'organizer_required')
    const reportId = suffix[1]
    const body = await readBody(req)
    if (body.status !== 'resolved') throw new HttpError(400, 'invalid_status')
    if (typeof body.action !== 'string' || !VALID_ACTIONS.has(body.action)) {
      throw new HttpError(400, 'invalid_action')
    }
    const action = body.action

    const updated = await transaction(async client => {
      const existing = await client.query(
        `SELECT id, subject_id, reason FROM event_reports WHERE id = $1 AND event_id = $2 FOR UPDATE`,
        [reportId, eventId],
      )
      if (!existing.rowCount) throw missing()
      const row = existing.rows[0] as { id: string; subject_id: string; reason: string }

      const resRow = await client.query(
        `UPDATE event_reports
         SET status = 'resolved', action = $1, resolved_by = $2, resolved_at = now()
         WHERE id = $3 AND event_id = $4
         RETURNING id, subject_id AS "subjectId", reason, details, status, action,
                   resolved_by AS "resolvedBy", resolved_at AS "resolvedAt", created_at AS "createdAt"`,
        [action, userId, reportId, eventId],
      )

      await client.query(
        `INSERT INTO moderation_actions(event_id, report_id, moderator_id, subject_id, action)
         VALUES($1, $2, $3, $4, $5)`,
        [eventId, reportId, userId, row.subject_id, action],
      )

      if (action === 'restrict') {
        await client.query(
          `INSERT INTO event_restrictions(event_id, user_id, reason, restricted_by)
           VALUES($1, $2, $3, $4)
           ON CONFLICT (event_id, user_id) DO UPDATE SET reason = excluded.reason, restricted_by = excluded.restricted_by`,
          [eventId, row.subject_id, row.reason, userId],
        )
      }

      return resRow.rows[0]
    })

    json(res, 200, updated)
    return true
  }

  throw missing()
}
