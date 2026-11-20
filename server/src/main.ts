import { createServer } from 'node:http'
import { pool } from './db.js'
import { handler } from './handler.js'

const server = createServer(handler)
server.listen(Number(process.env.PORT || 3000), '0.0.0.0')
process.on('SIGTERM', () => server.close(() => void pool.end()))
