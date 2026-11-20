import { pool } from './db.js'

try {
  const email = process.argv[2]?.trim().toLowerCase()
  if (!email) throw new Error('Usage: node dist/grant-organizer.js verified-email')
  const result = await pool.query('UPDATE users SET can_create_events=true WHERE email=$1', [email])
  if (!result.rowCount) throw new Error('Verified account not found')
  console.log('Organizer permission granted')
} finally { await pool.end() }
