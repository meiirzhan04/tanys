import type { IncomingMessage, ServerResponse } from 'node:http'
import { viewer } from './auth.js'
import { pool } from './db.js'
import { HttpError, json, readBody, transaction, uuid } from './http.js'

const missing = () => new HttpError(404, 'not_found')

function normalizeTopics(input: unknown): string[] {
  if (!Array.isArray(input)) throw new HttpError(400, 'invalid_topics')
  const seen = new Set<string>()
  const result: string[] = []
  for (const raw of input) {
    if (typeof raw !== 'string') throw new HttpError(400, 'invalid_topics')
    const trimmed = raw.trim()
    if (!trimmed || trimmed.length > 64) continue
    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(trimmed)
  }
  if (!result.length || result.length > 20) throw new HttpError(400, 'invalid_topics')
  return result
}

function validateBoothName(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 160) {
    throw new HttpError(400, 'invalid_name')
  }
  return value.trim()
}

function validateDescription(value: unknown): string {
  if (value === undefined) return ''
  if (typeof value !== 'string' || value.trim().length > 400) {
    throw new HttpError(400, 'invalid_description')
  }
  return value.trim()
}

async function hasProfilesTable(): Promise<boolean> {
  const res = await pool.query(`SELECT to_regclass('public.event_profiles') IS NOT NULL AS exists`)
  return Boolean(res.rows[0]?.exists)
}

