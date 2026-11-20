import { createHash, randomBytes, randomUUID } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { isIP } from 'node:net'
import nodemailer from 'nodemailer'
import { pool } from './db.js'
import { HttpError, json, readBody, transaction, uuid } from './http.js'
import { hashPassword, verifyPassword } from './passwords.js'
import { deleteUserAccount } from './retention.js'

const sha = (value: string) => createHash('sha256').update(value).digest('hex')
export const appOrigin = new URL(process.env.APP_ORIGIN || 'http://localhost:3000').origin
const secure = new URL(appOrigin).protocol === 'https:'
if (process.env.NODE_ENV === 'production' && !secure) throw new Error('HTTPS APP_ORIGIN required')
const cookie = (value: string, age: number) =>
  `tanys_session=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${secure ? '; Secure' : ''}`
const token = (req: IncomingMessage) =>
  req.headers.cookie?.split(';').map(part => part.trim()).find(part => part.startsWith('tanys_session='))?.slice(14)

export async function viewer(req: IncomingMessage): Promise<string> {
  if (!token(req)) throw new HttpError(401, 'session_required')
  const result = await pool.query('SELECT user_id FROM sessions WHERE digest=$1 AND expires_at>now()', [sha(token(req) || '')])
  if (!result.rowCount) throw new HttpError(401, 'session_required')
  return result.rows[0].user_id
}

async function challenge(req: IncomingMessage, res: ServerResponse) {
  const body = await readBody(req)
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const purpose = body.purpose ?? 'login'
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || (purpose !== 'login' && purpose !== 'recover')) {
    throw new HttpError(400, 'invalid_challenge')
  }
  const smtp = process.env.SMTP_URL
  const from = process.env.MAIL_FROM
  if (!smtp || !from) throw new HttpError(503, 'mail_unavailable')
  const id = randomUUID()
  const code = randomBytes(12).toString('hex')
  const source = sha(req.socket.remoteAddress || 'unknown')
  await transaction(async client => {
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', ['source:' + source])
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', ['email:' + email])
    await client.query("DELETE FROM auth_challenges WHERE created_at < now()-interval '1 day'")
    const counts = await client.query(`SELECT count(*) FILTER (WHERE email=$1) AS address,
      count(*) FILTER (WHERE source_hash=$2) AS source FROM auth_challenges
      WHERE created_at>now()-interval '15 minutes' AND (email=$1 OR source_hash=$2)`, [email, source])
    if (+counts.rows[0].address >= 3 || +counts.rows[0].source >= 60) throw new HttpError(429, 'try_later')
    await client.query('INSERT INTO auth_challenges(id,email,source_hash,purpose,digest) VALUES($1,$2,$3,$4,$5)',
      [id,email,source,purpose,sha(id + code)])
  })
  try {
    await nodemailer.createTransport(smtp).sendMail({ from, to: {name: '', address: email},
      subject: 'Tanys — код доступа', text: `Код Tanys: ${code}\nДействует 10 минут.` })
  } catch {
    await pool.query('UPDATE auth_challenges SET used=true WHERE id=$1', [id])
    throw new HttpError(503, 'mail_unavailable')
  }
  json(res, 202, { challengeId: id })
}

async function signIn(req: IncomingMessage, res: ServerResponse) {
  const { challengeId, code } = await readBody(req)
  if (!uuid(challengeId) || typeof code !== 'string' || code.length > 128) throw new HttpError(400, 'invalid_challenge')
  const session = randomBytes(32).toString('hex')
  const user = await transaction(async client => {
    const info = await client.query('SELECT email FROM auth_challenges WHERE id=$1', [challengeId])
    if (!info.rowCount) return null
    const email = info.rows[0].email
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', ['email:' + email])
    const attempt = await client.query(`UPDATE auth_challenges SET attempts=attempts+1, used=(digest=$2)
      WHERE id=$1 AND expires_at>now() AND NOT used AND attempts<5 RETURNING used,purpose`, [challengeId,sha(challengeId + code)])
    if (!attempt.rows[0]?.used) return null
    const result = await client.query(`INSERT INTO users(email) VALUES($1) ON CONFLICT(email)
      DO UPDATE SET email=excluded.email RETURNING id`, [email])
    const id = result.rows[0].id
    if (attempt.rows[0].purpose === 'recover') {
      await client.query('DELETE FROM sessions WHERE user_id=$1', [id])
      await client.query('UPDATE auth_challenges SET used=true WHERE email=$1', [email])
    }
    await client.query('DELETE FROM sessions WHERE expires_at<=now()')
    await client.query('INSERT INTO sessions(digest,user_id) VALUES($1,$2)', [sha(session),id])
    return id
  })
  if (!user) throw new HttpError(401, 'invalid_or_expired_code')
  res.setHeader('Set-Cookie', cookie(session, 7 * 86400))
  json(res, 200, { id: user })
}

