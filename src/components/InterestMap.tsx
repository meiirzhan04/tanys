import type { InterestSummary } from '../data/interestSummary'
import { getMessages } from '../i18n/messages'
import type { Locale } from '../matching/types'

interface InterestMapProps {
  summary: InterestSummary
  locale: Locale
  onExportCsv?: () => void
}

const INTEREST_METRICS_LABELS = {
  ru: { topics: 'Активных тем', leader: 'Главная тема', share: 'охват' },
  kk: { topics: 'Белсенді тақырыптар', leader: 'Басты тақырып', share: 'үлесі' },
  en: { topics: 'Active topics', leader: 'Top topic', share: 'reach' },
} as const

export function InterestMap({ summary, locale, onExportCsv }: InterestMapProps) {
  const messages = getMessages(locale)
  const t = messages.interestMap
  const m = INTEREST_METRICS_LABELS[locale]
  const number = new Intl.NumberFormat(locale)
  const highestCount = summary.topics[0]?.count ?? 1
  const topTopic = summary.topics[0]

  return (
    <section className="interest-map" aria-labelledby="interest-map-title">
      <div className="page-heading">
        <div>
          <h1 id="interest-map-title" tabIndex={-1}>{t.title}</h1>
          <p>{t.profileCount} <strong>{number.format(summary.profileCount)}</strong></p>
        </div>
        {onExportCsv && (
          <button
            type="button"
            className="secondary-button"
            disabled={summary.topics.length === 0}
            onClick={onExportCsv}
          >{messages.organizer.exportInterestsCsv}</button>
        )}
      </div>

      {summary.topics.length ? (
        <div className="interest-analytics">
          <div className="interest-summary-bar" aria-hidden="true">
            <div className="surface interest-stat-card">
              <span className="interest-stat-card__label">{t.profileCount.replace(/:\s*$/, '')}</span>
              <strong className="interest-stat-card__value">{number.format(summary.profileCount)}</strong>
            </div>
            <div className="surface interest-stat-card">
              <span className="interest-stat-card__label">{m.topics}</span>
              <strong className="interest-stat-card__value">{number.format(summary.topics.length)}</strong>
            </div>
            {topTopic && (
              <div className="surface interest-stat-card interest-stat-card--accent">
                <span className="interest-stat-card__label">{m.leader}</span>
                <strong className="interest-stat-card__value">{topTopic.topic}</strong>
              </div>
            )}
          </div>

          <div className="interest-cards-grid" role="list" aria-labelledby="interest-map-title">
            {summary.topics.map(({ topic, count }, index) => {
              const pct = summary.profileCount > 0 ? Math.round((count / summary.profileCount) * 100) : 0
              const barWidth = Math.max(10, Math.round((count / highestCount) * 100))
              return (
                <article key={topic} role="listitem" className="surface interest-topic-card">
                  <div className="interest-topic-card__top">
                    <span className="interest-topic-card__rank">#{index + 1}</span>
                    <span className="interest-topic-card__count">
                      {number.format(count)} · {pct}% {m.share}
                    </span>
                  </div>
                  <strong className="interest-topic-card__title">{topic}</strong>
                  <div className="interest-topic-card__meter" aria-hidden="true">
                    <span style={{ width: `${barWidth}%` }} />
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="surface empty-state">
          <p>{t.empty}</p>
        </div>
      )}
    </section>
  )
}
