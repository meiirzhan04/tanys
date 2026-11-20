import type { IncomingMessage, ServerResponse } from 'node:http'
import type pg from 'pg'
import { viewer } from './auth.js'
import { HttpError, json, readBody, transaction, uuid } from './http.js'
import { isQuarterHour } from './time-step.js'
import { allowedPair } from './introductions.js'

const missing = () => new HttpError(404, 'not_found')
const conflict = () => new HttpError(409, 'slot_conflict')
const quarter = 15 * 60 * 1000
type Pair = { id: string; sender: string; recipient: string }
function instant(raw: unknown) {
  if (typeof raw !== 'string' || !/(Z|[+-]\d{2}:\d{2})$/.test(raw) || !Number.isFinite(Date.parse(raw)))
    throw new HttpError(400, 'invalid_slot')
  return new Date(raw)
}

async function common(client: pg.PoolClient, event: string, pair: Pair) {
  const result = await client.query<{ start: Date; end: Date }>(
    `SELECT DISTINCT s.t AS start,s.t+interval '15 minutes' AS end
    FROM availability a JOIN availability b ON b.event_id=a.event_id
    JOIN events e ON e.id=a.event_id
    CROSS JOIN LATERAL generate_series(
      to_timestamp(ceil(extract(epoch from greatest(a.starts_at,b.starts_at,e.starts_at,now()))/900)*900),
      least(a.ends_at,b.ends_at,e.ends_at)-interval '15 minutes',interval '15 minutes') s(t)
    WHERE a.event_id=$1 AND a.user_id=$2 AND b.user_id=$3
      AND NOT EXISTS (SELECT 1 FROM meetings m JOIN introductions i ON i.id=m.introduction_id
        WHERE m.status='confirmed' AND ${allowedPair} AND (i.sender IN ($2,$3) OR i.recipient IN ($2,$3))
        AND m.starts_at<s.t+interval '15 minutes' AND m.ends_at>s.t)
    ORDER BY start`,
    [event, pair.sender, pair.recipient],
  )
  return result.rows.map((slot) => ({ id: slot.start.toISOString(), start: slot.start, end: slot.end }))
}

const meetingList = `SELECT m.id,i.id AS "introductionId",m.starts_at AS start,m.ends_at AS end,m.status,
  CASE WHEN m.proposer=$2 THEN 'outgoing' ELSE 'incoming' END AS direction,
  COALESCE(NULLIF(btrim(p.name),''),u.handle) AS "participantName",p.role AS "participantRole",u.handle AS "participantHandle"
  FROM meetings m JOIN introductions i ON i.id=m.introduction_id
  LEFT JOIN event_profiles p ON p.event_id=i.event_id AND p.visible AND p.user_id=CASE WHEN i.sender=$2 THEN i.recipient ELSE i.sender END
  LEFT JOIN users u ON u.id=CASE WHEN i.sender=$2 THEN i.recipient ELSE i.sender END
  WHERE i.event_id=$1 AND $2 IN(i.sender,i.recipient) AND ${allowedPair}`

