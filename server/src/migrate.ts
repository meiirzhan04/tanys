import { readdir, readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { pool } from './db.js'

const directory = new URL('../migrations/', import.meta.url)
const client = await pool.connect()
try {
  await client.query('BEGIN')
  await client.query('SELECT pg_advisory_xact_lock(8173492)')
  await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, checksum text NOT NULL)')
  for (const name of (await readdir(directory)).filter(name => name.endsWith('.sql')).sort()) {
    const sql = await readFile(new URL(name, directory), 'utf8')
    const checksum = createHash('sha256').update(sql.replaceAll('\r\n', '\n')).digest('hex')
    const applied = await client.query('SELECT checksum FROM schema_migrations WHERE name=$1', [name])
    if (applied.rowCount) {
      if (applied.rows[0].checksum !== checksum) throw new Error('Modified migration: ' + name)
      continue
    }
    await client.query(sql)
    await client.query('INSERT INTO schema_migrations VALUES ($1,$2)', [name, checksum])
    console.log('Applied', name)
  }
  await client.query('COMMIT')
} catch (error) {
  await client.query('ROLLBACK')
  throw error
} finally {
  client.release()
  await pool.end()
}
