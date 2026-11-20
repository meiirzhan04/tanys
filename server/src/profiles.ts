import type { IncomingMessage, ServerResponse } from 'node:http'
import { viewer } from './auth.js'
import { HttpError, json, readBody, transaction, uuid } from './http.js'

const columns = 'name,role,skills,experience_years AS "experienceYears",interests,about,goal,looking_for AS "lookingFor",visible,consent_version AS "consentVersion"'
const goals = new Set(['find_job','hire','find_mentor','be_mentor','find_cofounder','exchange_experience'])

function field(value: unknown, limit: number) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > limit) throw new HttpError(400,'invalid_profile')
  return value.trim()
}

function tags(value: unknown, optional = false) {
  if (optional && value === undefined) return []
  if (!Array.isArray(value) || (!optional && !value.length) || value.length > 30) throw new HttpError(400,'invalid_tags')
  return [...new Set(value.map(tag => field(tag,80)))]
}

export async function profileRoute(req: IncomingMessage, res: ServerResponse, path: string) {
  const match = /^\/events\/([^/]+)\/profile$/.exec(path)
  if (!match || !uuid(match[1]) || !['GET','PUT'].includes(req.method || '')) return false
  const event = match[1]
  const user = await viewer(req)
  const body = req.method === 'PUT' ? await readBody(req) : null
  const profile = await transaction(async client => {
    const member = await client.query(`SELECT e.status FROM memberships m JOIN events e ON e.id=m.event_id
      WHERE m.event_id=$1 AND m.user_id=$2 FOR SHARE OF e,m`, [event,user])
    if (!member.rowCount) throw new HttpError(404,'not_found')
    if (!body) {
      const result = await client.query(`SELECT ${columns} FROM event_profiles WHERE event_id=$1 AND user_id=$2`, [event,user])
      if (!result.rowCount) throw new HttpError(404,'not_found')
      return result.rows[0]
    }
    if (member.rows[0].status !== 'active') throw new HttpError(409,'event_closed')
    if (body.consentVersion !== 'v1') throw new HttpError(400,'consent_required')
    const visible = body.visible === undefined ? false : body.visible
    if (typeof visible !== 'boolean' || typeof body.goal !== 'string' || !goals.has(body.goal) ||
        typeof body.experienceYears !== 'number' || !Number.isInteger(body.experienceYears) ||
        body.experienceYears < 0 || body.experienceYears > 60) throw new HttpError(400,'invalid_profile')
    const result = await client.query(`INSERT INTO event_profiles(event_id,user_id,name,role,skills,experience_years,interests,about,goal,looking_for,visible,consent_version)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      ON CONFLICT(event_id,user_id) DO UPDATE SET name=excluded.name,role=excluded.role,skills=excluded.skills,
      experience_years=excluded.experience_years,interests=excluded.interests,about=excluded.about,goal=excluded.goal,
      looking_for=excluded.looking_for,visible=excluded.visible,consent_version=excluded.consent_version
      RETURNING ${columns}`, [event,user,field(body.name,80),field(body.role,80),tags(body.skills),body.experienceYears,
      tags(body.interests),field(body.about,400),body.goal,tags(body.lookingFor,true),visible,body.consentVersion])
    return result.rows[0]
  })
  json(res,200,profile)
  return true
}
