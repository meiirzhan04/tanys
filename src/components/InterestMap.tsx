import type { InterestSummary } from '../data/interestSummary'
import { getMessages } from '../i18n/messages'
import type { Locale } from '../matching/types'

interface InterestMapProps {
  summary: InterestSummary
  locale: Locale
}

export function InterestMap({ summary, locale }: InterestMapProps) {
  const t = getMessages(locale).interestMap
  const number = new Intl.NumberFormat(locale)
  const highestCount = summary.topics[0]?.count ?? 1

  return (
    <section className="interest-map" aria-labelledby="interest-map-title">
      <div className="page-heading">
        <div>
          <h1 id="interest-map-title" tabIndex={-1}>{t.title}</h1>
          <p>{t.profileCount} <strong>{number.format(summary.profileCount)}</strong></p>
        </div>
      </div>
      {summary.topics.length ? (
        <div className="surface">
          <table className="interest-table" aria-labelledby="interest-map-title">
            <thead>
              <tr>
                <th scope="col">{t.topic}</th>
                <th scope="col">{t.participants}</th>
              </tr>
            </thead>
            <tbody>
              {summary.topics.map(({ topic, count }) => (
                <tr key={topic}>
                  <th scope="row">
                    <span className="interest-topic">
                      <span>{topic}</span>
                      <span className="interest-track" aria-hidden="true">
                        <span style={{ width: `${count / highestCount * 100}%` }} />
                      </span>
                    </span>
                  </th>
                  <td>{number.format(count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="surface empty-state">
          <p>{t.empty}</p>
        </div>
      )}
    </section>
  )
}
