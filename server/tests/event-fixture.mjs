import { execFileSync } from 'node:child_process'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import assert from 'node:assert/strict'

export function fixture(size = 2) {
  const event = randomUUID()
  const people = Array.from({length:size}, () => ({ id:randomUUID(), token:randomBytes(32).toString('hex') }))
  const members = people.map(({id,token}, index) => `
    INSERT INTO users(id,email) VALUES('${id}','${id}@participant.test');
    INSERT INTO sessions(digest,user_id) VALUES('${createHash('sha256').update(token).digest('hex')}','${id}');
    INSERT INTO memberships VALUES('${event}','${id}','${index ? 'participant' : 'organizer'}');`).join('\n')
  execFileSync('docker',['compose','-f','compose.api.yaml','exec','-T','db','psql','-U','tanys','-v','ON_ERROR_STOP=1'], {
    input: `BEGIN; INSERT INTO events(id,name,time_zone,starts_at,ends_at) VALUES('${event}','Test','UTC',now(),now()+interval '7 days');${members} COMMIT;`,
  })
  async function call(person, method, path, status, body) {
    const url = 'http://127.0.0.1:' + (process.env.API_PORT || 3000) + '/api/v1' +
      (path.startsWith('/me/') ? path : '/events/' + event + path)
    const response = await fetch(url,{method, headers:{cookie:'tanys_session='+person.token,'Content-Type':'application/json'},
      body:body === undefined ? undefined : JSON.stringify(body)})
    const value = response.status === 204 ? undefined : await response.json()
    assert.equal(response.status,status,method+' '+path+' '+JSON.stringify(value?.error))
    return value
  }
  return { people,event,call }
}

export const profile = {name:'Test',role:'Backend',skills:['Python'],interests:['API'],experienceYears:1,
  goal:'find_job',about:'Test profile',consentVersion:'v1'}
