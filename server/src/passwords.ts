import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'

const version = 'scrypt-v1'
const options = { N: 2 ** 15, r: 8, p: 3, maxmem: 64 * 1024 * 1024 }
const missingUserHash = `${version}.${randomBytes(16).toString('hex')}.${randomBytes(64).toString('hex')}`

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, options, (error, key) => error ? reject(error) : resolve(key))
  })
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const key = await derive(password, salt)
  return `${version}.${salt.toString('hex')}.${key.toString('hex')}`
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  const [algorithm, salt, digest] = (stored ?? missingUserHash).split('.')
  if (algorithm !== version || !/^[a-f0-9]{32}$/.test(salt ?? '') || !/^[a-f0-9]{128}$/.test(digest ?? '')) {
    throw new Error('Invalid password hash format')
  }
  const actual = await derive(password, Buffer.from(salt, 'hex'))
  return timingSafeEqual(actual, Buffer.from(digest, 'hex')) && Boolean(stored)
}
