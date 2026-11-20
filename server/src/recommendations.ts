import type { IncomingMessage, ServerResponse } from 'node:http'
import { viewer } from './auth.js'
import { HttpError, json, readBody, transaction, uuid } from './http.js'
import { recommend } from './matching/recommend.js'
import type { Candidate } from './matching/types.js'

const fields = 'p.user_id AS id,p.name,p.role,p.skills,p.experience_years AS "experienceYears",p.interests,p.about,p.goal,p.looking_for AS "lookingFor"'
const eligible = `FROM event_profiles p WHERE p.event_id=$1 AND p.visible AND p.user_id<>$2
  AND NOT EXISTS(SELECT 1 FROM event_blocks b WHERE b.event_id=p.event_id AND
    ((b.blocker_id=$2 AND b.blocked_id=p.user_id) OR (b.blocked_id=$2 AND b.blocker_id=p.user_id)))
  AND NOT EXISTS(SELECT 1 FROM event_restrictions r WHERE r.event_id=p.event_id AND r.user_id IN ($2,p.user_id))`

export async function recommendationRoute(req: IncomingMessage,res: ServerResponse,path: string) {
  const match = /^\/events\/([^/]+)\/(recommendations|feedback\/([^/]+))$/.exec(path)
  if (!match || !uuid(match[1])) return false
  const [,event,action,candidate] = match
  const feedback = action !== 'recommendations'
  if (feedback ? req.method !== 'PUT' || !uuid(candidate) : req.method !== 'GET') return false
  const user = await viewer(req)
  const body = feedback ? await readBody(req) : null
  const locale = new URL(req.url!, 'http://localhost').searchParams.get('locale') ?? 'ru'
  if (locale !== 'kk' && locale !== 'en' && locale !== 'ru') throw new HttpError(400,'invalid_locale')
  const result = await transaction(async client => {
    const self = await client.query<Candidate>(`SELECT ${fields} FROM event_profiles p WHERE p.event_id=$1 AND p.user_id=$2`,[event,user])
    if (!self.rowCount) throw new HttpError(404,'profile_required')
    if (body) {
      if (body.response !== 'met' && body.response !== 'not_a_fit') throw new HttpError(400,'invalid_feedback')
      const allowed = await client.query(`SELECT 1 ${eligible} AND p.user_id=$3`,[event,user,candidate])
      if (!allowed.rowCount) throw new HttpError(404,'not_found')
      await client.query(`INSERT INTO event_feedback VALUES($1,$2,$3,$4) ON CONFLICT(event_id,user_id,candidate_id)
        DO UPDATE SET response=excluded.response`,[event,user,candidate,body.response])
      return
    }
    const candidates = await client.query<Candidate>(`SELECT ${fields} ${eligible} AND NOT EXISTS(
      SELECT 1 FROM event_feedback f WHERE f.event_id=p.event_id AND f.user_id=$2 AND f.candidate_id=p.user_id)`,[event,user])
    return { items:recommend(self.rows[0],candidates.rows,locale) }
  })
  json(res,feedback ? 204 : 200,result)
  return true
}
