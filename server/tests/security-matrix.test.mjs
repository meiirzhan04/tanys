import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import test from 'node:test'

const LIVE_URL = process.env.TANYS_LIVE_API_URL?.replace(/\/$/, '')

function createMemoryDatabase() {
  const users = new Map()
  const sessions = new Map()
  const passwordAttempts = new Map()
  const events = new Map()
  const memberships = new Map()
  const invites = new Map()
  const booths = new Map()
  const accountProfiles = new Map()
  const profiles = new Map()
  const feedback = new Map()
  const contacts = new Map()
  const introductions = new Map()
  const blocks = new Set()
  const restrictions = new Map()
  const reports = new Map()
  const moderationActions = []
  const tombstones = new Map()
  let simulateFailure = false

  const memberKey = (eventId, userId) => `${eventId}:${userId}`
  const pairBlocked = (eventId, userA, userB) =>
    blocks.has(`${eventId}:${userA}:${userB}`) ||
    blocks.has(`${eventId}:${userB}:${userA}`) ||
    restrictions.has(memberKey(eventId, userA)) ||
    restrictions.has(memberKey(eventId, userB))

  function execute(rawSql, params = []) {
    if (simulateFailure) {
      throw new Error('postgres://tanys:secret_db_pw@db.example:5432/tanys connection lost')
    }
    const sql = rawSql.replace(/\s+/g, ' ').replace(/(?<![<>!])\s*=\s*/g, '=').trim()

    if (/^(BEGIN|COMMIT|ROLLBACK)$/.test(sql)) return { rowCount: 0, rows: [] }
    if (sql.includes('to_regclass(')) return { rowCount: 1, rows: [{ exists: true }] }
    if (sql.includes('FROM schema_migrations')) {
      const names = params[0] || []
      return { rowCount: names.length, rows: names.map((name) => ({ name })) }
    }

    if (sql.startsWith('SELECT name, profession, about FROM account_profiles WHERE user_id=$1')) {
      const profile = accountProfiles.get(params[0])
      return { rowCount: profile ? 1 : 0, rows: profile ? [profile] : [] }
    }
    if (sql.startsWith('INSERT INTO account_profiles(user_id,name,profession,about)')) {
      const [id, name, profession, about] = params
      const profile = { name, profession, about }
      accountProfiles.set(id, profile)
      return { rowCount: 1, rows: [profile] }
    }

    // Sessions & auth
    if (sql.startsWith('SELECT user_id FROM sessions WHERE digest=$1')) {
      const s = sessions.get(params[0])
      if (!s || s.expiresAt <= Date.now()) return { rowCount: 0, rows: [] }
      return { rowCount: 1, rows: [{ user_id: s.userId }] }
    }
    if (sql.startsWith('SELECT created_at FROM sessions WHERE digest=$1')) {
      const s = sessions.get(params[0])
      if (!s || s.expiresAt <= Date.now()) return { rowCount: 0, rows: [] }
      return { rowCount: 1, rows: [{ created_at: new Date(s.createdAt) }] }
    }
    if (sql.startsWith('DELETE FROM password_attempts WHERE expires_at <= now()')) {
      for (const [k, v] of passwordAttempts) {
        if (v.expiresAt <= Date.now()) passwordAttempts.delete(k)
      }
      return { rowCount: 0, rows: [] }
    }
    if (sql.startsWith('DELETE FROM password_attempts WHERE bucket_key=$1')) {
      passwordAttempts.delete(params[0])
      return { rowCount: 1, rows: [] }
    }
    if (sql.startsWith('INSERT INTO password_attempts AS bucket')) {
      const [key, limit] = params
      const now = Date.now()
      const current = passwordAttempts.get(key)
      if (!current || current.expiresAt <= now) {
        passwordAttempts.set(key, { attempts: 1, expiresAt: now + 900_000 })
        return { rowCount: 1, rows: [{ bucket_key: key }] }
      }
      if (current.attempts >= limit) return { rowCount: 0, rows: [] }
      current.attempts += 1
      return { rowCount: 1, rows: [{ bucket_key: key }] }
    }
    if (sql.startsWith('INSERT INTO users(username, password_hash)')) {
      const [username, passwordHash] = params
      for (const u of users.values()) {
        if (u.username === username) return { rowCount: 0, rows: [] }
      }
      const id = randomUUID()
      users.set(id, { id, username, email: `${username}@local.test`, passwordHash, canCreateEvents: false })
      return { rowCount: 1, rows: [{ id }] }
    }
    if (sql.startsWith('SELECT id,password_hash FROM users WHERE username=$1')) {
      const u = [...users.values()].find((item) => item.username === params[0])
      return u ? { rowCount: 1, rows: [{ id: u.id, password_hash: u.passwordHash }] } : { rowCount: 0, rows: [] }
    }
    if (sql.startsWith('SELECT username FROM users WHERE id=$1')) {
      const u = users.get(params[0])
      return u ? { rowCount: 1, rows: [{ username: u.username ?? null }] } : { rowCount: 0, rows: [] }
    }
    if (sql.startsWith('INSERT INTO sessions(digest,user_id) SELECT $1,id FROM users')) {
      const [digest, id, hash] = params
      const u = users.get(id)
      if (!u || u.passwordHash !== hash) return { rowCount: 0, rows: [] }
      sessions.set(digest, { userId: id, createdAt: Date.now(), expiresAt: Date.now() + 7 * 86400_000 })
      return { rowCount: 1, rows: [{ user_id: id }] }
    }
    if (sql.startsWith('INSERT INTO sessions(digest,user_id) VALUES($1,$2)')) {
      sessions.set(params[0], { userId: params[1], createdAt: Date.now(), expiresAt: Date.now() + 7 * 86400_000 })
      return { rowCount: 1, rows: [] }
    }
    if (sql.startsWith('DELETE FROM sessions WHERE digest=$1')) {
      const existed = sessions.delete(params[0])
      return { rowCount: existed ? 1 : 0, rows: [] }
    }
    if (sql.startsWith('DELETE FROM sessions WHERE user_id=$1')) {
      for (const [k, s] of sessions) if (s.userId === params[0]) sessions.delete(k)
      return { rowCount: 1, rows: [] }
    }

    // Account deletion (retention.deleteUserAccount)
    if (/^SELECT email FROM users WHERE id=\$1/.test(sql)) {
      const u = users.get(params[0])
      return u ? { rowCount: 1, rows: [{ email: u.email }] } : { rowCount: 0, rows: [] }
    }
    if (sql.includes('deleted_account_tombstones')) {
      if (/^INSERT INTO deleted_account_tombstones/.test(sql)) {
        tombstones.set(params[0], { userId: params[0], deletedAt: new Date() })
        return { rowCount: 1, rows: [] }
      }
      return { rowCount: 0, rows: [] }
    }
    if (/^DELETE FROM users WHERE id=\$1/.test(sql)) {
      const id = params[0]
      users.delete(id)
      contacts.delete(id)
      for (const [k, s] of sessions) if (s.userId === id) sessions.delete(k)
      for (const [k, m] of memberships) if (m.userId === id) memberships.delete(k)
      for (const [k, p] of profiles) if (p.userId === id) profiles.delete(k)
      return { rowCount: 1, rows: [] }
    }

    // Users & events
    if (sql.startsWith('SELECT can_create_events FROM users WHERE id=$1')) {
      const u = users.get(params[0])
      return u ? { rowCount: 1, rows: [{ can_create_events: u.canCreateEvents }] } : { rowCount: 0, rows: [] }
    }
    if (sql.startsWith('INSERT INTO events AS e(')) {
      const [name, timeZone, startsAt, endsAt] = params
      const ev = { id: randomUUID(), name, timeZone, startsAt, endsAt, status: 'active', closedAt: null }
      events.set(ev.id, ev)
      return { rowCount: 1, rows: [{ id: ev.id, name, timeZone, startsAt, endsAt, status: ev.status }] }
    }
    if (sql.startsWith('INSERT INTO memberships VALUES($1,$2,')) {
      const role = sql.includes("'organizer'") ? 'organizer' : 'participant'
      memberships.set(memberKey(params[0], params[1]), { eventId: params[0], userId: params[1], role })
      return { rowCount: 1, rows: [] }
    }
    if (sql.startsWith('SELECT e.id,e.name,e.time_zone AS "timeZone",e.starts_at AS "startsAt",e.ends_at AS "endsAt",e.status,m.role FROM memberships')) {
      const [userId, cursor, limit] = params
      const rows = [...memberships.values()]
        .filter((m) => m.userId === userId && (!cursor || m.eventId > cursor))
        .map((m) => {
          const ev = events.get(m.eventId)
          return { id: ev.id, name: ev.name, timeZone: ev.timeZone, startsAt: ev.startsAt, endsAt: ev.endsAt, status: ev.status, role: m.role }
        })
        .sort((a, b) => a.id.localeCompare(b.id))
        .slice(0, limit)
      return { rowCount: rows.length, rows }
    }
    if (sql.startsWith('SELECT e.id,e.name,e.time_zone AS "timeZone",e.starts_at AS "startsAt",e.ends_at AS "endsAt",e.status FROM events e WHERE id=$1 FOR UPDATE')) {
      const ev = events.get(params[0])
      return ev ? { rowCount: 1, rows: [{ id: ev.id, name: ev.name, timeZone: ev.timeZone, startsAt: ev.startsAt, endsAt: ev.endsAt, status: ev.status }] } : { rowCount: 0, rows: [] }
    }
    if (sql.startsWith('SELECT role FROM memberships WHERE event_id=$1 AND user_id=$2')) {
      const m = memberships.get(memberKey(params[0], params[1]))
      return m ? { rowCount: 1, rows: [{ role: m.role }] } : { rowCount: 0, rows: [] }
    }
    if (sql.startsWith('SELECT 1 FROM memberships WHERE event_id=$1 AND user_id=$2')) {
      return { rowCount: memberships.has(memberKey(params[0], params[1])) ? 1 : 0, rows: [] }
    }
    if (sql.startsWith('SELECT m.role, e.status FROM memberships m JOIN events e')) {
      const m = memberships.get(memberKey(params[0], params[1]))
      const ev = m && events.get(params[0])
      return m && ev ? { rowCount: 1, rows: [{ role: m.role, status: ev.status }] } : { rowCount: 0, rows: [] }
    }
    if (sql.startsWith('SELECT e.status FROM memberships m JOIN events e') || sql.startsWith('SELECT e.status FROM events e JOIN memberships m')) {
      const m = memberships.get(memberKey(params[0], params[1]))
      const ev = m && events.get(params[0])
      return m && ev ? { rowCount: 1, rows: [{ status: ev.status }] } : { rowCount: 0, rows: [] }
    }
    if (sql.startsWith('DELETE FROM memberships WHERE event_id=$1 AND user_id=$2')) {
      const ok = memberships.delete(memberKey(params[0], params[1]))
      return { rowCount: ok ? 1 : 0, rows: [] }
    }
    if (sql.startsWith('UPDATE events AS e SET name=$1')) {
      const [name, timeZone, startsAt, endsAt, status, id] = params
      const ev = events.get(id)
      Object.assign(ev, { name, timeZone, startsAt, endsAt, status })
      return { rowCount: 1, rows: [{ id: ev.id, name, timeZone, startsAt, endsAt, status }] }
    }

    // Invites
    if (sql.startsWith('INSERT INTO event_invites(event_id,digest,expires_at)')) {
      const id = randomUUID()
      invites.set(id, { id, eventId: params[0], digest: params[1], expiresAt: params[2], revoked: false })
      return { rowCount: 1, rows: [{ id }] }
    }
    if (sql.startsWith('SELECT 1 FROM event_invites WHERE event_id=$1 AND digest=$2')) {
      const found = [...invites.values()].some(
        (i) => i.eventId === params[0] && i.digest === params[1] && !i.revoked && +i.expiresAt > Date.now(),
      )
      return { rowCount: found ? 1 : 0, rows: found ? [{ '?column?': 1 }] : [] }
    }
    if (sql.startsWith('UPDATE event_invites SET revoked=true WHERE id=$1 AND event_id=$2')) {
      const inv = invites.get(params[0])
      if (!inv || inv.eventId !== params[1]) return { rowCount: 0, rows: [] }
      inv.revoked = true
      return { rowCount: 1, rows: [] }
    }

    // Organizer members, interests, booths
    if (sql.startsWith('SELECT m.user_id AS "userId", m.role, COALESCE(p.name, u.username)')) {
      const [eventId, cursor, limit] = params
      const rows = [...memberships.values()]
        .filter((m) => m.eventId === eventId && (!cursor || m.userId > cursor))
        .sort((a, b) => a.userId.localeCompare(b.userId))
        .slice(0, limit)
        .map((m) => {
          const u = users.get(m.userId)
          const p = profiles.get(memberKey(eventId, m.userId))
          return p && p.visible
            ? { userId: m.userId, role: m.role, name: p.name, username: u?.username ?? null, profileRole: p.role, goal: p.goal, visible: true }
            : { userId: m.userId, role: m.role, name: u?.username ?? null, username: u?.username ?? null, profileRole: null, goal: null, visible: null }
        })
      return { rowCount: rows.length, rows }
    }
    if (sql.startsWith('SELECT interests FROM event_profiles WHERE event_id=$1 AND visible')) {
      const rows = [...profiles.values()]
        .filter((p) => p.eventId === params[0] && p.visible)
        .map((p) => ({ interests: p.interests }))
      return { rowCount: rows.length, rows }
    }
    if (sql.includes('FROM event_booths WHERE event_id=$1')) {
      const onlyPub = sql.includes('published=true')
      const rows = [...booths.values()]
        .filter((b) => b.eventId === params[0] && (!onlyPub || b.published))
        .map((b) => ({ id: b.id, name: b.name, description: b.description, topics: b.topics, published: b.published }))
      return { rowCount: rows.length, rows }
    }
    if (sql.startsWith('INSERT INTO event_booths(event_id, name, description, topics, published)')) {
      const [eventId, name, description, topics, published] = params
      const b = { id: randomUUID(), eventId, name, description, topics, published }
      booths.set(b.id, b)
      return { rowCount: 1, rows: [{ id: b.id, name, description, topics, published }] }
    }
    if (sql.startsWith('SELECT id, name, description, topics, published FROM event_booths WHERE id=$1 AND event_id=$2')) {
      const b = booths.get(params[0])
      if (!b || b.eventId !== params[1]) return { rowCount: 0, rows: [] }
      return { rowCount: 1, rows: [{ id: b.id, name: b.name, description: b.description, topics: b.topics, published: b.published }] }
    }
    if (sql.startsWith('UPDATE event_booths SET name=$1')) {
      const [name, description, topics, published, id, eventId] = params
      const b = booths.get(id)
      if (!b || b.eventId !== eventId) return { rowCount: 0, rows: [] }
      Object.assign(b, { name, description, topics, published })
      return { rowCount: 1, rows: [{ id: b.id, name, description, topics, published }] }
    }

    // Event profiles & recommendations & feedback
    if (sql.startsWith('SELECT name,role,skills,experience_years AS "experienceYears",interests,about,goal,looking_for AS "lookingFor",visible,consent_version AS "consentVersion" FROM event_profiles')) {
      const p = profiles.get(memberKey(params[0], params[1]))
      if (!p) return { rowCount: 0, rows: [] }
      const { eventId: _e, userId: _u, ...view } = p
      return { rowCount: 1, rows: [view] }
    }
    if (sql.startsWith('INSERT INTO event_profiles(')) {
      const [eventId, userId, name, role, skills, experienceYears, interests, about, goal, lookingFor, visible, consentVersion] = params
      const row = { eventId, userId, name, role, skills, experienceYears, interests, about, goal, lookingFor, visible, consentVersion }
      profiles.set(memberKey(eventId, userId), row)
      const { eventId: _e, userId: _u, ...view } = row
      return { rowCount: 1, rows: [view] }
    }
    if (sql.startsWith('SELECT p.user_id AS id,p.name,p.role,p.skills,p.experience_years AS "experienceYears",p.interests,p.about,p.goal,p.looking_for AS "lookingFor" FROM event_profiles p WHERE p.event_id=$1 AND p.user_id=$2')) {
      const p = profiles.get(memberKey(params[0], params[1]))
      if (!p) return { rowCount: 0, rows: [] }
      return { rowCount: 1, rows: [{ id: p.userId, name: p.name, role: p.role, skills: p.skills, experienceYears: p.experienceYears, interests: p.interests, about: p.about, goal: p.goal, lookingFor: p.lookingFor }] }
    }
    if (sql.startsWith('SELECT 1 FROM event_profiles p WHERE p.event_id=$1 AND p.visible AND p.user_id<>$2')) {
      const [eventId, userId, candidateId] = params
      const p = profiles.get(memberKey(eventId, candidateId))
      const ok = p && p.visible && candidateId !== userId && !pairBlocked(eventId, userId, candidateId)
      return { rowCount: ok ? 1 : 0, rows: ok ? [{ '?column?': 1 }] : [] }
    }
    if (sql.startsWith('SELECT p.user_id AS id,p.name,p.role,p.skills,p.experience_years AS "experienceYears",p.interests,p.about,p.goal,p.looking_for AS "lookingFor" FROM event_profiles p WHERE p.event_id=$1 AND p.visible AND p.user_id<>$2')) {
      const [eventId, userId] = params
      const rows = [...profiles.values()]
        .filter((p) => p.eventId === eventId && p.visible && p.userId !== userId && !pairBlocked(eventId, userId, p.userId) && !feedback.has(`${eventId}:${userId}:${p.userId}`))
        .map((p) => ({ id: p.userId, name: p.name, role: p.role, skills: p.skills, experienceYears: p.experienceYears, interests: p.interests, about: p.about, goal: p.goal, lookingFor: p.lookingFor }))
      return { rowCount: rows.length, rows }
    }
    if (sql.startsWith('INSERT INTO event_feedback VALUES($1,$2,$3,$4)')) {
      feedback.set(`${params[0]}:${params[1]}:${params[2]}`, params[3])
      return { rowCount: 1, rows: [] }
    }

    // Contacts & introductions
    if (sql.startsWith('INSERT INTO user_contacts VALUES($1,$2)')) {
      contacts.set(params[0], params[1])
      return { rowCount: 1, rows: [] }
    }
    if (sql.startsWith('SELECT 1 FROM event_profiles mine JOIN event_profiles other')) {
      const [eventId, sender, recipient] = params
      const a = profiles.get(memberKey(eventId, sender))
      const b = profiles.get(memberKey(eventId, recipient))
      const ok = Boolean(a && b && a.visible && b.visible && !pairBlocked(eventId, sender, recipient))
      return { rowCount: ok ? 1 : 0, rows: ok ? [{ '?column?': 1 }] : [] }
    }
    if (sql.startsWith('INSERT INTO introductions(event_id,sender,recipient)')) {
      const [eventId, sender, recipient] = params
      const dup = [...introductions.values()].find(
        (i) => i.eventId === eventId && ((i.sender === sender && i.recipient === recipient) || (i.sender === recipient && i.recipient === sender)),
      )
      if (dup) return { rowCount: 0, rows: [] }
      const id = randomUUID()
      const now = new Date()
      introductions.set(id, { id, eventId, sender, recipient, status: 'pending', createdAt: now, updatedAt: now })
      return { rowCount: 1, rows: [{ id }] }
    }
    if (sql.startsWith('SELECT id FROM introductions WHERE event_id=$1')) {
      const [eventId, a, b] = params
      const found = [...introductions.values()].find(
        (i) => i.eventId === eventId && ((i.sender === a && i.recipient === b) || (i.sender === b && i.recipient === a)),
      )
      return found ? { rowCount: 1, rows: [{ id: found.id }] } : { rowCount: 0, rows: [] }
    }
    if (sql.startsWith('SELECT i.* FROM introductions i WHERE i.event_id=$1 AND i.id=$3')) {
      const [eventId, userId, id] = params
      const i = introductions.get(id)
      if (!i || i.eventId !== eventId || (i.sender !== userId && i.recipient !== userId) || pairBlocked(eventId, i.sender, i.recipient)) {
        return { rowCount: 0, rows: [] }
      }
      return { rowCount: 1, rows: [{ ...i }] }
    }
    if (sql.startsWith('UPDATE introductions SET status=$2')) {
      const i = introductions.get(params[0])
      if (i) {
        i.status = params[1]
        i.updatedAt = new Date()
      }
      return { rowCount: i ? 1 : 0, rows: [] }
    }
    if (sql.startsWith('SELECT i.id,i.status,i.created_at AS "createdAt",i.updated_at AS "updatedAt"')) {
      const [eventId, userId, targetId] = params
      const rows = [...introductions.values()]
        .filter((i) => {
          if (i.eventId !== eventId) return false
          if (targetId && i.id !== targetId) return false
          if (i.sender !== userId && i.recipient !== userId) return false
          if (pairBlocked(eventId, i.sender, i.recipient)) return false
          const peerId = i.sender === userId ? i.recipient : i.sender
          const p = profiles.get(memberKey(eventId, peerId))
          return Boolean(p && p.visible)
        })
        .sort((a, b) => +b.createdAt - +a.createdAt)
        .map((i) => {
          const peerId = i.sender === userId ? i.recipient : i.sender
          const p = profiles.get(memberKey(eventId, peerId))
          return {
            id: i.id,
            status: i.status,
            createdAt: i.createdAt,
            updatedAt: i.updatedAt,
            direction: i.sender === userId ? 'outgoing' : 'incoming',
            participantId: p.userId,
            participantName: p.name,
            participantRole: p.role,
            contact: i.status === 'accepted' ? (contacts.get(peerId) ?? null) : null,
          }
        })
      return { rowCount: rows.length, rows }
    }

    // Blocks, reports, restrictions
    if (sql.startsWith('INSERT INTO event_blocks(')) {
      blocks.add(`${params[0]}:${params[1]}:${params[2]}`)
      return { rowCount: 1, rows: [] }
    }
    if (sql.startsWith('INSERT INTO event_reports(')) {
      const [eventId, reporterId, subjectId, reason, details] = params
      const id = randomUUID()
      const row = { id, eventId, reporterId, subjectId, reason, details, status: 'open', action: null, resolvedBy: null, resolvedAt: null, createdAt: new Date() }
      reports.set(id, row)
      return { rowCount: 1, rows: [{ id, status: row.status }] }
    }
    if (sql.startsWith('SELECT r.id, r.subject_id AS "subjectId", COALESCE(p.name, u.username) AS "subjectName"')) {
      const rows = [...reports.values()]
        .filter((r) => r.eventId === params[0])
        .map((r) => {
          const u = users.get(r.subjectId)
          const p = profiles.get(memberKey(r.eventId, r.subjectId))
          const subjectName = p && p.visible ? p.name : (u?.username ?? null)
          return { id: r.id, subjectId: r.subjectId, subjectName, reason: r.reason, details: r.details, status: r.status, action: r.action, resolvedBy: r.resolvedBy, resolvedAt: r.resolvedAt, createdAt: r.createdAt }
        })
      return { rowCount: rows.length, rows }
    }
    if (sql.startsWith('SELECT id, subject_id, reason FROM event_reports WHERE id=$1 AND event_id=$2')) {
      const r = reports.get(params[0])
      return r && r.eventId === params[1] ? { rowCount: 1, rows: [{ id: r.id, subject_id: r.subjectId, reason: r.reason }] } : { rowCount: 0, rows: [] }
    }
    if (sql.startsWith('UPDATE event_reports AS r SET status')) {
      const [action, userId, reportId, eventId] = params
      const r = reports.get(reportId)
      if (!r || r.eventId !== eventId) return { rowCount: 0, rows: [] }
      Object.assign(r, { status: 'resolved', action, resolvedBy: userId, resolvedAt: new Date() })
      const u = users.get(r.subjectId)
      const p = profiles.get(memberKey(r.eventId, r.subjectId))
      const subjectName = p && p.visible ? p.name : (u?.username ?? null)
      return { rowCount: 1, rows: [{ id: r.id, subjectId: r.subjectId, subjectName, reason: r.reason, details: r.details, status: r.status, action: r.action, resolvedBy: r.resolvedBy, resolvedAt: r.resolvedAt, createdAt: r.createdAt }] }
    }
    if (sql.startsWith('INSERT INTO moderation_actions(')) {
      moderationActions.push({ eventId: params[0], reportId: params[1], moderatorId: params[2], subjectId: params[3], action: params[4] })
      return { rowCount: 1, rows: [] }
    }
    if (sql.startsWith('INSERT INTO event_restrictions(')) {
      restrictions.set(memberKey(params[0], params[1]), { reason: params[2], restrictedBy: params[3] })
      return { rowCount: 1, rows: [] }
    }

    // Admin routes
    if (sql.startsWith('SELECT u.can_create_events, EXISTS(SELECT 1 FROM users WHERE can_create_events)')) {
      const u = users.get(params[0])
      if (!u) return { rowCount: 0, rows: [] }
      const hasAny = [...users.values()].some((item) => item.canCreateEvents)
      return { rowCount: 1, rows: [{ can_create_events: u.canCreateEvents, has_any_organizer: hasAny }] }
    }
    if (sql.startsWith('SELECT u.id, u.username, u.can_create_events AS "canCreateEvents"')) {
      const rows = [...users.values()].map((u) => ({
        id: u.id,
        username: u.username ?? null,
        canCreateEvents: u.canCreateEvents,
        createdAt: new Date(),
        eventsCount: [...memberships.values()].filter((m) => m.userId === u.id).length,
        profilesCount: [...profiles.values()].filter((p) => p.userId === u.id).length,
      }))
      return { rowCount: rows.length, rows }
    }
    if (sql.startsWith('SELECT e.id, e.name, e.time_zone AS "timeZone"')) {
      const rows = [...events.values()].map((e) => ({
        id: e.id,
        name: e.name,
        timeZone: e.timeZone,
        startsAt: e.startsAt,
        endsAt: e.endsAt,
        status: e.status,
        memberCount: [...memberships.values()].filter((m) => m.eventId === e.id).length,
        profileCount: [...profiles.values()].filter((p) => p.eventId === e.id).length,
      }))
      return { rowCount: rows.length, rows }
    }
    if (sql.startsWith('SELECT p.event_id AS "eventId", e.name AS "eventName"')) {
      const rows = [...profiles.values()].map((p) => ({
        eventId: p.eventId,
        eventName: events.get(p.eventId)?.name ?? '',
        userId: p.userId,
        username: users.get(p.userId)?.username ?? null,
        name: p.name,
        role: p.role,
        goal: p.goal,
        skills: p.skills,
        interests: p.interests,
        experienceYears: p.experienceYears,
        visible: p.visible,
      }))
      return { rowCount: rows.length, rows }
    }
    if (sql.startsWith('SELECT i.id, i.event_id AS "eventId", e.name AS "eventName"')) {
      const rows = [...introductions.values()].map((i) => ({
        id: i.id,
        eventId: i.eventId,
        eventName: events.get(i.eventId)?.name ?? '',
        status: i.status,
        createdAt: i.createdAt,
        senderName: profiles.get(memberKey(i.eventId, i.sender))?.name ?? users.get(i.sender)?.username ?? i.sender,
        recipientName: profiles.get(memberKey(i.eventId, i.recipient))?.name ?? users.get(i.recipient)?.username ?? i.recipient,
      }))
      return { rowCount: rows.length, rows }
    }
    if (sql.startsWith('SELECT m.id, i.event_id AS "eventId", e.name AS "eventName"')) {
      return { rowCount: 0, rows: [] }
    }
    if (sql.startsWith('SELECT r.id, r.event_id AS "eventId", e.name AS "eventName"')) {
      const rows = [...reports.values()].map((r) => ({
        id: r.id,
        eventId: r.eventId,
        eventName: events.get(r.eventId)?.name ?? '',
        reason: r.reason,
        details: r.details,
        status: r.status,
        action: r.action,
        createdAt: r.createdAt,
        reporterName: profiles.get(memberKey(r.eventId, r.reporterId))?.name ?? users.get(r.reporterId)?.username ?? r.reporterId,
        subjectName: profiles.get(memberKey(r.eventId, r.subjectId))?.name ?? users.get(r.subjectId)?.username ?? r.subjectId,
      }))
      return { rowCount: rows.length, rows }
    }
    if (sql.startsWith('UPDATE users SET can_create_events=$1 WHERE id=$2')) {
      const u = users.get(params[1])
      if (!u) return { rowCount: 0, rows: [] }
      u.canCreateEvents = params[0]
      return { rowCount: 1, rows: [{ id: u.id, username: u.username, canCreateEvents: u.canCreateEvents }] }
    }

    if (/^(DELETE FROM (auth_challenges|user_contacts|availability|event_feedback|event_blocks|introductions|meetings|memberships|event_reports|moderation_actions|event_restrictions|event_profiles|password_attempts)|UPDATE event_reports SET resolved_by=NULL)/.test(sql)) {
      if (sql.includes('user_contacts')) contacts.delete(params[0])
      return { rowCount: 0, rows: [] }
    }

    throw new Error('Unhandled SQL in security-matrix mock: ' + sql)
  }

  return {
    grantOrganizer(userId) {
      const u = users.get(userId)
      if (u) u.canCreateEvents = true
    },
    setFailure(enabled) {
      simulateFailure = enabled
    },
    query: async (sql, params) => execute(sql, params),
    connect: async () => ({
      query: async (sql, params) => execute(sql, params),
      release: () => {},
    }),
  }
}

