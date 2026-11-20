import { pool } from './db.js'

try {
  const login = process.argv[2]?.trim().toLowerCase()
  if (!login) throw new Error('Usage: node dist/grant-organizer.js username-or-verified-email')
  const result = await pool.query('UPDATE users SET can_create_events=true WHERE username=$1 OR email=$1', [login])
  if (!result.rowCount) throw new Error('Account not found')
  console.log('Organizer permission granted')
} finally { await pool.end() }
