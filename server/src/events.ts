import { createHash, randomBytes } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { pool } from './db.js'
import { canCreateEvents, viewer } from './auth.js'
import { HttpError, json, readBody, transaction, uuid } from './http.js'
import { isQuarterHour } from './time-step.js'

const columns = 'e.id,e.name,e.time_zone AS "timeZone",e.starts_at AS "startsAt",e.ends_at AS "endsAt",e.status'
const digest = (token: string) => createHash('sha256').update(token).digest('hex')
const missing = () => new HttpError(404, 'not_found')

function timestamp(value: unknown): Date {
  if (value instanceof Date) return value
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value))) {
    throw new HttpError(400, 'invalid_time')
  }
  return new Date(value)
}

function fields(input: Record<string,unknown>, saved?: Record<string,unknown>) {
  if (typeof input.name !== 'string' || !input.name.trim() || input.name.trim().length > 160) throw new HttpError(400, 'invalid_name')
  if (typeof input.timeZone !== 'string') throw new HttpError(400, 'invalid_timezone')
  try { new Intl.DateTimeFormat('en', { timeZone: input.timeZone }) }
  catch { throw new HttpError(400, 'invalid_timezone') }
  const start = timestamp(input.startsAt)
  const end = timestamp(input.endsAt)
  if (end <= start) throw new HttpError(400, 'invalid_interval')
  // New times must sit on the 15-minute grid; unchanged legacy times are kept as stored, never rounded.
  const unchanged = (value: Date, previous: unknown) => previous instanceof Date && +previous === +value
  if ((!unchanged(start, saved?.startsAt) && !isQuarterHour(start)) || (!unchanged(end, saved?.endsAt) && !isQuarterHour(end))) {
    throw new HttpError(400, 'invalid_time_step')
  }
  return [input.name.trim(),input.timeZone,start,end]
}

async function collection(req: IncomingMessage, res: ServerResponse, user: string) {
  if (req.method === 'POST') {
    const body = await readBody(req)
    const event = await transaction(async client => {
      if (!await canCreateEvents(user, client)) throw new HttpError(403, 'organizer_required')
      const args = fields(body)
      const result = await client.query(`INSERT INTO events AS e(name,time_zone,starts_at,ends_at)
        VALUES($1,$2,$3,$4) RETURNING ${columns}`, args)
      await client.query("INSERT INTO memberships VALUES($1,$2,'organizer')", [result.rows[0].id,user])
      return result.rows[0]
    })
    return json(res,201,event)
  }
  if (req.method !== 'GET') throw missing()
  const query = new URL(req.url!, 'http://localhost').searchParams
  const limit = Number(query.get('limit') ?? 30)
  const cursor = query.get('cursor')
  if (!Number.isInteger(limit) || limit < 1 || limit > 100 || (cursor !== null && !uuid(cursor))) throw new HttpError(400,'invalid_page')
  const result = await pool.query(`SELECT ${columns},m.role FROM memberships m JOIN events e ON m.event_id=e.id
    WHERE m.user_id=$1 AND ($2::uuid IS NULL OR e.id>$2) ORDER BY e.id LIMIT $3`, [user,cursor,limit+1])
  return json(res,200,{ items:result.rows.slice(0,limit),nextCursor:result.rows.length>limit?result.rows[limit-1].id:null })
}

export async function eventRoute(req: IncomingMessage, res: ServerResponse, path: string) {
  if (path !== '/events' && !path.startsWith('/events/')) return false
  const user = await viewer(req)
  if (path === '/events') {
    await collection(req,res,user)
    return true
  }
  const [, ,event,...suffix] = path.split('/')
  if (!uuid(event)) throw missing()
  const action = suffix.join('/')
  // Later feature modules own all other event subresources.
  if (!['','members/me','invites'].includes(action) && !/^invites\/[^/]+$/.test(action)) return false
  const body = ['POST','PATCH','PUT'].includes(req.method || '') ? await readBody(req) : {}
  const result = await transaction(async client => {
    const existing = await client.query(`SELECT ${columns} FROM events e WHERE id=$1 FOR UPDATE`, [event])
    if (!existing.rowCount) throw missing()
    const row = existing.rows[0]
    const membership = await client.query('SELECT role FROM memberships WHERE event_id=$1 AND user_id=$2', [event,user])
    const role = membership.rows[0]?.role
    if (action === 'members/me' && req.method === 'PUT') {
      if (role) return { status:200, data:{ role } }
      if (typeof body.token !== 'string' || body.token.length !== 64) throw missing()
      const invite = await client.query('SELECT 1 FROM event_invites WHERE event_id=$1 AND digest=$2 AND NOT revoked AND expires_at>now()', [event,digest(body.token)])
      if (!invite.rowCount) throw missing()
      if (row.status === 'closed') throw new HttpError(409,'event_closed')
      await client.query("INSERT INTO memberships VALUES($1,$2,'participant')", [event,user])
      return { status:200,data:{ role:'participant' } }
    }
    if (!role) throw missing()
    if (!action && req.method === 'GET') return { status:200,data:{ ...row,role } }
    if (action === 'members/me' && req.method === 'DELETE') {
      if (role === 'organizer') throw new HttpError(409,'organizer_owns_event')
      await client.query('DELETE FROM memberships WHERE event_id=$1 AND user_id=$2', [event,user])
      return { status:204 }
    }
    if (role !== 'organizer' || !await canCreateEvents(user, client)) throw new HttpError(403,'organizer_required')
    if (!action && req.method === 'PATCH') {
      if (row.status === 'closed') {
        if (Object.keys(body).length === 1 && body.status === 'closed') return { status:200,data:row }
        throw new HttpError(409,'event_closed')
      }
      if (body.status !== undefined && !['active','closed'].includes(String(body.status))) throw new HttpError(400,'invalid_status')
      if (Object.keys(body).some(key=>!['name','timeZone','startsAt','endsAt','status'].includes(key))) throw new HttpError(400,'unknown_field')
      const [name,timeZone,start,end] = fields({ ...row,...body }, row)
      // Times that were not sent keep their stored value exactly (no re-serialisation of legacy timestamps).
      const updated = await client.query(`UPDATE events AS e SET name=$1,time_zone=$2,starts_at=COALESCE($3,e.starts_at),
        ends_at=COALESCE($4,e.ends_at),status=$5,
        closed_at=CASE WHEN $5='closed' AND e.closed_at IS NULL THEN now() ELSE e.closed_at END
        WHERE id=$6 RETURNING ${columns}`, [name,timeZone,body.startsAt === undefined ? null : start,
        body.endsAt === undefined ? null : end,body.status ?? row.status,event])
      return { status:200,data:updated.rows[0] }
    }
    if (action === 'invites' && req.method === 'POST') {
      if (row.status === 'closed') throw new HttpError(409,'event_closed')
      const expires = timestamp(body.expiresAt)
      if (expires <= new Date() || expires > row.endsAt) throw new HttpError(400,'invalid_expiry')
      const token = randomBytes(32).toString('hex')
      const created = await client.query('INSERT INTO event_invites(event_id,digest,expires_at) VALUES($1,$2,$3) RETURNING id', [event,digest(token),expires])
      return { status:201,data:{ id:created.rows[0].id,token } }
    }
    if (suffix[0] === 'invites' && uuid(suffix[1]) && req.method === 'DELETE') {
      const removed = await client.query('UPDATE event_invites SET revoked=true WHERE id=$1 AND event_id=$2', [suffix[1],event])
      if (!removed.rowCount) throw missing()
      return { status:204 }
    }
    throw missing()
  })
  json(res,result.status,result.data)
  return true
}