async function createMatrixHarness() {
  if (LIVE_URL) {
    const { execFileSync } = await import('node:child_process')
    return {
      isLive: true,
      baseUrl: `${LIVE_URL}/api/v1`,
      appOrigin: 'http://localhost:3000',
      expectSecureCookie: false,
      logs: null,
      setFailure: null,
      grantOrganizer(userId) {
        execFileSync(
          'docker',
          ['compose', '-f', 'compose.api.yaml', 'exec', '-T', 'db', 'psql', '-U', 'tanys', '-v', 'ON_ERROR_STOP=1'],
          { input: `UPDATE users SET can_create_events=true WHERE id='${userId}';` },
        )
      },
      async close() {},
    }
  }

  const appOrigin = 'https://tanys.example'
  process.env.DATABASE_URL = 'postgresql://tanys:secret_db_pw@db.example:5432/tanys'
  process.env.APP_ORIGIN = appOrigin
  process.env.NODE_ENV = 'test'

  const { pool } = await import('../dist/db.js')
  const db = createMemoryDatabase()
  pool.query = db.query
  pool.connect = db.connect

  const [
    { meetingRoute },
    { introductionRoute },
    { recommendationRoute },
    { authRoute },
    { eventRoute },
    { organizerRoute },
    { adminRoute },
    { moderationRoute },
    { profileRoute },
    { createMetricsTracker, createObservedRequestHandler },
  ] = await Promise.all([
    import('../dist/meetings.js'),
    import('../dist/introductions.js'),
    import('../dist/recommendations.js'),
    import('../dist/auth.js'),
    import('../dist/events.js'),
    import('../dist/organizer.js'),
    import('../dist/admin.js'),
    import('../dist/moderation.js'),
    import('../dist/profiles.js'),
    import('../dist/observability.js'),
  ])

  const logs = []
  const handler = createObservedRequestHandler({
    appOrigin,
    routes: [adminRoute, meetingRoute, introductionRoute, recommendationRoute, authRoute, eventRoute, organizerRoute, moderationRoute, profileRoute],
    checkReady: async () => true,
    metrics: createMetricsTracker(),
    log: (line) => logs.push(line),
  })
  const server = createServer(handler)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()

  return {
    isLive: false,
    baseUrl: `http://127.0.0.1:${address.port}/api/v1`,
    appOrigin,
    expectSecureCookie: true,
    logs,
    setFailure: db.setFailure,
    grantOrganizer: (userId) => db.grantOrganizer(userId),
    async close() {
      await new Promise((resolve) => server.close(resolve))
    },
  }
}

