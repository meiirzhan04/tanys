import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  deleteUserAccount,
  purgeExpiredData,
  replayDeletedTombstones,
} from '../dist/retention.js'

/**
 * Creates an in-memory SQL database simulator implementing query()
 * with tables and constraints matching Tanys PostgreSQL migrations.
 */
function createMockDb() {
  const tables = {
    users: new Map(), // id -> { id, email, contact, can_create_events, created_at }
    sessions: new Map(), // digest -> { digest, user_id, expires_at, created_at }
    auth_challenges: new Map(), // id -> { id, email, source_hash, purpose, digest, created_at, expires_at, attempts, used }
    events: new Map(), // id -> { id, name, time_zone, starts_at, ends_at, status, closed_at, data_purged_at }
    memberships: new Map(), // `${event_id}:${user_id}` -> { event_id, user_id, role }
    event_profiles: new Map(), // `${event_id}:${user_id}` -> { event_id, user_id, name, visible, ... }
    event_invites: new Map(), // id -> { id, event_id, digest, expires_at, revoked }
    event_blocks: new Map(), // `${event_id}:${blocker_id}:${blocked_id}` -> { event_id, blocker_id, blocked_id }
    event_restrictions: new Map(), // `${event_id}:${user_id}` -> { event_id, user_id, reason, restricted_by }
    event_reports: new Map(), // id -> { id, event_id, reporter_id, subject_id, reason, details, status, action, resolved_by }
    moderation_actions: new Map(), // id -> { id, event_id, report_id, moderator_id, subject_id, action }
    deleted_account_tombstones: new Map(), // user_id -> { user_id, deleted_at }
  }

  const db = {
    tables,
    async query(sql, params = []) {
      const trimmed = sql.trim()

      // to_regclass check
      if (/to_regclass/i.test(trimmed)) {
        return { rows: [{ exists: false }] }
      }

      // INSERT INTO deleted_account_tombstones
      if (/^INSERT INTO deleted_account_tombstones/i.test(trimmed)) {
        const [userId] = params
        if (!tables.deleted_account_tombstones.has(userId)) {
          tables.deleted_account_tombstones.set(userId, { user_id: userId, deleted_at: new Date() })
        }
        return { rowCount: 1, rows: [] }
      }

      // SELECT email FROM users WHERE id = $1
      if (/^SELECT email FROM users WHERE id = \$1/i.test(trimmed)) {
        const u = tables.users.get(params[0])
        return { rowCount: u ? 1 : 0, rows: u ? [{ email: u.email }] : [] }
      }

      // DELETE FROM sessions WHERE user_id = $1
      if (/^DELETE FROM sessions WHERE user_id = \$1/i.test(trimmed)) {
        let count = 0
        for (const [digest, s] of tables.sessions) {
          if (s.user_id === params[0]) {
            tables.sessions.delete(digest)
            count += 1
          }
        }
        return { rowCount: count, rows: [] }
      }

      // DELETE FROM auth_challenges WHERE email = $1
      if (/^DELETE FROM auth_challenges WHERE email = \$1/i.test(trimmed)) {
        let count = 0
        for (const [id, chg] of tables.auth_challenges) {
          if (chg.email === params[0]) {
            tables.auth_challenges.delete(id)
            count += 1
          }
        }
        return { rowCount: count, rows: [] }
      }

      // DELETE FROM event_profiles WHERE user_id = $1
      if (/^DELETE FROM event_profiles WHERE user_id = \$1/i.test(trimmed)) {
        let count = 0
        for (const [key, p] of tables.event_profiles) {
          if (p.user_id === params[0]) {
            tables.event_profiles.delete(key)
            count += 1
          }
        }
        return { rowCount: count, rows: [] }
      }

      // DELETE FROM memberships WHERE user_id = $1
      if (/^DELETE FROM memberships WHERE user_id = \$1/i.test(trimmed)) {
        let count = 0
        for (const [key, m] of tables.memberships) {
          if (m.user_id === params[0]) {
            tables.memberships.delete(key)
            count += 1
          }
        }
        return { rowCount: count, rows: [] }
      }

      // DELETE FROM event_blocks WHERE blocker_id = $1 OR blocked_id = $1
      if (/^DELETE FROM event_blocks WHERE blocker_id = \$1 OR blocked_id = \$1/i.test(trimmed)) {
        let count = 0
        for (const [key, b] of tables.event_blocks) {
          if (b.blocker_id === params[0] || b.blocked_id === params[0]) {
            tables.event_blocks.delete(key)
            count += 1
          }
        }
        return { rowCount: count, rows: [] }
      }

      // DELETE FROM event_restrictions WHERE user_id = $1 OR restricted_by = $1
      if (/^DELETE FROM event_restrictions WHERE user_id = \$1 OR restricted_by = \$1/i.test(trimmed)) {
        let count = 0
        for (const [key, r] of tables.event_restrictions) {
          if (r.user_id === params[0] || r.restricted_by === params[0]) {
            tables.event_restrictions.delete(key)
            count += 1
          }
        }
        return { rowCount: count, rows: [] }
      }

      // DELETE FROM event_reports WHERE reporter_id = $1 OR subject_id = $1
      if (/^DELETE FROM event_reports WHERE reporter_id = \$1 OR subject_id = \$1/i.test(trimmed)) {
        let count = 0
        for (const [id, rep] of tables.event_reports) {
          if (rep.reporter_id === params[0] || rep.subject_id === params[0]) {
            tables.event_reports.delete(id)
            count += 1
          }
        }
        return { rowCount: count, rows: [] }
      }

      // UPDATE event_reports SET resolved_by = NULL WHERE resolved_by = $1
      if (/^UPDATE event_reports SET resolved_by = NULL WHERE resolved_by = \$1/i.test(trimmed)) {
        let count = 0
        for (const rep of tables.event_reports.values()) {
          if (rep.resolved_by === params[0]) {
            rep.resolved_by = null
            count += 1
          }
        }
        return { rowCount: count, rows: [] }
      }

      // DELETE FROM moderation_actions WHERE moderator_id = $1 OR subject_id = $1
      if (/^DELETE FROM moderation_actions WHERE moderator_id = \$1 OR subject_id = \$1/i.test(trimmed)) {
        let count = 0
        for (const [id, act] of tables.moderation_actions) {
          if (act.moderator_id === params[0] || act.subject_id === params[0]) {
            tables.moderation_actions.delete(id)
            count += 1
          }
        }
        return { rowCount: count, rows: [] }
      }

      // DELETE FROM users WHERE id = $1
      if (/^DELETE FROM users WHERE id = \$1/i.test(trimmed)) {
        const deleted = tables.users.delete(params[0])
        return { rowCount: deleted ? 1 : 0, rows: [] }
      }

      // SELECT t.user_id FROM deleted_account_tombstones t JOIN users u ON u.id = t.user_id
      if (/FROM deleted_account_tombstones/i.test(trimmed) && /JOIN users/i.test(trimmed)) {
        const rows = []
        for (const [uid] of tables.deleted_account_tombstones) {
          if (tables.users.has(uid)) rows.push({ userId: uid })
        }
        return { rowCount: rows.length, rows }
      }

      // DELETE FROM auth_challenges WHERE created_at < $1 OR expires_at < $1
      if (/DELETE FROM auth_challenges WHERE created_at < \$1 OR expires_at < \$1/i.test(trimmed)) {
        const cutoff = params[0]
        let count = 0
        for (const [id, chg] of tables.auth_challenges) {
          if (chg.created_at < cutoff || chg.expires_at < cutoff) {
            tables.auth_challenges.delete(id)
            count += 1
          }
        }
        return { rowCount: count, rows: [] }
      }

      // DELETE FROM sessions WHERE expires_at <= $1
      if (/DELETE FROM sessions WHERE expires_at <= \$1/i.test(trimmed)) {
        const now = params[0]
        let count = 0
        for (const [digest, s] of tables.sessions) {
          if (s.expires_at <= now) {
            tables.sessions.delete(digest)
            count += 1
          }
        }
        return { rowCount: count, rows: [] }
      }

      // SELECT id FROM events WHERE status = 'closed' AND COALESCE(closed_at, ends_at) < $1
      if (/SELECT id FROM events/i.test(trimmed) && /status = 'closed'/i.test(trimmed)) {
        const cutoff = params[0]
        const rows = []
        for (const [id, ev] of tables.events) {
          if (ev.status === 'closed') {
            const closedTime = ev.closed_at || ev.ends_at
            if (closedTime < cutoff) rows.push({ id })
          }
        }
        return { rowCount: rows.length, rows }
      }

      // DELETE FROM event_profiles WHERE event_id = ANY($1::uuid[])
      if (/DELETE FROM event_profiles WHERE event_id = ANY/i.test(trimmed)) {
        const eventIds = new Set(params[0])
        let count = 0
        for (const [key, p] of tables.event_profiles) {
          if (eventIds.has(p.event_id)) {
            tables.event_profiles.delete(key)
            count += 1
          }
        }
        return { rowCount: count, rows: [] }
      }

      // DELETE FROM memberships WHERE event_id = ANY($1::uuid[]) AND role = 'participant'
      if (/DELETE FROM memberships WHERE event_id = ANY/i.test(trimmed)) {
        const eventIds = new Set(params[0])
        let count = 0
        for (const [key, m] of tables.memberships) {
          if (eventIds.has(m.event_id) && m.role === 'participant') {
            tables.memberships.delete(key)
            count += 1
          }
        }
        return { rowCount: count, rows: [] }
      }

      // DELETE FROM event_invites WHERE event_id = ANY($1::uuid[])
      if (/DELETE FROM event_invites WHERE event_id = ANY/i.test(trimmed)) {
        const eventIds = new Set(params[0])
        let count = 0
        for (const [id, inv] of tables.event_invites) {
          if (eventIds.has(inv.event_id)) {
            tables.event_invites.delete(id)
            count += 1
          }
        }
        return { rowCount: count, rows: [] }
      }

      // DELETE FROM event_blocks WHERE event_id = ANY($1::uuid[])
      if (/DELETE FROM event_blocks WHERE event_id = ANY/i.test(trimmed)) {
        const eventIds = new Set(params[0])
        let count = 0
        for (const [key, b] of tables.event_blocks) {
          if (eventIds.has(b.event_id)) {
            tables.event_blocks.delete(key)
            count += 1
          }
        }
        return { rowCount: count, rows: [] }
      }

      // DELETE FROM event_restrictions WHERE event_id = ANY($1::uuid[])
      if (/DELETE FROM event_restrictions WHERE event_id = ANY/i.test(trimmed)) {
        const eventIds = new Set(params[0])
        let count = 0
        for (const [key, r] of tables.event_restrictions) {
          if (eventIds.has(r.event_id)) {
            tables.event_restrictions.delete(key)
            count += 1
          }
        }
        return { rowCount: count, rows: [] }
      }

      // UPDATE events SET data_purged_at = $1 WHERE id = ANY($2::uuid[])
      if (/UPDATE events SET data_purged_at = \$1 WHERE id = ANY/i.test(trimmed)) {
        const now = params[0]
        const eventIds = new Set(params[1])
        for (const id of eventIds) {
          const ev = tables.events.get(id)
          if (ev) ev.data_purged_at = now
        }
        return { rowCount: eventIds.size, rows: [] }
      }

      // DELETE FROM event_reports WHERE event_id = ANY($1::uuid[])
      if (/DELETE FROM event_reports WHERE event_id = ANY/i.test(trimmed)) {
        const eventIds = new Set(params[0])
        let count = 0
        for (const [id, r] of tables.event_reports) {
          if (eventIds.has(r.event_id)) {
            tables.event_reports.delete(id)
            count += 1
          }
        }
        return { rowCount: count, rows: [] }
      }

      // DELETE FROM moderation_actions WHERE event_id = ANY($1::uuid[])
      if (/DELETE FROM moderation_actions WHERE event_id = ANY/i.test(trimmed)) {
        const eventIds = new Set(params[0])
        let count = 0
        for (const [id, a] of tables.moderation_actions) {
          if (eventIds.has(a.event_id)) {
            tables.moderation_actions.delete(id)
            count += 1
          }
        }
        return { rowCount: count, rows: [] }
      }

      // DELETE FROM deleted_account_tombstones WHERE deleted_at < $1
      if (/DELETE FROM deleted_account_tombstones WHERE deleted_at < \$1/i.test(trimmed)) {
        const cutoff = params[0]
        let count = 0
        for (const [uid, t] of tables.deleted_account_tombstones) {
          if (t.deleted_at < cutoff) {
            tables.deleted_account_tombstones.delete(uid)
            count += 1
          }
        }
        return { rowCount: count, rows: [] }
      }

      return { rowCount: 0, rows: [] }
    },
  }

  return db
}