async function deleteAccountHandler(req: IncomingMessage, res: ServerResponse) {
  const userId = await viewer(req)
  let body: Record<string, unknown> = {}
  if (req.headers['content-type']?.split(';')[0]?.trim() === 'application/json') {
    try {
      body = await readBody(req)
    } catch (e) {
      if (e instanceof HttpError && e.status === 400) throw e
      body = {}
    }
  }

  const query = new URL(req.url || '', 'http://localhost').searchParams
  const queryConfirm = query.get('confirm') === 'true'
  const explicitConfirm = body.confirm === true || body.confirmation === 'DELETE' || queryConfirm

  if (body.confirm === false) {
    throw new HttpError(400, 'confirmation_required')
  }

  if (!explicitConfirm) {
    const sessionRes = await pool.query(
      'SELECT created_at FROM sessions WHERE digest=$1 AND expires_at>now()',
      [sha(token(req) || '')],
    )
    const sessionCreatedAt = sessionRes.rows[0]?.created_at
    const isRecent = sessionCreatedAt && (Date.now() - new Date(sessionCreatedAt).getTime() < 24 * 60 * 60 * 1000)
    if (!isRecent) {
      throw new HttpError(400, 'confirmation_required')
    }
  }

  await transaction(client => deleteUserAccount(userId, client))
  res.setHeader('Set-Cookie', cookie('', 0))
  json(res, 204)
}

async function consumePasswordAttempt(key: string, limit: number, res: ServerResponse) {
  const result = await pool.query(`
    INSERT INTO password_attempts AS bucket (bucket_key, attempts, expires_at)
    VALUES ($1, 1, now() + interval '15 minutes')
    ON CONFLICT (bucket_key) DO UPDATE SET
      attempts = CASE WHEN bucket.expires_at <= now() THEN 1 ELSE bucket.attempts + 1 END,
      expires_at = CASE WHEN bucket.expires_at <= now() THEN EXCLUDED.expires_at ELSE bucket.expires_at END
    WHERE bucket.expires_at <= now() OR bucket.attempts < $2
    RETURNING bucket_key`, [sha(key), limit])
  if (!result.rowCount) {
    res.setHeader('Retry-After', '900')
    throw new HttpError(429, 'try_later')
  }
}

async function authenticatePassword(req: IncomingMessage, res: ServerResponse, registration: boolean) {
  const body = await readBody(req)
  const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : ''
  const password = body.password
  if (!/^[a-z0-9_-]{3,32}$/.test(username)) throw new HttpError(400, 'invalid_username')
  if (typeof password !== 'string' || !password || password.length > 512 ||
      (registration && Array.from(password).length < 15)) {
    throw new HttpError(400, 'invalid_password')
  }

  const forwarded = process.env.VERCEL === '1' ? req.headers['x-vercel-forwarded-for'] : undefined
  const source = typeof forwarded === 'string' && isIP(forwarded) ? forwarded : req.socket.remoteAddress ?? 'unknown'
  await pool.query('DELETE FROM password_attempts WHERE expires_at <= now()')
  await consumePasswordAttempt(`password:source:${source}:${registration ? 'signup' : 'signin'}`, registration ? 12 : 80, res)
  if (!registration) await consumePasswordAttempt(`password:username:${username}`, 10, res)

  const session = randomBytes(32).toString('hex')
  const digest = sha(session)
  let userId: string
  if (registration) {
    const passwordHash = await hashPassword(password)
    userId = await transaction(async client => {
      const user = await client.query<{ id: string }>(`
        INSERT INTO users(username, password_hash) VALUES ($1,$2)
        ON CONFLICT (username) DO NOTHING RETURNING id`, [username, passwordHash])
      if (!user.rows[0]) throw new HttpError(409, 'username_unavailable')
      const { id } = user.rows[0]
      await client.query('INSERT INTO sessions(digest,user_id) VALUES($1,$2)', [digest, id])
      return id
    })
  } else {
    const result = await pool.query<{ id: string, password_hash: string }>(
      'SELECT id,password_hash FROM users WHERE username=$1', [username],
    )
    const user = result.rows[0]
    if (!(await verifyPassword(password, user?.password_hash)) || !user) {
      throw new HttpError(401, 'invalid_credentials')
    }
    const inserted = await pool.query(`
      INSERT INTO sessions(digest,user_id)
      SELECT $1,id FROM users WHERE id=$2 AND password_hash=$3 RETURNING user_id`,
    [digest, user.id, user.password_hash])
    if (!inserted.rowCount) throw new HttpError(401, 'invalid_credentials')
    userId = user.id
  }
  res.setHeader('Set-Cookie', cookie(session, 7 * 86400))
  json(res, registration ? 201 : 200, { id: userId, username })
}

export async function authRoute(req: IncomingMessage, res: ServerResponse, path: string) {
  if (req.method === 'POST' && path === '/auth/register') await authenticatePassword(req, res, true)
  else if (req.method === 'POST' && path === '/auth/password') await authenticatePassword(req, res, false)
  else if (req.method === 'POST' && path === '/auth/challenges') await challenge(req,res)
  else if (req.method === 'POST' && path === '/auth/sessions') await signIn(req,res)
  else if (req.method === 'GET' && path === '/me') {
    const id = await viewer(req)
    const row = await pool.query<{ username: string | null }>('SELECT username FROM users WHERE id=$1', [id])
    const username = row.rows[0]?.username
    json(res, 200, username ? { id, username } : { id })
  }
  else if (req.method === 'DELETE' && path === '/auth/session') {
    await pool.query('DELETE FROM sessions WHERE digest=$1', [sha(token(req) || '')])
    res.setHeader('Set-Cookie', cookie('',0))
    json(res,204)
  }
  else if (req.method === 'DELETE' && path === '/me') await deleteAccountHandler(req, res)
  else return false
  return true
}
