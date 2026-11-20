import { execFileSync } from 'node:child_process'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'

const DEFAULT_COMPOSE_FILE = fileURLToPath(new URL('../../compose.api.yaml', import.meta.url))

export function resolveIsolatedComposeConfig() {
  const composeFile = (process.env.TANYS_COMPOSE_FILE || process.env.COMPOSE_FILE || DEFAULT_COMPOSE_FILE).trim()
  if (!existsSync(composeFile)) {
    throw new Error(`Compose configuration file not found: ${composeFile}`)
  }

  const project = (process.env.TANYS_TEST_COMPOSE_PROJECT || process.env.COMPOSE_PROJECT_NAME || '').trim()
  if (!project || (project === 'tanys' && process.env.TANYS_ALLOW_DEFAULT_COMPOSE !== '1')) {
    throw new Error(
      'Refusing to run destructive test fixtures against an unisolated Docker Compose project. ' +
      'Set TANYS_TEST_COMPOSE_PROJECT (or COMPOSE_PROJECT_NAME) to an isolated stack name (e.g. "tanys-test") and API_PORT to its port.',
    )
  }

  return {
    project,
    composeFile,
    args: ['compose', '-p', project, '-f', composeFile],
  }
}

export function fixture(size = 2) {
  const { args } = resolveIsolatedComposeConfig()
  const event = randomUUID()
  const people = Array.from({ length: size }, () => ({
    id: randomUUID(),
    token: randomBytes(32).toString('hex'),
  }))
  const members = people
    .map(
      ({ id, token }, index) => `
    INSERT INTO users(id,email) VALUES('${id}','${id}@participant.test');
    INSERT INTO sessions(digest,user_id) VALUES('${createHash('sha256').update(token).digest('hex')}','${id}');
    INSERT INTO memberships VALUES('${event}','${id}','${index ? 'participant' : 'organizer'}');`,
    )
    .join('\n')

  execFileSync('docker', [...args, 'exec', '-T', 'db', 'psql', '-U', 'tanys', '-v', 'ON_ERROR_STOP=1'], {
    input: `BEGIN; INSERT INTO events(id,name,time_zone,starts_at,ends_at) VALUES('${event}','Test','UTC',now(),now()+interval '7 days');${members} COMMIT;`,
  })

  async function call(person, method, path, status, body) {
    const url =
      'http://127.0.0.1:' +
      (process.env.API_PORT || 3000) +
      '/api/v1' +
      (path.startsWith('/me/') ? path : '/events/' + event + path)
    const response = await fetch(url, {
      method,
      headers: { cookie: 'tanys_session=' + person.token, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const value = response.status === 204 ? undefined : await response.json()
    assert.equal(response.status, status, method + ' ' + path + ' ' + JSON.stringify(value?.error))
    return value
  }

  return { people, event, call }
}

export const profile = {
  name: 'Test',
  role: 'Backend',
  skills: ['Python'],
  interests: ['API'],
  experienceYears: 1,
  goal: 'find_job',
  about: 'Test profile',
  consentVersion: 'v1',
}