test('security and event isolation matrix across guest, participants, and cross-event organizers (#60)', async () => {
  const env = await createMatrixHarness()
  const runTag = createHash('sha256').update(randomUUID()).digest('hex').slice(0, 6)
  const secretPasswords = []
  const secretTokens = []
  const secretContacts = ['tg:@secret_part_a1_' + runTag, 'tg:@secret_part_a2_' + runTag]

  async function api(cookie, method, path, body, customOrigin = env.appOrigin) {
    const headers = {}
    if (cookie) headers.cookie = cookie
    if (method !== 'GET' && customOrigin !== null) headers.origin = customOrigin
    if (body !== undefined) headers['content-type'] = 'application/json'
    const res = await fetch(`${env.baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const text = await res.text()
    return { status: res.status, headers: res.headers, raw: text, body: text ? JSON.parse(text) : null }
  }

  async function registerAccount(prefix, grantOrganizerRole = false) {
    const username = `${prefix}_${runTag}`
    const password = `TanysStrong_${prefix}_${runTag}!`
    secretPasswords.push(password)
    const res = await api(null, 'POST', '/auth/register', { username, password })
    assert.equal(res.status, 201, `register ${username}: ${res.raw}`)
    const setCookie = res.headers.get('set-cookie') || ''
    assert.match(setCookie, /HttpOnly/i)
    assert.match(setCookie, /SameSite=Lax/i)
    assert.match(setCookie, /Path=\//i)
    if (env.expectSecureCookie) assert.match(setCookie, /;\s*Secure/i)
    const cookie = setCookie.split(';')[0]
    secretTokens.push(cookie.split('=')[1])
    if (grantOrganizerRole) env.grantOrganizer(res.body.id)
    return { id: res.body.id, username, password, cookie }
  }

  try {
    // 1. Guest negative checks, validation, Origin/CSRF check, & cookie lifecycle
    assert.equal((await api(null, 'GET', '/me')).status, 401)
    assert.equal((await api('tanys_session=forged_token_value', 'GET', '/me')).status, 401)
    assert.equal((await api(null, 'GET', '/events')).status, 401)
    assert.equal((await api(null, 'POST', '/auth/register', { username: 'bad!', password: 'TanysStrong_123456!' })).status, 400)
    assert.equal((await api(null, 'POST', '/auth/register', { username: `short_${runTag}`, password: '12345' })).status, 400)
    assert.equal(
      (await api(null, 'POST', '/auth/register', { username: `csrf_${runTag}`, password: 'TanysStrong_123456!' }, 'https://evil.example')).status,
      403,
    )

    // Register actors: two organizers (Event A and Event B) + participants
    const orgA = await registerAccount('orga', true)
    const orgB = await registerAccount('orgb', true)
    const partA1 = await registerAccount('pa1')
    const partA2 = await registerAccount('pa2')
    const partA3 = await registerAccount('pa3')
    const partB1 = await registerAccount('pb1')
    const tempUser = await registerAccount('tmp')

    const privateProfile = { name: 'Parasat', profession: 'Software Engineer', about: 'Account biography' }
    assert.equal((await api(null, 'GET', '/me/profile')).status, 401)
    assert.equal((await api(null, 'PUT', '/me/profile', privateProfile)).status, 401)
    assert.deepEqual((await api(partA1.cookie, 'PUT', '/me/profile', privateProfile)).body, privateProfile)
    const other = { ...privateProfile, name: 'Other participant' }
    assert.deepEqual((await api(partA2.cookie, 'PUT', '/me/profile', { ...other, user_id: partA1.id })).body, other)
    assert.deepEqual((await api(partA2.cookie, 'GET', '/me/profile?user_id=' + partA1.id)).body, other)
    assert.deepEqual((await api(partA1.cookie, 'GET', '/me/profile')).body, privateProfile)

    // /me exposes ONLY { id, username } and never leaks email/password_hash
    const meA = await api(orgA.cookie, 'GET', '/me')
    assert.equal(meA.status, 200)
    assert.deepEqual(Object.keys(meA.body).sort(), ['id', 'username'])
    assert.equal(meA.body.username, orgA.username)
    assert.equal('email' in meA.body, false)
    assert.equal('passwordHash' in meA.body, false)

    // Logout & account deletion revoke sessions immediately
    const relogin = await api(null, 'POST', '/auth/password', { username: tempUser.username, password: tempUser.password })
    assert.equal(relogin.status, 200)
    const tempCookie2 = relogin.headers.get('set-cookie').split(';')[0]
    secretTokens.push(tempCookie2.split('=')[1])
    const logoutRes = await api(tempUser.cookie, 'DELETE', '/auth/session')
    assert.equal(logoutRes.status, 204)
    assert.match(logoutRes.headers.get('set-cookie') || '', /Max-Age=0/i)
    assert.equal((await api(tempUser.cookie, 'GET', '/me')).status, 401)

    assert.equal((await api(tempCookie2, 'DELETE', '/me', { confirm: false })).status, 400)
    const delRes = await api(tempCookie2, 'DELETE', '/me', { confirm: true })
    assert.equal(delRes.status, 204)
    assert.match(delRes.headers.get('set-cookie') || '', /Max-Age=0/i)
    assert.equal((await api(tempCookie2, 'GET', '/me')).status, 401)

    // Password brute-force throttling triggers 429 on dedicated rate-limit check
    const rlStatuses = []
    for (let i = 0; i < 12; i++) {
      rlStatuses.push((await api(null, 'POST', '/auth/password', { username: `rl_${runTag}`, password: 'WrongPassword12345!' })).status)
    }
    assert.equal(rlStatuses.at(-1), 429)

    // 2. Event creation role check & organizer isolation (Event A vs Event B)
    const startsAt = new Date().toISOString()
    const endsAt = new Date(Date.now() + 7 * 86400_000).toISOString()
    const inviteExp = new Date(Date.now() + 3600_000).toISOString()

    assert.equal((await api(partA1.cookie, 'POST', '/events', { name: 'Forbidden', timeZone: 'UTC', startsAt, endsAt })).status, 403)
    const evARes = await api(orgA.cookie, 'POST', '/events', { name: 'Event A ' + runTag, timeZone: 'UTC', startsAt, endsAt })
    const evBRes = await api(orgB.cookie, 'POST', '/events', { name: 'Event B ' + runTag, timeZone: 'UTC', startsAt, endsAt })
    assert.equal(evARes.status, 201)
    assert.equal(evBRes.status, 201)
    const evA = evARes.body.id
    const evB = evBRes.body.id

    // Invites: create, participant forbidden, revoked token blocked, cross-event invite rejected
    assert.equal((await api(partA1.cookie, 'POST', `/events/${evA}/invites`, { expiresAt: inviteExp })).status, 404)
    const invA = await api(orgA.cookie, 'POST', `/events/${evA}/invites`, { expiresAt: inviteExp })
    const invRevoked = await api(orgA.cookie, 'POST', `/events/${evA}/invites`, { expiresAt: inviteExp })
    const invB = await api(orgB.cookie, 'POST', `/events/${evB}/invites`, { expiresAt: inviteExp })
    assert.equal(invA.status, 201)
    assert.equal(invB.status, 201)
    secretTokens.push(invA.body.token, invRevoked.body.token, invB.body.token)

    assert.equal((await api(orgB.cookie, 'DELETE', `/events/${evA}/invites/${invA.body.id}`)).status, 404)
    assert.equal((await api(orgA.cookie, 'DELETE', `/events/${evA}/invites/${invRevoked.body.id}`)).status, 204)
    assert.equal((await api(partA1.cookie, 'PUT', `/events/${evA}/members/me`, { token: invRevoked.body.token })).status, 404)
    assert.equal((await api(partB1.cookie, 'PUT', `/events/${evB}/members/me`, { token: invA.body.token })).status, 404)

    for (const p of [partA1, partA2, partA3]) {
      assert.equal((await api(p.cookie, 'PUT', `/events/${evA}/members/me`, { token: invA.body.token })).status, 200)
    }
    assert.equal((await api(partB1.cookie, 'PUT', `/events/${evB}/members/me`, { token: invB.body.token })).status, 200)

    // Now partA1 is a participant in Event A: must still get 403 on organizer invite actions
    assert.equal((await api(partA1.cookie, 'POST', `/events/${evA}/invites`, { expiresAt: inviteExp })).status, 403)
    assert.equal((await api(partA1.cookie, 'DELETE', `/events/${evA}/invites/${invA.body.id}`)).status, 403)

    // 3. Profiles, visibility, organizer booths/members/interests, & cross-event organizer isolation
    const baseProfile = {
      name: 'Participant',
      role: 'Engineer',
      skills: ['TypeScript'],
      interests: ['AI'],
      experienceYears: 3,
      goal: 'find_job',
      about: 'Building developer tools cleanly.',
      consentVersion: 'v1',
      visible: true,
    }
    assert.equal((await api(partA1.cookie, 'PUT', `/events/${evA}/profile`, { ...baseProfile, consentVersion: '' })).status, 400)
    assert.equal((await api(partB1.cookie, 'PUT', `/events/${evA}/profile`, baseProfile)).status, 404)
    assert.equal((await api(partA1.cookie, 'PUT', `/events/${evA}/profile`, { ...baseProfile, name: 'Alice A1', goal: 'find_job' })).status, 200)
    assert.equal((await api(partA2.cookie, 'PUT', `/events/${evA}/profile`, { ...baseProfile, name: 'Bob A2', goal: 'hire', visible: false })).status, 200)
    assert.equal((await api(partA3.cookie, 'PUT', `/events/${evA}/profile`, { ...baseProfile, name: 'Charlie A3', goal: 'hire', visible: true })).status, 200)
    assert.equal((await api(partB1.cookie, 'PUT', `/events/${evB}/profile`, { ...baseProfile, name: 'Beta B1', goal: 'hire', visible: true })).status, 200)

    const boothPub = await api(orgA.cookie, 'POST', `/events/${evA}/booths`, { name: 'Public Booth', description: 'Open', topics: ['AI'], published: true })
    const boothPriv = await api(orgA.cookie, 'POST', `/events/${evA}/booths`, { name: 'Draft Booth', description: 'Hidden', topics: ['AI'], published: false })
    const boothB = await api(orgB.cookie, 'POST', `/events/${evB}/booths`, { name: 'Event B Booth', description: 'B', topics: ['AI'], published: true })
    assert.equal(boothPub.status, 201)
    assert.equal(boothPriv.status, 201)
    assert.equal(boothB.status, 201)

    // Organizer sees draft+published booths; participant sees published only and gets 403 on write; orgB gets 404
    const orgBooths = await api(orgA.cookie, 'GET', `/events/${evA}/booths`)
    const partBooths = await api(partA1.cookie, 'GET', `/events/${evA}/booths`)
    assert.equal(orgBooths.body.items.length, 2)
    assert.deepEqual(partBooths.body.items.map((b) => b.id), [boothPub.body.id])
    assert.equal((await api(partA1.cookie, 'POST', `/events/${evA}/booths`, { name: 'X', topics: ['AI'] })).status, 403)
    assert.equal((await api(partA1.cookie, 'PATCH', `/events/${evA}/booths/${boothPub.body.id}`, { name: 'X' })).status, 403)
    assert.equal((await api(orgB.cookie, 'GET', `/events/${evA}/booths`)).status, 404)
    assert.equal((await api(orgA.cookie, 'PATCH', `/events/${evA}/booths/${boothB.body.id}`, { name: 'CrossEvent' })).status, 404)

    // Organizer members & interests access checks + no PII leakage
    assert.equal((await api(partA1.cookie, 'GET', `/events/${evA}/members`)).status, 403)
    assert.equal((await api(partA1.cookie, 'GET', `/events/${evA}/interests`)).status, 403)
    assert.equal((await api(orgB.cookie, 'GET', `/events/${evA}/members`)).status, 404)
    assert.equal((await api(orgB.cookie, 'GET', `/events/${evA}/interests`)).status, 404)
    const membersRes = await api(orgA.cookie, 'GET', `/events/${evA}/members`)
    assert.equal(membersRes.status, 200)
    assert.equal(membersRes.raw.includes('email'), false)
    assert.equal(membersRes.raw.includes('passwordHash'), false)
    assert.equal(membersRes.raw.includes('Bob A2'), false) // hidden profile name stays hidden when visible=false
    const bobMember = membersRes.body.items.find((m) => m.userId === partA2.id)
    assert.equal(bobMember?.name, partA2.username)
    assert.equal(bobMember?.username, partA2.username)

    // 4. Recommendations & Mutual-Consent Contact Privacy & Blocks & Moderation
    assert.equal((await api(partB1.cookie, 'GET', `/events/${evA}/recommendations`)).status, 404)
    const recs1 = await api(partA1.cookie, 'GET', `/events/${evA}/recommendations`)
    assert.equal(recs1.status, 200)
    assert.deepEqual(recs1.body.items.map((r) => r.candidate.id), [partA3.id]) // partA2 is visible:false, partB1 is in Event B
    assert.equal(recs1.raw.includes('email'), false)
    assert.equal(recs1.raw.includes(secretContacts[0]), false)

    // Reveal partA2, set private contacts, create introduction
    assert.equal((await api(partA2.cookie, 'PUT', `/events/${evA}/profile`, { ...baseProfile, name: 'Bob A2', goal: 'hire', visible: true })).status, 200)
    assert.equal((await api(partA1.cookie, 'PUT', '/me/contact', { value: secretContacts[0] })).status, 204)
    assert.equal((await api(partA2.cookie, 'PUT', '/me/contact', { value: secretContacts[1] })).status, 204)

    const intro = await api(partA1.cookie, 'POST', `/events/${evA}/introductions`, { recipientId: partA2.id })
    assert.equal(intro.status, 201)
    assert.equal(intro.body.contact, null) // contact hidden before mutual acceptance
    assert.equal((await api(partA1.cookie, 'PATCH', `/events/${evA}/introductions/${intro.body.id}`, { status: 'accepted' })).status, 403)
    assert.equal((await api(partA3.cookie, 'GET', `/events/${evA}/introductions/${intro.body.id}`)).status, 404)
    assert.equal((await api(orgB.cookie, 'GET', `/events/${evA}/introductions/${intro.body.id}`)).status, 404)
    assert.equal((await api(partB1.cookie, 'POST', `/events/${evA}/introductions`, { recipientId: partA2.id })).status, 404)

    const accepted = await api(partA2.cookie, 'PATCH', `/events/${evA}/introductions/${intro.body.id}`, { status: 'accepted' })
    assert.equal(accepted.status, 200)
    assert.equal(accepted.body.contact, secretContacts[0])
    assert.equal((await api(partA1.cookie, 'GET', `/events/${evA}/introductions/${intro.body.id}`)).body.contact, secretContacts[1])

    // Blocking hides intro + contact + recommendations immediately
    assert.equal((await api(partA1.cookie, 'PUT', `/events/${evA}/blocks/${partA1.id}`)).status, 400)
    assert.equal((await api(partA1.cookie, 'PUT', `/events/${evA}/blocks/${partB1.id}`)).status, 404)
    assert.equal((await api(partA2.cookie, 'PUT', `/events/${evA}/blocks/${partA1.id}`)).status, 204)
    assert.equal((await api(partA1.cookie, 'GET', `/events/${evA}/introductions/${intro.body.id}`)).status, 404)
    assert.deepEqual((await api(partA1.cookie, 'GET', `/events/${evA}/introductions`)).body.items, [])
    assert.deepEqual((await api(partA1.cookie, 'GET', `/events/${evA}/recommendations`)).body.items.map((r) => r.candidate.id), [partA3.id])

    // Moderation reports & organizer restrict action
    assert.equal((await api(partA1.cookie, 'POST', `/events/${evA}/reports`, { subjectId: partA1.id, reason: 'spam', details: 'self' })).status, 400)
    assert.equal((await api(partA1.cookie, 'POST', `/events/${evA}/reports`, { subjectId: partB1.id, reason: 'spam', details: 'other event' })).status, 404)
    const reportRes = await api(partA1.cookie, 'POST', `/events/${evA}/reports`, { subjectId: partA3.id, reason: 'spam', details: 'bad message' })
    assert.equal(reportRes.status, 201)
    assert.equal((await api(partA1.cookie, 'GET', `/events/${evA}/reports`)).status, 403)
    assert.equal((await api(partA1.cookie, 'PATCH', `/events/${evA}/reports/${reportRes.body.id}`, { status: 'resolved', action: 'dismiss' })).status, 403)
    assert.equal((await api(orgB.cookie, 'GET', `/events/${evA}/reports`)).status, 404)
    assert.equal((await api(orgB.cookie, 'PATCH', `/events/${evA}/reports/${reportRes.body.id}`, { status: 'resolved', action: 'dismiss' })).status, 404)
    assert.equal((await api(orgA.cookie, 'PATCH', `/events/${evA}/reports/${reportRes.body.id}`, { status: 'resolved', action: 'restrict' })).status, 200)
    assert.deepEqual((await api(partA1.cookie, 'GET', `/events/${evA}/recommendations`)).body.items, [])
    assert.equal((await api(partA1.cookie, 'POST', `/events/${evA}/introductions`, { recipientId: partA3.id })).status, 404)

    // 5. Event closing blocks subsequent organizer & participant mutations
    assert.equal((await api(partA1.cookie, 'PATCH', `/events/${evA}`, { status: 'closed' })).status, 403)
    assert.equal((await api(orgB.cookie, 'PATCH', `/events/${evA}`, { status: 'closed' })).status, 404)
    assert.equal((await api(orgA.cookie, 'PATCH', `/events/${evA}`, { status: 'closed' })).status, 200)
    assert.equal((await api(partA1.cookie, 'PUT', `/events/${evA}/profile`, baseProfile)).status, 409)
    assert.equal((await api(orgA.cookie, 'POST', `/events/${evA}/invites`, { expiresAt: inviteExp })).status, 409)
    assert.equal((await api(orgA.cookie, 'POST', `/events/${evA}/booths`, { name: 'AfterClose', topics: ['AI'] })).status, 409)
    assert.equal((await api(partA1.cookie, 'POST', `/events/${evA}/introductions`, { recipientId: partA2.id })).status, 409)

    // 5b. Admin dashboard access controls & PII hygiene
    assert.equal((await api(null, 'GET', '/admin/overview')).status, 401)
    assert.equal((await api(partA1.cookie, 'GET', '/admin/overview')).status, 403)
    assert.equal((await api(partA1.cookie, 'PATCH', `/admin/users/${partA3.id}`, { canCreateEvents: true })).status, 403)
    const overview = await api(orgA.cookie, 'GET', '/admin/overview')
    assert.equal(overview.status, 200)
    assert.ok(overview.body.stats.usersCount >= 6)
    assert.ok(overview.body.events.length >= 2)
    assert.equal(overview.raw.includes('email'), false)
    assert.equal(overview.raw.includes('passwordHash'), false)
    for (const c of secretContacts) assert.equal(overview.raw.includes(c), false)
    const promoted = await api(orgA.cookie, 'PATCH', `/admin/users/${partB1.id}`, { canCreateEvents: true })
    assert.equal(promoted.status, 200)
    assert.equal(promoted.body.canCreateEvents, true)
    assert.equal((await api(orgA.cookie, 'PATCH', `/admin/users/${partB1.id}`, { canCreateEvents: false })).status, 200)

    // 6. Log secret/PII redaction and sanitized 500 error check (CI handler mode)
    if (!env.isLive) {
      env.setFailure(true)
      const crashRes = await api(orgA.cookie, 'GET', '/me')
      env.setFailure(false)
      assert.equal(crashRes.status, 500)
      assert.equal(crashRes.body.error.code, 'internal_error')
      assert.ok(crashRes.body.error.requestId)
      assert.equal(crashRes.raw.includes('secret_db_pw'), false)

      const joinedLogs = env.logs.join('\n')
      assert.equal(joinedLogs.includes('secret_db_pw'), false)
      for (const secret of [...secretPasswords, ...secretTokens, ...secretContacts]) {
        assert.equal(joinedLogs.includes(secret), false, `Secret/PII leaked in logs: ${secret}`)
      }
    }
  } finally {
    await env.close()
  }
})
