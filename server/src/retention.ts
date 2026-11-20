import type pg from 'pg'

export interface RetentionPurgeOptions {
  now?: Date
  closedEventRetentionDays?: number
  moderationRetentionDays?: number
  challengeRetentionHours?: number
  tombstoneRetentionDays?: number
}

export interface RetentionPurgeReport {
  purgedAt: string
  challengesPurged: number
  sessionsPurged: number
  closedEventsPurged: number
  profilesPurged: number
  membershipsPurged: number
  moderationReportsPurged: number
  moderationActionsPurged: number
  tombstonesRotated: number
}

type Queryable = {
  query: (text: string, values?: unknown[]) => Promise<{ rowCount?: number | null; rows: any[] }>
}

/**
 * Permanently deletes a user account and associated personal data across all events,
 * immediately revokes all active sessions, and appends a minimal PII-free tombstone
 * to ensure restored backups can re-apply deletions (Issue #57).
 */
export async function deleteUserAccount(
  userId: string,
  clientOrPool: Queryable,
): Promise<{ deleted: boolean; userId: string }> {
  // 1. Record minimal PII-free tombstone for audit and backup replay
  await clientOrPool.query(
    `INSERT INTO deleted_account_tombstones(user_id, deleted_at)
     VALUES($1, now())
     ON CONFLICT (user_id) DO NOTHING`,
    [userId],
  )

  // 2. Fetch email to purge unverified challenges
  const userRes = await clientOrPool.query('SELECT email FROM users WHERE id = $1', [userId])
  const email = userRes.rows[0]?.email

  // 3. Immediately revoke all active sessions
  await clientOrPool.query('DELETE FROM sessions WHERE user_id = $1', [userId])

  // 4. Revoke and delete pending auth challenges
  if (email) {
    await clientOrPool.query('DELETE FROM auth_challenges WHERE email = $1', [email])
  }

  // 5. Clean up contacts, meetings, introductions, availability, and feedback tables from migrations 008-010
  const dynamicTables = [
    { name: 'user_contacts', query: 'DELETE FROM user_contacts WHERE user_id = $1' },
    {
      name: 'meetings',
      query:
        'DELETE FROM meetings WHERE proposer = $1 OR introduction_id IN (SELECT id FROM introductions WHERE sender = $1 OR recipient = $1)',
    },
    { name: 'introductions', query: 'DELETE FROM introductions WHERE sender = $1 OR recipient = $1' },
    { name: 'availability', query: 'DELETE FROM availability WHERE user_id = $1' },
    { name: 'event_feedback', query: 'DELETE FROM event_feedback WHERE user_id = $1 OR candidate_id = $1' },
  ]
  for (const dt of dynamicTables) {
    const reg = await clientOrPool.query(`SELECT to_regclass('public.${dt.name}') IS NOT NULL AS exists`)
    if (reg.rows[0]?.exists) {
      await clientOrPool.query(dt.query, [userId])
    }
  }

  // 6. Delete participant profile and memberships across events
  await clientOrPool.query('DELETE FROM event_profiles WHERE user_id = $1', [userId])
  await clientOrPool.query('DELETE FROM memberships WHERE user_id = $1', [userId])

  // 7. Delete blocks and restrictions
  await clientOrPool.query('DELETE FROM event_blocks WHERE blocker_id = $1 OR blocked_id = $1', [userId])
  await clientOrPool.query('DELETE FROM event_restrictions WHERE user_id = $1 OR restricted_by = $1', [userId])

  // 8. Delete moderation records associated with the user
  await clientOrPool.query('DELETE FROM event_reports WHERE reporter_id = $1 OR subject_id = $1', [userId])
  await clientOrPool.query('UPDATE event_reports SET resolved_by = NULL WHERE resolved_by = $1', [userId])
  await clientOrPool.query('DELETE FROM moderation_actions WHERE moderator_id = $1 OR subject_id = $1', [userId])

  // 9. Delete user record
  await clientOrPool.query('DELETE FROM users WHERE id = $1', [userId])

  return { deleted: true, userId }
}

/**
 * Replays deletions for accounts that were previously deleted but reappeared in a database
 * restored from an earlier backup, honoring user deletion requests without PII leakage (#57).
 */
export async function replayDeletedTombstones(
  clientOrPool: Queryable,
): Promise<{ replayedCount: number; userIds: string[] }> {
  const result = await clientOrPool.query(
    `SELECT t.user_id AS "userId"
     FROM deleted_account_tombstones t
     JOIN users u ON u.id = t.user_id`,
  )
  const userIds: string[] = result.rows.map(row => row.userId)
  for (const uid of userIds) {
    await deleteUserAccount(uid, clientOrPool)
  }
  return { replayedCount: userIds.length, userIds }
}

/**
 * Periodically purges expired challenges (<= 24h), expired sessions,
 * participant data from closed events (<= 30d after closed_at/ends_at),
 * moderation logs from closed events (<= 90d), and rotates tombstones (<= 30d).
 * Safe, idempotent, and non-destructive to active events.
 */
