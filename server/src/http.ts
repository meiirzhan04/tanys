import type { IncomingMessage, ServerResponse } from 'node:http'
import type pg from 'pg'
import { pool } from './db.js'

export class HttpError extends Error {
  constructor(public status: number, public code: string) { super(code) }
}

export async function transaction<T>(work: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await work(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally { client.release() }
}

export async function readBody(request: IncomingMessage): Promise<Record<string, unknown>> {
  if (request.headers['content-type']?.split(';')[0]?.trim() !== 'application/json') throw new HttpError(415, 'json_required')
  // Some Node function hosts consume the stream and attach the decoded JSON first.
  if ('body' in request && request.body !== undefined) {
    const value = request.body
    if (!value || typeof value !== 'object' || Array.isArray(value) || Buffer.isBuffer(value)) {
      throw new HttpError(400, 'invalid_body')
    }
    if (Number(request.headers['content-length']) > 16384 || Buffer.byteLength(JSON.stringify(value)) > 16384) {
      throw new HttpError(413, 'too_large')
    }
    return value as Record<string, unknown>
  }
  const chunks: Buffer[] = []
  let length = 0
  for await (const chunk of request) {
    length += chunk.length
    if (length > 16384) throw new HttpError(413, 'too_large')
    chunks.push(chunk)
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString())
    if (value && typeof value === 'object' && !Array.isArray(value)) return value
  } catch { /* Invalid JSON uses the same public error as a non-object body. */ }
  throw new HttpError(400, 'invalid_body')
}

export function json(response: ServerResponse, status: number, data?: unknown) {
  response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
  response.end(data === undefined ? undefined : JSON.stringify(data))
}

export function uuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value)
}
