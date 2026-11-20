import type { BoothRecommendation } from '../data/booths'
import { getMessages } from '../i18n/messages'
import type { Locale } from '../matching/types'

interface PartnerBoothsProps {
  recommendations: readonly BoothRecommendation[]
  locale?: Locale
}

/** Displays recommended demonstration partner booths below people matches. */
export function PartnerBooths({ recommendations, locale = 'ru' }: PartnerBoothsProps) {
  const t = getMessages(locale).booths

  return (
    <section className="booths-section" aria-labelledby="partner-booths-title">
      <div className="booths-heading">
        <div>
          <h2 id="partner-booths-title">{t.title}</h2>
          <p>{t.subtitle}</p>
        </div>
      </div>

      {recommendations.length ? (
        <div className="booths-grid">
          {recommendations.map(({ booth, matchedTopics, explanation }) => (
            <article key={booth.id} className="booth-card surface" data-booth-id={booth.id}>
              <div className="booth-card-top">
                <h3>{booth.name}</h3>
                {booth.demo && <span className="booth-demo-badge">{t.demoBadge}</span>}
              </div>
              <p className="booth-description">{booth.description[locale]}</p>
              <ul className="skill-list" aria-label={t.topicsAriaLabel}>
                {matchedTopics.map(topic => <li key={topic}>{topic}</li>)}
              </ul>
              <p className="booth-explanation">{explanation}</p>
            </article>
          ))}
        </div>
      ) : (
        <div className="surface empty-state booths-empty">
          <h3>{t.emptyTitle}</h3>
          <p>{t.emptyBody}</p>
        </div>
      )}
    </section>
  )
}
