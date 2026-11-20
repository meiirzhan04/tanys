import type { Candidate } from '../matching/types'

export interface InterestSummary {
  profileCount: number
  topics: readonly { topic: string; count: number }[]
}

export function summarizeInterests(profiles: readonly Pick<Candidate, 'interests'>[]): InterestSummary {
  const totals = new Map<string, { topic: string; count: number }>()

  for (const { interests } of profiles) {
    const counted = new Set<string>()

    for (const interest of interests) {
      const topic = interest.trim().replace(/\s+/g, ' ')
      const key = topic.toLowerCase()
      if (!key || counted.has(key)) continue
      counted.add(key)

      const total = totals.get(key)
      if (total) total.count += 1
      else totals.set(key, { topic, count: 1 })
    }
  }

  return {
    profileCount: profiles.length,
    topics: [...totals.values()].sort((a, b) => b.count - a.count || a.topic.localeCompare(b.topic, 'ru')),
  }
}