export async function organizerRoute(req: IncomingMessage, res: ServerResponse, path: string): Promise<boolean> {
  if (!path.startsWith('/events/')) return false
  const [, , eventId, ...suffix] = path.split('/')
  if (!uuid(eventId)) return false
  const action = suffix.join('/')
  const isBoothItem = suffix[0] === 'booths' && suffix.length === 2 && uuid(suffix[1])
  if (!['members', 'interests', 'booths'].includes(action) && !isBoothItem) return false

  const userId = await viewer(req)
  const membership = await pool.query(
    'SELECT m.role, e.status FROM memberships m JOIN events e ON e.id = m.event_id WHERE m.event_id = $1 AND m.user_id = $2',
    [eventId, userId],
  )
  if (!membership.rowCount) throw missing()
  const { role, status: eventStatus } = membership.rows[0] as { role: string; status: string }

  if (action === 'members' && req.method === 'GET') {
    if (role !== 'organizer') throw new HttpError(403, 'organizer_required')
    const query = new URL(req.url!, 'http://localhost').searchParams
    const limit = Number(query.get('limit') ?? 50)
    const cursor = query.get('cursor')
    if (!Number.isInteger(limit) || limit < 1 || limit > 100 || (cursor !== null && !uuid(cursor))) {
      throw new HttpError(400, 'invalid_page')
    }
    const profilesExist = await hasProfilesTable()
    if (profilesExist) {
      const result = await pool.query(
        `SELECT m.user_id AS "userId", m.role, COALESCE(p.name, u.username) AS name, u.username,
                p.role AS "profileRole", p.goal, p.visible
         FROM memberships m
         LEFT JOIN users u ON u.id = m.user_id
         LEFT JOIN event_profiles p ON p.event_id = m.event_id AND p.user_id = m.user_id AND p.visible
         WHERE m.event_id = $1 AND ($2::uuid IS NULL OR m.user_id > $2)
         ORDER BY m.user_id ASC
         LIMIT $3`,
        [eventId, cursor, limit + 1],
      )
      const items = result.rows.slice(0, limit)
      const nextCursor = result.rows.length > limit ? items[items.length - 1].userId : null
      json(res, 200, { items, nextCursor })
      return true
    }

    const result = await pool.query(
      `SELECT m.user_id AS "userId", m.role, u.username AS name, u.username
       FROM memberships m
       LEFT JOIN users u ON u.id = m.user_id
       WHERE m.event_id = $1 AND ($2::uuid IS NULL OR m.user_id > $2)
       ORDER BY m.user_id ASC
       LIMIT $3`,
      [eventId, cursor, limit + 1],
    )
    const items = result.rows.slice(0, limit)
    const nextCursor = result.rows.length > limit ? items[items.length - 1].userId : null
    json(res, 200, { items, nextCursor })
    return true
  }

  if (action === 'interests' && req.method === 'GET') {
    if (role !== 'organizer') throw new HttpError(403, 'organizer_required')
    const profilesExist = await hasProfilesTable()
    if (!profilesExist) {
      json(res, 200, { topics: [], profileCount: 0 })
      return true
    }

    const result = await pool.query(
      `SELECT interests FROM event_profiles WHERE event_id = $1 AND visible`,
      [eventId],
    )
    const counts = new Map<string, { name: string; count: number }>()
    for (const row of result.rows as Array<{ interests?: string[] }>) {
      const seen = new Set<string>()
      for (const raw of row.interests ?? []) {
        const cleaned = raw.trim().replace(/\s+/g, ' ')
        if (!cleaned) continue
        const key = cleaned.toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        const existing = counts.get(key)
        if (existing) existing.count += 1
        else counts.set(key, { name: cleaned, count: 1 })
      }
    }
    const topics = [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    json(res, 200, { topics, profileCount: result.rowCount ?? 0 })
    return true
  }

  if (action === 'booths' && req.method === 'GET') {
    const query = role === 'organizer'
      ? `SELECT id, name, description, topics, published FROM event_booths WHERE event_id = $1 ORDER BY created_at ASC, id ASC`
      : `SELECT id, name, description, topics, published FROM event_booths WHERE event_id = $1 AND published = true ORDER BY created_at ASC, id ASC`
    const result = await pool.query(query, [eventId])
    json(res, 200, { items: result.rows, nextCursor: null })
    return true
  }

  if (action === 'booths' && req.method === 'POST') {
    if (role !== 'organizer') throw new HttpError(403, 'organizer_required')
    if (eventStatus === 'closed') throw new HttpError(409, 'event_closed')
    const body = await readBody(req)
    const name = validateBoothName(body.name)
    const description = validateDescription(body.description)
    const topics = normalizeTopics(body.topics)
    const published = body.published === undefined ? true : Boolean(body.published)
    const created = await pool.query(
      `INSERT INTO event_booths(event_id, name, description, topics, published)
       VALUES($1, $2, $3, $4, $5)
       RETURNING id, name, description, topics, published`,
      [eventId, name, description, topics, published],
    )
    json(res, 201, created.rows[0])
    return true
  }

  if (isBoothItem && req.method === 'PATCH') {
    if (role !== 'organizer') throw new HttpError(403, 'organizer_required')
    if (eventStatus === 'closed') throw new HttpError(409, 'event_closed')
    const boothId = suffix[1]
    const body = await readBody(req)
    if (Object.keys(body).some(key => !['name', 'description', 'topics', 'published'].includes(key))) {
      throw new HttpError(400, 'unknown_field')
    }

    const updated = await transaction(async client => {
      const existing = await client.query(
        `SELECT id, name, description, topics, published FROM event_booths WHERE id = $1 AND event_id = $2 FOR UPDATE`,
        [boothId, eventId],
      )
      if (!existing.rowCount) throw missing()
      const current = existing.rows[0] as { name: string; description: string; topics: string[]; published: boolean }
      const nextName = body.name !== undefined ? validateBoothName(body.name) : current.name
      const nextDescription = body.description !== undefined ? validateDescription(body.description) : current.description
      const nextTopics = body.topics !== undefined ? normalizeTopics(body.topics) : current.topics
      const nextPublished = body.published !== undefined ? Boolean(body.published) : current.published
      const resRow = await client.query(
        `UPDATE event_booths SET name = $1, description = $2, topics = $3, published = $4
         WHERE id = $5 AND event_id = $6
         RETURNING id, name, description, topics, published`,
        [nextName, nextDescription, nextTopics, nextPublished, boothId, eventId],
      )
      return resRow.rows[0]
    })

    json(res, 200, updated)
    return true
  }

  throw missing()
}
