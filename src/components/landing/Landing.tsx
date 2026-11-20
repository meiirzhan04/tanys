import { useRef } from 'react'
import type { CSSProperties } from 'react'
import { getGoalLabels } from '../goalLabels'
import type { Goal, Locale } from '../../matching/types'
import { landingCopy } from './landingCopy'
import { LandingIcon } from './LandingIcon'
import type { LandingIconName } from './LandingIcon'
import { MatchCircuit } from './MatchCircuit'
import { useReveal } from './useReveal'
import './landing.css'

const STEP_ICONS: readonly LandingIconName[] = ['form', 'match', 'chat', 'clock']
const GOAL_ORDER: readonly Goal[] = ['find_job', 'hire', 'find_mentor', 'be_mentor', 'find_cofounder', 'exchange_experience']

interface LandingProps {
  locale: Locale
  topTopics: readonly { topic: string; count: number }[]
  profileCount: number
  onStart: () => void
  onPickGoal: (goal: Goal) => void
  onOpenAccount: () => void
}

const stagger = (index: number): CSSProperties => ({ '--stagger': index } as CSSProperties)

export function Landing({ locale, topTopics, profileCount, onStart, onPickGoal, onOpenAccount }: LandingProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  useReveal(rootRef)
  const copy = landingCopy[locale]
  const goalLabels = getGoalLabels(locale)
  const maxTopicCount = Math.max(1, ...topTopics.map(item => item.count))

  return (
    <div ref={rootRef} className="landing">
      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-hero__glow" aria-hidden="true" />
        <div className="landing-hero__grid" aria-hidden="true" />
        <div className="landing-hero__copy">
          <p className="hero-pill hero-in" style={stagger(0)}>
            <span className="hero-pill__dot" aria-hidden="true" />
            {copy.pill}
          </p>
          <h1 id="landing-title" className="hero-title hero-in" style={stagger(1)}>
            <span className="hero-title__lead">{copy.titleLead}</span>
            <span className="hero-title__accent">{copy.titleAccent}</span>
          </h1>
          <p className="hero-sub hero-in" style={stagger(2)}>{copy.subtitle}</p>
          <div className="hero-actions hero-in" style={stagger(3)}>
            <button type="button" className="hero-cta" data-landing-start onClick={onStart}>
              {copy.ctaPrimary}
              <LandingIcon name="arrow" size={18} />
            </button>
            <button type="button" className="hero-ghost" onClick={onOpenAccount}>
              <LandingIcon name="qr" size={18} />
              {copy.ctaSecondary}
            </button>
          </div>
          <ul className="hero-trust hero-in" style={stagger(4)}>
            {copy.trust.map(item => (
              <li key={item}>
                <LandingIcon name="check" size={15} />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="hero-in hero-in--late" style={stagger(5)}>
          <MatchCircuit copy={copy.circuit} />
        </div>
      </section>

      <ul className="landing-stats" data-reveal>
        {copy.stats.map((stat, index) => (
          <li key={stat.label} className="landing-stat" style={stagger(index)}>
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </li>
        ))}
      </ul>

      <section className="landing-section" aria-labelledby="landing-how-title">
        <header className="landing-section__head" data-reveal>
          <p className="landing-eyebrow">{copy.howEyebrow}</p>
          <h2 id="landing-how-title">{copy.howTitle}</h2>
          <p>{copy.howSubtitle}</p>
        </header>
        <ol className="landing-steps">
          {copy.steps.map((step, index) => (
            <li key={step.title} className="landing-step" data-reveal style={stagger(index)}>
              <span className="landing-step__icon"><LandingIcon name={STEP_ICONS[index]} size={22} /></span>
              <span className="landing-step__index">{String(index + 1).padStart(2, '0')}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="landing-section" aria-labelledby="landing-goals-title">
        <header className="landing-section__head" data-reveal>
          <p className="landing-eyebrow">{copy.goalsEyebrow}</p>
          <h2 id="landing-goals-title">{copy.goalsTitle}</h2>
          <p>{copy.goalsSubtitle}</p>
        </header>
        <div className="landing-goals">
          {GOAL_ORDER.map((goal, index) => {
            const pair = copy.goalPairs[goal]
            return (
              <button
                key={goal}
                type="button"
                className="landing-goal"
                data-reveal
                style={stagger(index)}
                title={copy.goalHint}
                onClick={() => onPickGoal(goal)}
              >
                <span className="landing-goal__icon"><LandingIcon name={goal} size={22} /></span>
                <span className="landing-goal__title">{goalLabels[goal]}</span>
                <span className="landing-goal__text">{pair.text}</span>
                <span className="landing-goal__pair">
                  {copy.pairPrefix} <b>{goalLabels[pair.pairWith]}</b>
                </span>
                <span className="landing-goal__arrow" aria-hidden="true"><LandingIcon name="arrow" size={16} /></span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="landing-section landing-org" aria-labelledby="landing-org-title">
        <div className="landing-org__copy" data-reveal>
          <p className="landing-eyebrow">{copy.orgEyebrow}</p>
          <h2 id="landing-org-title">{copy.orgTitle}</h2>
          <p>{copy.orgSubtitle}</p>
          <ul className="landing-org__list">
            {copy.orgFeatures.map(feature => (
              <li key={feature}>
                <span className="landing-org__check"><LandingIcon name="check" size={14} /></span>
                {feature}
              </li>
            ))}
          </ul>
          <button type="button" className="hero-ghost landing-org__cta" onClick={onOpenAccount}>
            {copy.orgCta}
            <LandingIcon name="arrow" size={16} />
          </button>
        </div>
        <div className="landing-org__map" data-reveal aria-hidden="true">
          <div className="landing-org__map-head">
            <strong>{copy.orgMapTitle}</strong>
            <span>{copy.orgMapCaption(profileCount)}</span>
          </div>
          <ul>
            {topTopics.map((item, index) => (
              <li key={item.topic} style={stagger(index)}>
                <span className="landing-org__topic">{item.topic}</span>
                <span className="landing-org__bar">
                  <span style={{ '--fill': `${Math.round((item.count / maxTopicCount) * 100)}%` } as CSSProperties} />
                </span>
                <span className="landing-org__count">{item.count}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <p className="landing-form-eyebrow" data-reveal>
        <span aria-hidden="true" />
        {copy.formEyebrow}
        <span aria-hidden="true" />
      </p>
    </div>
  )
}
