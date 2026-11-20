import type { CSSProperties, ReactNode } from 'react'
import { getCandidateGoalLabels, getGoalLabels } from '../goalLabels'
import type { Locale } from '../../matching/types'
import { getProfileCompleteness } from './profileCompleteness'
import type { ProfileSnapshot } from './profileCompleteness'
import { profileCopy } from './profileCopy'
import './profile.css'

export interface ProfileStat {
  value: number
  label: string
}

interface ProfileOverviewProps {
  locale: Locale
  profile: ProfileSnapshot | null
  displayName?: string
  visible?: boolean
  stats: readonly ProfileStat[]
  onEdit: () => void
  onShowMatches?: () => void
  aside?: ReactNode
  footnote?: string
}

const RING_RADIUS = 34
const RING_LENGTH = 2 * Math.PI * RING_RADIUS

function initialsOf(name: string, fallback: string): string {
  const letters = name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase() ?? '')
  return letters.join('') || fallback
}

export function ProfileOverview({
  locale,
  profile,
  displayName,
  visible,
  stats,
  onEdit,
  onShowMatches,
  aside,
  footnote,
}: ProfileOverviewProps) {
  const t = profileCopy[locale]
  const goalLabels = getGoalLabels(locale)
  const candidateGoalLabels = getCandidateGoalLabels(locale)

  if (!profile || profile.goal === '') {
    return (
      <section className="profile-page" aria-labelledby="me-title">
        <div className="page-heading">
          <div>
            <h1 id="me-title" tabIndex={-1}>{t.title}</h1>
            <p>{t.subtitle}</p>
          </div>
        </div>
        <div className="profile-grid">
          <div className="surface profile-empty">
            <span className="profile-empty__avatar" aria-hidden="true">?</span>
            <h2>{t.emptyTitle}</h2>
            <p>{t.emptyText}</p>
            <button type="button" className="primary-button" onClick={onEdit}>{t.emptyCta}</button>
          </div>
          {aside && <div className="profile-aside">{aside}</div>}
        </div>
      </section>
    )
  }

  const { percent, missing } = getProfileCompleteness(profile)
  const name = displayName?.trim() || profile.role
  const initials = initialsOf(displayName ?? '', profile.role.trim()[0]?.toUpperCase() ?? '•')
  const ringStyle = { '--ring-offset': `${RING_LENGTH * (1 - percent / 100)}` } as CSSProperties

  return (
    <section className="profile-page" aria-labelledby="me-title">
      <div className="page-heading">
        <div>
          <h1 id="me-title" tabIndex={-1}>{t.title}</h1>
          <p>{t.subtitle}</p>
        </div>
        <div className="page-heading__actions">
          {onShowMatches && (
            <button type="button" className="secondary-button" onClick={onShowMatches}>{t.showMatches}</button>
          )}
          <button type="button" className="primary-button" onClick={onEdit}>{t.editProfile}</button>
        </div>
      </div>

      <div className="profile-grid">
        <div className="profile-main">
          <article className="surface profile-hero">
            <div className="profile-hero__banner" aria-hidden="true" />
            <div className="profile-hero__body">
              <span className="profile-hero__avatar" aria-hidden="true">{initials}</span>
              <div className="profile-hero__id">
                <h2>{name}</h2>
                {displayName && <p>{profile.role}</p>}
                <div className="profile-hero__badges">
                  <span className="profile-badge profile-badge--accent">{goalLabels[profile.goal]}</span>
                  {profile.experienceYears !== null && (
                    <span className="profile-badge">{t.experience(profile.experienceYears)}</span>
                  )}
                  {visible !== undefined && (
                    <span className={`profile-badge ${visible ? 'profile-badge--ok' : 'profile-badge--warn'}`}>
                      <span className="profile-badge__dot" aria-hidden="true" />
                      {visible ? t.visible : t.hidden}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {visible === false && <p className="profile-hero__warning">{t.hiddenHint}</p>}
            <dl className="profile-facts">
              <div>
                <dt>{t.skills}</dt>
                <dd><ChipList items={profile.skills} empty={t.noValue} /></dd>
              </div>
              <div>
                <dt>{t.interests}</dt>
                <dd><ChipList items={profile.interests} empty={t.noValue} /></dd>
              </div>
              {profile.lookingFor.length > 0 && (
                <div>
                  <dt>{t.lookingFor}</dt>
                  <dd><ChipList items={profile.lookingFor} empty={t.noValue} accent /></dd>
                </div>
              )}
              <div className="profile-facts__wide">
                <dt>{t.about}</dt>
                <dd className="profile-facts__about">{profile.about.trim() || t.noValue}</dd>
              </div>
            </dl>
          </article>

          <section className="surface profile-preview" aria-labelledby="me-preview-title">
            <div className="profile-section-head">
              <h2 id="me-preview-title">{t.previewTitle}</h2>
              <p>{t.previewHint}</p>
            </div>
            <div className="profile-preview__card" aria-hidden="true">
              <span className="avatar">{initials[0]}</span>
              <div className="profile-preview__text">
                <strong>{name}</strong>
                {name !== profile.role && <span>{profile.role}</span>}
                <span className="profile-preview__goal">{candidateGoalLabels[profile.goal]}</span>
              </div>
              <ul className="profile-preview__skills">
                {profile.skills.slice(0, 4).map(skill => <li key={skill}>{skill}</li>)}
              </ul>
            </div>
          </section>
        </div>

        <div className="profile-aside">
          <section className="surface profile-score" aria-labelledby="me-score-title">
            <div className="profile-score__ring" style={ringStyle}>
              <svg viewBox="0 0 80 80" aria-hidden="true">
                <circle className="profile-score__track" cx="40" cy="40" r={RING_RADIUS} />
                <circle
                  className="profile-score__value"
                  cx="40"
                  cy="40"
                  r={RING_RADIUS}
                  strokeDasharray={RING_LENGTH}
                />
              </svg>
              <strong>{percent}%</strong>
            </div>
            <div className="profile-score__text">
              <h2 id="me-score-title">{t.completeness}</h2>
              {missing.length === 0 ? (
                <p>{t.complete}</p>
              ) : (
                <>
                  <p>{t.tipsTitle}</p>
                  <ul className="profile-tips">
                    {missing.map(key => <li key={key}>{t.tips[key]}</li>)}
                  </ul>
                </>
              )}
            </div>
          </section>

          <section className="surface profile-stats" aria-labelledby="me-stats-title">
            <h2 id="me-stats-title">{t.statsTitle}</h2>
            <ul>
              {stats.map(stat => (
                <li key={stat.label}>
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </li>
              ))}
            </ul>
          </section>

          {aside}
          {footnote && <p className="profile-footnote">{footnote}</p>}
        </div>
      </div>
    </section>
  )
}

function ChipList({ items, empty, accent = false }: { items: readonly string[]; empty: string; accent?: boolean }) {
  if (!items.length) return <span className="profile-facts__empty">{empty}</span>
  return (
    <ul className={`profile-chips ${accent ? 'profile-chips--accent' : ''}`}>
      {items.map(item => <li key={item}>{item}</li>)}
    </ul>
  )
}
