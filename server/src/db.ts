import pg from 'pg'

const connectionString = process.env.DATABASE_URL || 'postgres://localhost/tanys'

export const pool = new pg.Pool({ connectionString, max: process.env.VERCEL ? 2 : 10, idleTimeoutMillis: 10000, connectionTimeoutMillis: 3000 })
pool.on('error', () => console.error('Idle database connection failed'))
