import type { IncomingMessage, ServerResponse } from 'node:http'
import { viewer } from './auth.js'
import { HttpError, json, readBody, transaction, uuid } from './http.js'
import { pool } from './db.js'

export const allowedPair = `NOT EXISTS (SELECT 1 FROM event_blocks b WHERE b.event_id=i.event_id AND
    (b.blocker_id,b.blocked_id) IN ((i.sender,i.recipient),(i.recipient,i.sender)))
  AND NOT EXISTS (SELECT 1 FROM event_restrictions r WHERE r.event_id=i.event_id AND r.user_id IN (i.sender,i.recipient))`
const selection = `SELECT i.id,i.status,i.created_at AS "createdAt",i.updated_at AS "updatedAt",
  CASE WHEN i.sender=$2 THEN 'outgoing' ELSE 'incoming' END AS direction,
  p.user_id AS "participantId",COALESCE(NULLIF(btrim(p.name),''),u.username) AS "participantName",p.role AS "participantRole",
  CASE WHEN i.status='accepted' THEN c.value END AS contact
  FROM introductions i JOIN event_profiles p ON p.event_id=i.event_id AND p.visible
    AND p.user_id=CASE WHEN i.sender=$2 THEN i.recipient ELSE i.sender END
  LEFT JOIN users u ON u.id=p.user_id
  LEFT JOIN user_contacts c ON c.user_id=p.user_id
  WHERE i.event_id=$1 AND $2 IN (i.recipient,i.sender) AND ${allowedPair}`

export async function introductionRoute(req: IncomingMessage,res: ServerResponse,path: string) {
  if (path === '/me/contact' && req.method === 'PUT') {
    const user = await viewer(req)
    const {value} = await readBody(req)
    if (typeof value !== 'string' || value.trim().length>256) throw new HttpError(400,'invalid_contact')
    if (!value.trim()) await pool.query('DELETE FROM user_contacts WHERE user_id=$1',[user])
    else await pool.query('INSERT INTO user_contacts VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET value=excluded.value',[user,value.trim()])
    json(res,204)
    return true
  }
  const parts = /^\/events\/([^/]+)\/introductions(?:\/([^/]+))?$/.exec(path)
  if (!parts || !uuid(parts[1]) || (parts[2] && !uuid(parts[2]))) return false
  const [,event,id] = parts
  const user = await viewer(req)
  const body = req.method === 'GET' ? null : await readBody(req)
  const result = await transaction(async client => {
    const member = await client.query('SELECT e.status FROM events e JOIN memberships m ON e.id=m.event_id WHERE e.id=$1 AND m.user_id=$2 FOR SHARE OF e,m',[event,user])
    if (!member.rowCount) throw new HttpError(404,'not_found')
    let target = id
    let status = 200
    if (body) {
      if (member.rows[0].status !== 'active') throw new HttpError(409,'event_closed')
      if (!id && req.method === 'POST') {
        const peer = body.recipientId
        if (!uuid(peer) || peer === user) throw new HttpError(400,'invalid_recipient')
        const found = await client.query(`SELECT 1 FROM event_profiles mine JOIN event_profiles other ON mine.event_id=other.event_id
          CROSS JOIN (SELECT $1::uuid AS event_id,$2::uuid AS sender,$3::uuid AS recipient) i
          WHERE mine.event_id=$1 AND mine.user_id=$2 AND other.user_id=$3 AND mine.visible AND other.visible AND ${allowedPair}`,[event,user,peer])
        if (!found.rowCount) throw new HttpError(404,'not_found')
        const created = await client.query(`INSERT INTO introductions(event_id,sender,recipient) VALUES($1,$2,$3)
          ON CONFLICT DO NOTHING RETURNING id`,[event,user,peer])
        if (created.rowCount) { target=created.rows[0].id; status=201 }
        else {
          const old = await client.query('SELECT id FROM introductions WHERE event_id=$1 AND (sender,recipient) IN (($2,$3),($3,$2))',[event,user,peer])
          target=old.rows[0]?.id
          if (!target) throw new HttpError(409,'pair_changed')
        }
      } else if (id && req.method === 'PATCH') {
        const current = await client.query(`SELECT i.* FROM introductions i WHERE i.event_id=$1 AND i.id=$3 AND $2 IN (i.sender,i.recipient)
          AND ${allowedPair} FOR UPDATE`,[event,user,id])
        const row=current.rows[0]
        if (!row) throw new HttpError(404,'not_found')
        const permitted=row.sender===user ? ['withdrawn'] : ['accepted','declined']
        if (!permitted.includes(String(body.status))) throw new HttpError(403,'forbidden_transition')
        if (body.status !== row.status) {
          if (row.status !== 'pending') throw new HttpError(409,'introduction_final')
          await client.query('UPDATE introductions SET status=$2,updated_at=now() WHERE id=$1',[id,body.status])
        }
      } else throw new HttpError(405,'method_not_allowed')
    }
    const rows=await client.query(selection+(target?' AND i.id=$3':' ORDER BY i.created_at DESC'),target?[event,user,target]:[event,user])
    if (target && !rows.rowCount) throw new HttpError(404,'not_found')
    return {status,data:target?rows.rows[0]:{items:rows.rows,nextCursor:null}}
  })
  json(res,result.status,result.data)
  return true
}
