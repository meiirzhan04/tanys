import type { IncomingMessage, ServerResponse } from 'node:http'
import { viewer } from './auth.js'
import { pool } from './db.js'
import { HttpError, json, readBody, uuid } from './http.js'

async function requireAdmin(req: IncomingMessage): Promise<string> {
  const userId = await viewer(req)
  const access = await pool.query<{ can_create_events: boolean; has_any_organizer: boolean }>(
    `SELECT u.can_create_events,
            EXISTS(SELECT 1 FROM users WHERE can_create_events) AS has_any_organizer
     FROM users u
     WHERE u.id = $1`,
    [userId],
  )
  if (!access.rowCount) throw new HttpError(401, 'session_required')
  const row = access.rows[0]
  if (!row.can_create_events && row.has_any_organizer) {
    throw new HttpError(403, 'organizer_required')
  }
  return userId
}

export async function adminRoute(req: IncomingMessage, res: ServerResponse, path: string): Promise<boolean> {
  if (path === '/admin/overview' && req.method === 'GET') {
    await requireAdmin(req)
    const [users, events, participants, introductions, meetings, reports] = await Promise.all([
      pool.query<{
        id: string
        username: string | null
        canCreateEvents: boolean
        createdAt: Date
        eventsCount: number
        profilesCount: number
      }>(
        `SELECT u.id, u.username, u.can_create_events AS "canCreateEvents", u.created_at AS "createdAt",
                (SELECT count(*)::int FROM memberships m WHERE m.user_id = u.id) AS "eventsCount",
                (SELECT count(*)::int FROM event_profiles p WHERE p.user_id = u.id) AS "profilesCount"
         FROM users u
         ORDER BY u.created_at DESC`,
      ),
      pool.query<{
        id: string
        name: string
        timeZone: string
        startsAt: Date
        endsAt: Date
        status: string
        memberCount: number
        profileCount: number
      }>(
        `SELECT e.id, e.name, e.time_zone AS "timeZone", e.starts_at AS "startsAt", e.ends_at AS "endsAt", e.status,
                (SELECT count(*)::int FROM memberships m WHERE m.event_id = e.id) AS "memberCount",
                (SELECT count(*)::int FROM event_profiles p WHERE p.event_id = e.id) AS "profileCount"
         FROM events e
         ORDER BY e.starts_at DESC`,
      ),
      pool.query(
        `SELECT p.event_id AS "eventId", e.name AS "eventName", p.user_id AS "userId", u.username,
                p.name, p.role, p.goal, p.skills, p.interests, p.experience_years AS "experienceYears", p.visible
         FROM event_profiles p
         JOIN events e ON e.id = p.event_id
         LEFT JOIN users u ON u.id = p.user_id
         ORDER BY e.starts_at DESC, p.name ASC`,
      ),
      pool.query(
        `SELECT i.id, i.event_id AS "eventId", e.name AS "eventName", i.status, i.created_at AS "createdAt",
                COALESCE(ps.name, us.username, i.sender::text) AS "senderName",
                COALESCE(pr.name, ur.username, i.recipient::text) AS "recipientName"
         FROM introductions i
         JOIN events e ON e.id = i.event_id
         LEFT JOIN users us ON us.id = i.sender
         LEFT JOIN users ur ON ur.id = i.recipient
         LEFT JOIN event_profiles ps ON ps.event_id = i.event_id AND ps.user_id = i.sender
         LEFT JOIN event_profiles pr ON pr.event_id = i.event_id AND pr.user_id = i.recipient
         ORDER BY i.created_at DESC`,
      ),
      pool.query(
        `SELECT m.id, i.event_id AS "eventId", e.name AS "eventName",
                m.starts_at AS "startsAt", m.ends_at AS "endsAt", m.status,
                COALESCE(pp.name, up.username, m.proposer::text) AS "proposerName",
                COALESCE(po.name, uo.username) AS "peerName"
         FROM meetings m
         JOIN introductions i ON i.id = m.introduction_id
         JOIN events e ON e.id = i.event_id
         LEFT JOIN users up ON up.id = m.proposer
         LEFT JOIN event_profiles pp ON pp.event_id = i.event_id AND pp.user_id = m.proposer
         LEFT JOIN users uo ON uo.id = CASE WHEN i.sender = m.proposer THEN i.recipient ELSE i.sender END
         LEFT JOIN event_profiles po ON po.event_id = i.event_id AND po.user_id = uo.id
         ORDER BY m.starts_at DESC`,
      ),
      pool.query(
        `SELECT r.id, r.event_id AS "eventId", e.name AS "eventName",
                r.reason, r.details, r.status, r.action, r.created_at AS "createdAt",
                COALESCE(pr.name, ur.username, r.reporter_id::text) AS "reporterName",
                COALESCE(ps.name, us.username, r.subject_id::text) AS "subjectName"
         FROM event_reports r
         JOIN events e ON e.id = r.event_id
         LEFT JOIN users ur ON ur.id = r.reporter_id
         LEFT JOIN users us ON us.id = r.subject_id
         LEFT JOIN event_profiles pr ON pr.event_id = r.event_id AND pr.user_id = r.reporter_id
         LEFT JOIN event_profiles ps ON ps.event_id = r.event_id AND ps.user_id = r.subject_id
         ORDER BY r.created_at DESC`,
      ),
    ])

    json(res, 200, {
      stats: {
        usersCount: users.rows.length,
        organizersCount: users.rows.filter(item => item.canCreateEvents).length,
        eventsCount: events.rows.length,
        profilesCount: participants.rows.length,
        introductionsCount: introductions.rows.length,
        meetingsCount: meetings.rows.length,
        reportsCount: reports.rows.length,
      },
      users: users.rows,
      events: events.rows,
      participants: participants.rows,
      introductions: introductions.rows,
      meetings: meetings.rows,
      reports: reports.rows,
    })
    return true
  }

  const userMatch = /^\/admin\/users\/([^/]+)$/.exec(path)
  if (userMatch && req.method === 'PATCH') {
    await requireAdmin(req)
    const targetUserId = userMatch[1]
    if (!uuid(targetUserId)) throw new HttpError(404, 'not_found')
    const body = await readBody(req)
    if (typeof body.canCreateEvents !== 'boolean') {
      throw new HttpError(400, 'invalid_role')
    }
    const updated = await pool.query(
      `UPDATE users
       SET can_create_events = $1
       WHERE id = $2
       RETURNING id, username, can_create_events AS "canCreateEvents"`,
      [body.canCreateEvents, targetUserId],
    )
    if (!updated.rowCount) throw new HttpError(404, 'not_found')
    json(res, 200, updated.rows[0])
    return true
  }

  return false
}