test('deleteUserAccount revokes sessions, purges profiles and records PII-free tombstone', async () => {
  const db = createMockDb()
  const userId = '11111111-1111-1111-1111-111111111111'
  const eventId = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'

  db.tables.users.set(userId, { id: userId, email: 'user@example.kz', contact: '+77011234567' })
  db.tables.sessions.set('sess-digest-1', { digest: 'sess-digest-1', user_id: userId, expires_at: new Date(Date.now() + 86400000) })
  db.tables.auth_challenges.set('chg-1', { id: 'chg-1', email: 'user@example.kz', created_at: new Date() })
  db.tables.memberships.set(`${eventId}:${userId}`, { event_id: eventId, user_id: userId, role: 'participant' })
  db.tables.event_profiles.set(`${eventId}:${userId}`, { event_id: eventId, user_id: userId, name: 'Participant', visible: true })
  db.tables.event_blocks.set(`${eventId}:${userId}:other`, { event_id: eventId, blocker_id: userId, blocked_id: 'other' })

  const result = await deleteUserAccount(userId, db)
  assert.equal(result.deleted, true)
  assert.equal(result.userId, userId)

  // Verify user is gone from active tables
  assert.equal(db.tables.users.has(userId), false)
  assert.equal(db.tables.sessions.size, 0)
  assert.equal(db.tables.auth_challenges.size, 0)
  assert.equal(db.tables.memberships.has(`${eventId}:${userId}`), false)
  assert.equal(db.tables.event_profiles.has(`${eventId}:${userId}`), false)
  assert.equal(db.tables.event_blocks.size, 0)

  // Verify tombstone is recorded without any PII (only user_id uuid and deleted_at)
  const tombstone = db.tables.deleted_account_tombstones.get(userId)
  assert.ok(tombstone)
  assert.equal(tombstone.user_id, userId)
  assert.equal(Object.keys(tombstone).sort().join(','), 'deleted_at,user_id')
})

