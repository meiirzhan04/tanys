import type { Locale, ProfileInput } from '../matching/types'

export interface PartnerBooth {
  readonly id: string
  readonly name: string
  readonly demo: true
  readonly topics: readonly string[]
  readonly description: Record<Locale, string>
}

export interface BoothRecommendation {
  readonly booth: PartnerBooth
  readonly matchedTopics: readonly string[]
  readonly explanation: string
}

export const DEMO_PARTNER_BOOTHS: readonly PartnerBooth[] = [
  {
    id: 'booth-python-api',
    name: 'Qazaq Cloud API',
    demo: true,
    topics: ['Python', 'FastAPI', 'API', 'Backend', 'PostgreSQL', 'Go', 'RabbitMQ', 'Системный дизайн'],
    description: {
      ru: 'Разбор архитектуры высоконагруженных API, очередей и стажировок в backend-команде.',
      kk: 'Жоғары жүктемелі API, кезектер архитектурасы және backend командасындағы тағылымдамалар.',
      en: 'High-load API architecture, message queues, and backend team internship talks.',
    },
  },
  {
    id: 'booth-frontend-ui',
    name: 'Steppe Design & Web',
    demo: true,
    topics: ['React', 'TypeScript', 'Vue', 'CSS', 'HTML', 'Figma', 'Веб-доступность', 'Дизайн-системы', 'UX-исследования', 'Исследования пользователей'],
    description: {
      ru: 'Живые разборы дизайн-систем, веб-доступности и интерфейсов на React и TypeScript.',
      kk: 'Дизайн-жүйелер, веб-қолжетімділік және React пен TypeScript интерфейстерін талдау.',
      en: 'Live reviews of design systems, web accessibility, and React/TypeScript interfaces.',
    },
  },
  {
    id: 'booth-data-ai',
    name: 'Almaty Data & AI Lab',
    demo: true,
    topics: ['SQL', 'Airflow', 'dbt', 'PyTorch', 'pandas', 'ML', 'AI', 'Продуктовая аналитика', 'A/B-тестирование', 'A/B-тесты', 'Оркестрация данных', 'Промышленная аналитика'],
    description: {
      ru: 'Кейсы по аналитике, пайплайнам данных, A/B-экспериментам и прикладному ML.',
      kk: 'Аналитика, деректер пайплайндары, A/B-эксперименттер және қолданбалы ML кейстері.',
      en: 'Applied analytics, data orchestration pipelines, A/B testing, and ML case studies.',
    },
  },
  {
    id: 'booth-devops-sre',
    name: 'Nomad Cloud SRE',
    demo: true,
    topics: ['Kubernetes', 'Docker', 'Prometheus', 'Grafana', 'Terraform', 'DevOps', 'Наблюдаемость', 'Реагирование на инциденты', 'OpenTelemetry'],
    description: {
      ru: 'Практики эксплуатации Kubernetes, метрики наблюдаемости и разбор инцидентов.',
      kk: 'Kubernetes пайдалану тәжірибесі, бақылау метрикалары және инциденттерді талдау.',
      en: 'Kubernetes operations, observability metrics, and incident response workshops.',
    },
  },
  {
    id: 'booth-startup-hub',
    name: 'METU Startup Hub',
    demo: true,
    topics: ['Стартапы', 'EdTech', 'Product Discovery', 'Продуктовая стратегия', 'B2B-продажи', 'B2B SaaS', 'Продукт'],
    description: {
      ru: 'Питчи ранних команд, поиск сооснователей и разбор выхода в B2B и EdTech.',
      kk: 'Ерте кезеңдегі командалар питчтері, кофаундер іздеу және B2B мен EdTech бағыттары.',
      en: 'Early-stage startup pitches, cofounder matchmaking, and B2B/EdTech go-to-market.',
    },
  },
  {
    id: 'booth-career-corner',
    name: 'Qazaq IT Career Corner',
    demo: true,
    topics: ['Стажировки', 'Карьера', 'Менторство', 'Junior', 'Тестирование интерфейсов', 'Playwright', 'QA'],
    description: {
      ru: 'Экспресс-ревью резюме, советы по первой стажировке и знакомство с наставниками.',
      kk: 'Түйіндемеге экспресс-шолу, алғашқы тағылымдама кеңестері және тәлімгерлермен танысу.',
      en: 'Quick resume reviews, first-internship tips, and meeting community mentors.',
    },
  },
]

function formatBoothExplanation(matchedTopics: readonly string[], locale: Locale): string {
  const list = matchedTopics.slice(0, 3).join(', ')
  if (locale === 'kk') {
    return `Сәйкес тақырыптар: ${list}.`
  }
  if (locale === 'en') {
    return `Matched topics: ${list}.`
  }
  return `Совпавшие темы: ${list}.`
}

/** Recommend demonstration partner booths whose topics overlap the participant's skills or interests. */
export function recommendBooths(
  input: Pick<ProfileInput, 'skills' | 'interests' | 'lookingFor'>,
  booths: readonly PartnerBooth[] = DEMO_PARTNER_BOOTHS,
  locale: Locale = 'ru',
  limit = 3,
): BoothRecommendation[] {
  const participantTerms = new Set(
    [...input.interests, ...input.skills, ...(input.lookingFor ?? [])]
      .map(term => term.trim().toLowerCase())
      .filter(Boolean),
  )

  if (!participantTerms.size || limit <= 0) return []

  const ranked: Array<{ booth: PartnerBooth; matchedTopics: string[] }> = []

  for (const booth of booths) {
    const seenTopic = new Set<string>()
    const matchedTopics: string[] = []
    for (const topic of booth.topics) {
      const key = topic.trim().toLowerCase()
      if (!key || seenTopic.has(key) || !participantTerms.has(key)) continue
      seenTopic.add(key)
      matchedTopics.push(topic.trim())
    }
    if (matchedTopics.length > 0) {
      ranked.push({ booth, matchedTopics })
    }
  }

  return ranked
    .sort((a, b) => b.matchedTopics.length - a.matchedTopics.length || (a.booth.id < b.booth.id ? -1 : Number(a.booth.id > b.booth.id)))
    .slice(0, limit)
    .map(({ booth, matchedTopics }) => ({
      booth,
      matchedTopics,
      explanation: formatBoothExplanation(matchedTopics, locale),
    }))
}