export async function meetingRoute(req: IncomingMessage, res: ServerResponse, path: string) {
  const match =
    /^\/events\/([^/]+)\/(availability\/me|meetings(?:\/([^/]+))?|introductions\/([^/]+)\/slots)$/.exec(path)
  if (!match || !uuid(match[1])) return false
  const [, event, action, meetingId, introId] = match
  if ((meetingId && !uuid(meetingId)) || (introId && !uuid(introId))) throw missing()
  const user = await viewer(req)
  const method = req.method
  const body = method === 'GET' ? {} : await readBody(req)
  const result = await transaction(async (client) => {
    const member = await client.query(
      `SELECT e.status,e.starts_at,e.ends_at FROM memberships m JOIN events e ON m.event_id=e.id
      WHERE m.event_id=$1 AND m.user_id=$2 FOR SHARE OF e,m`,
      [event, user],
    )
    if (!member.rowCount) throw missing()
    const eventRow = member.rows[0]
    if (method !== 'GET' && eventRow.status !== 'active') throw new HttpError(409, 'event_closed')
    if (action === 'availability/me') {
      if (method === 'GET') {
        const slots = await client.query(
          'SELECT starts_at AS start,ends_at AS end FROM availability WHERE event_id=$1 AND user_id=$2 ORDER BY starts_at',
          [event, user],
        )
        return { status: 200, data: { slots: slots.rows } }
      }
      if (method !== 'PUT') throw missing()
      if (!Array.isArray(body.slots) || body.slots.length > 32) throw new HttpError(400, 'invalid_slots')
      await client.query('SELECT id FROM users WHERE id=$1 FOR NO KEY UPDATE', [user])
      const stored = await client.query('SELECT starts_at,ends_at FROM availability WHERE event_id=$1 AND user_id=$2', [event, user])
      const kept = new Set(stored.rows.map(row => `${+new Date(row.starts_at)}-${+new Date(row.ends_at)}`))
      await client.query('DELETE FROM availability WHERE event_id=$1 AND user_id=$2', [event, user])
      let last = 0
      const slots = body.slots
        .map((raw) => ({ start: instant(raw?.start), end: instant(raw?.end) }))
        .sort((a, b) => +a.start - +b.start)
      for (const { start, end } of slots) {
        if (
          +start < last ||
          +end - +start < quarter ||
          +end - +start > 86400000 ||
          start < eventRow.starts_at ||
          end > eventRow.ends_at
        )
          throw new HttpError(400, 'invalid_slot')
        // Previously saved off-grid slots may stay; any new or edited slot must use 15-minute steps.
        if (!kept.has(`${+start}-${+end}`) && (!isQuarterHour(start) || !isQuarterHour(end))) {
          throw new HttpError(400, 'invalid_time_step')
        }
        await client.query('INSERT INTO availability VALUES($1,$2,$3,$4)', [event, user, start, end])
        last = +end
      }
      return { status: 204 }
    }
    if (method === 'GET' && action === 'meetings') {
      const rows = await client.query(meetingList + ' ORDER BY m.starts_at,m.id', [event, user])
      return { status: 200, data: { items: rows.rows, nextCursor: null } }
    }
    let id = meetingId
    let status = 200
    const creating = action === 'meetings' && method === 'POST'
    const changing = !!id && method === 'PATCH'
    if (!creating && !changing && !(introId && method === 'GET')) throw missing()
    const introduction = introId || body.introductionId
    if (!changing && !uuid(introduction)) throw new HttpError(400, 'invalid_introduction')
    const predicate = changing ? 'i.id=(SELECT introduction_id FROM meetings WHERE id=$3)' : 'i.id=$3'
    const pairResult = await client.query<Pair>(
      `SELECT i.id,i.sender,i.recipient FROM introductions i
      WHERE i.event_id=$1 AND $2 IN (i.sender,i.recipient) AND i.status='accepted' AND ${predicate} AND ${allowedPair}`,
      [event, user, changing ? id : introduction],
    )
    const pair = pairResult.rows[0]
    if (!pair) throw missing()
    if (introId) return { status: 200, data: { items: await common(client, event, pair) } }
    // All events acquire both participant locks in the same order before testing or changing bookings.
    await client.query('SELECT id FROM users WHERE id IN ($1,$2) ORDER BY id FOR NO KEY UPDATE', [
      pair.sender,
      pair.recipient,
    ])
    if (creating) {
      const start = instant(body.slotId)
      if (!isQuarterHour(start)) throw new HttpError(400, 'invalid_time_step')
      const existing = await client.query(
        "SELECT id FROM meetings WHERE introduction_id=$1 AND starts_at=$2 AND status IN ('confirmed','pending')",
        [pair.id, start],
      )
      id = existing.rows[0]?.id
      if (!id) {
        const slot = (await common(client, event, pair)).find((item) => item.id === start.toISOString())
        if (!slot) throw conflict()
        const inserted = await client.query(
          'INSERT INTO meetings(introduction_id,proposer,starts_at,ends_at) VALUES($1,$2,$3,$4) RETURNING id',
          [pair.id, user, slot.start, slot.end],
        )
        id = inserted.rows[0].id
        status = 201
      }
    } else {
      const row = (await client.query('SELECT * FROM meetings WHERE id=$1 FOR UPDATE', [id])).rows[0]
      const next = body.status
      if (!['confirmed', 'declined', 'cancelled'].includes(String(next)))
        throw new HttpError(400, 'invalid_status')
      if (next !== 'cancelled' && row.proposer === user) throw new HttpError(403, 'recipient_required')
      if (next !== row.status) {
        if (row.status !== 'pending' && !(row.status === 'confirmed' && next === 'cancelled'))
          throw new HttpError(409, 'meeting_final')
        if (
          next === 'confirmed' &&
          !(await common(client, event, pair)).some((slot) => +slot.start === +row.starts_at)
        )
          throw conflict()
        await client.query('UPDATE meetings SET status=$2 WHERE id=$1', [id, next])
      }
    }
    const updated = await client.query(meetingList + ' AND m.id=$3', [event, user, id])
    if (!updated.rowCount) throw missing()
    return { status, data: updated.rows[0] }
  })
  json(res, result.status, result.data)
  return true
}
