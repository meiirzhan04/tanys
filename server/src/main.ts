import { createServer } from 'node:http'
import { readdir } from 'node:fs/promises'
import { pool } from './db.js'

const migrations = (await readdir(new URL('../migrations/', import.meta.url))).filter(name => name.endsWith('.sql'))
const server = createServer(async (request, response) => {
  let status = 404
  let message = 'not_found'
  if (request.method === 'GET' && request.url === '/health') {
    status = 200
    message = 'alive'
  }
  if (request.method === 'GET' && request.url === '/ready') {
    try {
      const result = await pool.query('SELECT name FROM schema_migrations WHERE name = ANY($1::text[])', [migrations])
      if (result.rowCount !== migrations.length) throw new Error('Pending migrations')
      status = 200
      message = 'ready'
    } catch {
      status = 503
      message = 'unavailable'
    }
  }
  response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
  response.end(JSON.stringify({ status: message }))
})
server.listen(Number(process.env.PORT || 3000), '0.0.0.0')
process.on('SIGTERM', () => server.close(() => void pool.end()))