test('repeated cleanup is safe and idempotent', async () => {
  const db = createMockDb()
  const userId = '22222222-2222-2222-2222-222222222222'
  db.tables.users.set(userId, { id: userId, email: 'twice@example.kz' })

  // First call
  const first = await deleteUserAccount(userId, db)
  assert.equal(first.deleted, true)

  // Repeated call on already deleted account must succeed cleanly
  const second = await deleteUserAccount(userId, db)
  assert.equal(second.deleted, true)
  assert.equal(db.tables.users.has(userId), false)
})

test('purgeExpiredData respects retention periods for challenges, sessions, closed events and tombstones', async () => {
  const db = createMockDb()
  const now = new Date('2026-11-20T12:00:00Z')

  // 1. Challenges: one fresh (2 hours old), one expired (26 hours old)
  db.tables.auth_challenges.set('fresh', {
    id: 'fresh',
    email: 'fresh@example.kz',
    created_at: new Date('2026-11-20T10:00:00Z'),
    expires_at: new Date('2026-11-20T10:15:00Z'),
  })
  db.tables.auth_challenges.set('expired', {
    id: 'expired',
    email: 'old@example.kz',
    created_at: new Date('2026-11-19T09:00:00Z'), // > 24h old
    expires_at: new Date('2026-11-19T09:15:00Z'),
  })

  // 2. Sessions: one active, one expired
  db.tables.sessions.set('active-session', {
    digest: 'act-1',
    user_id: 'u1',
    expires_at: new Date('2026-11-21T12:00:00Z'),
  })
  db.tables.sessions.set('expired-session', {
    digest: 'exp-1',
    user_id: 'u2',
    expires_at: new Date('2026-11-20T11:00:00Z'), // past
  })

  // 3. Events:
  // Event A: active event (never purged)
  db.tables.events.set('evt-active', {
    id: 'evt-active',
    status: 'active',
    ends_at: new Date('2026-11-25T12:00:00Z'),
  })
  db.tables.event_profiles.set('evt-active:u1', { event_id: 'evt-active', user_id: 'u1' })

  // Event B: closed recently (10 days ago, < 30 days retention cutoff)
  db.tables.events.set('evt-closed-recent', {
    id: 'evt-closed-recent',
    status: 'closed',
    closed_at: new Date('2026-11-10T12:00:00Z'),
    ends_at: new Date('2026-11-10T12:00:00Z'),
  })
  db.tables.event_profiles.set('evt-closed-recent:u2', { event_id: 'evt-closed-recent', user_id: 'u2' })

  // Event C: closed 35 days ago (> 30 days retention cutoff, <= 90 days)
  db.tables.events.set('evt-closed-old', {
    id: 'evt-closed-old',
    status: 'closed',
    closed_at: new Date('2026-10-15T12:00:00Z'), // 36 days ago
    ends_at: new Date('2026-10-15T12:00:00Z'),
  })
  db.tables.event_profiles.set('evt-closed-old:u3', { event_id: 'evt-closed-old', user_id: 'u3' })
  db.tables.memberships.set('evt-closed-old:u3', { event_id: 'evt-closed-old', user_id: 'u3', role: 'participant' })
  db.tables.event_reports.set('rep-c', { id: 'rep-c', event_id: 'evt-closed-old', reason: 'spam' })

  // Event D: closed 100 days ago (> 90 days moderation cutoff)
  db.tables.events.set('evt-closed-ancient', {
    id: 'evt-closed-ancient',
    status: 'closed',
    closed_at: new Date('2026-08-01T12:00:00Z'),
    ends_at: new Date('2026-08-01T12:00:00Z'),
  })
  db.tables.event_reports.set('rep-d', { id: 'rep-d', event_id: 'evt-closed-ancient', reason: 'harassment' })
  db.tables.moderation_actions.set('act-d', { id: 'act-d', event_id: 'evt-closed-ancient', action: 'restrict' })

  // 4. Tombstones: one fresh (5 days ago), one expired (35 days ago)
  db.tables.deleted_account_tombstones.set('tomb-fresh', {
    user_id: 'tomb-fresh',
    deleted_at: new Date('2026-11-15T12:00:00Z'),
  })
  db.tables.deleted_account_tombstones.set('tomb-expired', {
    user_id: 'tomb-expired',
    deleted_at: new Date('2026-10-10T12:00:00Z'),
  })

  // Run purge
  const report = await purgeExpiredData(db, { now })

  assert.equal(report.challengesPurged, 1)
  assert.equal(db.tables.auth_challenges.has('fresh'), true)
  assert.equal(db.tables.auth_challenges.has('expired'), false)

  assert.equal(report.sessionsPurged, 1)
  assert.equal(db.tables.sessions.has('active-session'), true)
  assert.equal(db.tables.sessions.has('expired-session'), false)

  assert.equal(report.closedEventsPurged, 2) // evt-closed-old and evt-closed-ancient
  // Active and recently closed event profiles are preserved
  assert.equal(db.tables.event_profiles.has('evt-active:u1'), true)
  assert.equal(db.tables.event_profiles.has('evt-closed-recent:u2'), true)
  // Old closed event participant profiles and memberships are purged
  assert.equal(db.tables.event_profiles.has('evt-closed-old:u3'), false)
  assert.equal(db.tables.memberships.has('evt-closed-old:u3'), false)

  // Moderation reports: Event C (< 90 days) preserved; Event D (> 90 days) purged
  assert.equal(db.tables.event_reports.has('rep-c'), true)
  assert.equal(db.tables.event_reports.has('rep-d'), false)
  assert.equal(db.tables.moderation_actions.has('act-d'), false)
  assert.equal(report.moderationReportsPurged, 1)
  assert.equal(report.moderationActionsPurged, 1)

  // Tombstones: fresh kept, old rotated
  assert.equal(db.tables.deleted_account_tombstones.has('tomb-fresh'), true)
  assert.equal(db.tables.deleted_account_tombstones.has('tomb-expired'), false)
  assert.equal(report.tombstonesRotated, 1)

  // Repeated run at same timestamp yields 0 deletions (idempotent)
  const repeatReport = await purgeExpiredData(db, { now })
  assert.equal(repeatReport.challengesPurged, 0)
  assert.equal(repeatReport.sessionsPurged, 0)
  assert.equal(repeatReport.profilesPurged, 0)
  assert.equal(repeatReport.moderationReportsPurged, 0)
  assert.equal(repeatReport.tombstonesRotated, 0)
})