export async function purgeExpiredData(
  clientOrPool: Queryable,
  options: RetentionPurgeOptions = {},
): Promise<RetentionPurgeReport> {
  const now = options.now ?? new Date()
  const challengeHours = options.challengeRetentionHours ?? 24
  const closedEventDays = options.closedEventRetentionDays ?? 30
  const moderationDays = options.moderationRetentionDays ?? 90
  const tombstoneDays = options.tombstoneRetentionDays ?? 30

  const challengeCutoff = new Date(now.getTime() - challengeHours * 60 * 60 * 1000)
  const closedEventCutoff = new Date(now.getTime() - closedEventDays * 24 * 60 * 60 * 1000)
  const moderationCutoff = new Date(now.getTime() - moderationDays * 24 * 60 * 60 * 1000)
  const tombstoneCutoff = new Date(now.getTime() - tombstoneDays * 24 * 60 * 60 * 1000)

  // 1. Purge expired auth challenges older than challengeCutoff
  const chgRes = await clientOrPool.query(
    'DELETE FROM auth_challenges WHERE created_at < $1 OR expires_at < $1',
    [challengeCutoff],
  )
  const challengesPurged = chgRes.rowCount ?? 0

  // 2. Purge expired sessions
  const sessRes = await clientOrPool.query(
    'DELETE FROM sessions WHERE expires_at <= $1',
    [now],
  )
  const sessionsPurged = sessRes.rowCount ?? 0

  // 3. Purge participant data for closed events older than closedEventDays
  const closedEventsRes = await clientOrPool.query(
    `SELECT id FROM events
     WHERE status = 'closed'
       AND COALESCE(closed_at, ends_at) < $1`,
    [closedEventCutoff],
  )
  const closedEventIds: string[] = closedEventsRes.rows.map(r => r.id)
  let profilesPurged = 0
  let membershipsPurged = 0

  if (closedEventIds.length > 0) {
    const profRes = await clientOrPool.query(
      'DELETE FROM event_profiles WHERE event_id = ANY($1::uuid[])',
      [closedEventIds],
    )
    profilesPurged = profRes.rowCount ?? 0

    const memRes = await clientOrPool.query(
      "DELETE FROM memberships WHERE event_id = ANY($1::uuid[]) AND role = 'participant'",
      [closedEventIds],
    )
    membershipsPurged = memRes.rowCount ?? 0

    await clientOrPool.query(
      'DELETE FROM event_invites WHERE event_id = ANY($1::uuid[])',
      [closedEventIds],
    )
    await clientOrPool.query(
      'DELETE FROM event_blocks WHERE event_id = ANY($1::uuid[])',
      [closedEventIds],
    )
    await clientOrPool.query(
      'DELETE FROM event_restrictions WHERE event_id = ANY($1::uuid[])',
      [closedEventIds],
    )

    const dynamicTables = [
      {
        name: 'meetings',
        query: 'DELETE FROM meetings WHERE introduction_id IN (SELECT id FROM introductions WHERE event_id = ANY($1::uuid[]))',
      },
      { name: 'introductions', query: 'DELETE FROM introductions WHERE event_id = ANY($1::uuid[])' },
      { name: 'availability', query: 'DELETE FROM availability WHERE event_id = ANY($1::uuid[])' },
      { name: 'event_feedback', query: 'DELETE FROM event_feedback WHERE event_id = ANY($1::uuid[])' },
    ]
    for (const dt of dynamicTables) {
      const reg = await clientOrPool.query(`SELECT to_regclass('public.${dt.name}') IS NOT NULL AS exists`)
      if (reg.rows[0]?.exists) {
        await clientOrPool.query(dt.query, [closedEventIds])
      }
    }

    await clientOrPool.query(
      'UPDATE events SET data_purged_at = $1 WHERE id = ANY($2::uuid[])',
      [now, closedEventIds],
    )
  }

  // 4. Purge moderation logs for closed events older than moderationDays
  const modEventsRes = await clientOrPool.query(
    `SELECT id FROM events
     WHERE status = 'closed'
       AND COALESCE(closed_at, ends_at) < $1`,
    [moderationCutoff],
  )
  const modEventIds: string[] = modEventsRes.rows.map(r => r.id)
  let moderationReportsPurged = 0
  let moderationActionsPurged = 0

  if (modEventIds.length > 0) {
    const repRes = await clientOrPool.query(
      'DELETE FROM event_reports WHERE event_id = ANY($1::uuid[])',
      [modEventIds],
    )
    moderationReportsPurged = repRes.rowCount ?? 0

    const actRes = await clientOrPool.query(
      'DELETE FROM moderation_actions WHERE event_id = ANY($1::uuid[])',
      [modEventIds],
    )
    moderationActionsPurged = actRes.rowCount ?? 0
  }

  // 5. Rotate tombstones older than tombstoneDays
  const tombRes = await clientOrPool.query(
    'DELETE FROM deleted_account_tombstones WHERE deleted_at < $1',
    [tombstoneCutoff],
  )
  const tombstonesRotated = tombRes.rowCount ?? 0

  return {
    purgedAt: now.toISOString(),
    challengesPurged,
    sessionsPurged,
    closedEventsPurged: closedEventIds.length,
    profilesPurged,
    membershipsPurged,
    moderationReportsPurged,
    moderationActionsPurged,
    tombstonesRotated,
  }
}

/**
 * Starts unref'd periodic background retention purge on the active process.
 */
export function startPeriodicRetention(poolInstance: pg.Pool, intervalMs = 60 * 60 * 1000): NodeJS.Timeout {
  const timer = setInterval(async () => {
    try {
      await purgeExpiredData(poolInstance)
    } catch (err) {
      console.error('Periodic retention purge failed:', err)
    }
  }, intervalMs)
  timer.unref()
  return timer
}
