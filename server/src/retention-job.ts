import { pool } from './db.js'
import { purgeExpiredData, replayDeletedTombstones } from './retention.js'

async function main() {
  const args = process.argv.slice(2)
  const doReplay = args.includes('--replay') || args.includes('--all')
  const doPurge = args.includes('--purge') || args.includes('--all') || args.length === 0

  if (doReplay) {
    const replayReport = await replayDeletedTombstones(pool)
    console.log(JSON.stringify({ event: 'tombstones_replayed', ...replayReport }))
  }

  if (doPurge) {
    const purgeReport = await purgeExpiredData(pool)
    console.log(JSON.stringify({ event: 'retention_purge_completed', ...purgeReport }))
  }
}

main()
  .catch(err => {
    console.error(JSON.stringify({ event: 'retention_job_error', message: err instanceof Error ? err.message : String(err) }))
    process.exitCode = 1
  })
  .finally(() => pool.end())