test('replayDeletedTombstones applies deletions to restored database backups', async () => {
  const db = createMockDb()
  const restoredUserId = 'restored-user-999'

  // Tombstone was created when user requested deletion earlier
  db.tables.deleted_account_tombstones.set(restoredUserId, {
    user_id: restoredUserId,
    deleted_at: new Date('2026-11-18T10:00:00Z'),
  })

  // Now an older database dump is restored, bringing back the user's records
  db.tables.users.set(restoredUserId, { id: restoredUserId, email: 'restored@example.kz' })
  db.tables.sessions.set('restored-session', { digest: 'restored-session', user_id: restoredUserId })
  db.tables.event_profiles.set(`evt-1:${restoredUserId}`, { event_id: 'evt-1', user_id: restoredUserId })

  // Replay tombstones across restored data
  const replay = await replayDeletedTombstones(db)
  assert.equal(replay.replayedCount, 1)
  assert.deepEqual(replay.userIds, [restoredUserId])

  // Restored personal data is wiped clean
  assert.equal(db.tables.users.has(restoredUserId), false)
  assert.equal(db.tables.sessions.has('restored-session'), false)
  assert.equal(db.tables.event_profiles.has(`evt-1:${restoredUserId}`), false)

  // Second replay finds 0 restored records (safe & idempotent)
  const secondReplay = await replayDeletedTombstones(db)
  assert.equal(secondReplay.replayedCount, 0)
})
