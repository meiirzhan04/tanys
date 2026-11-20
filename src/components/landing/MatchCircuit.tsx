import { TanysMark } from '../brand/TanysLogo'
import type { LandingCopy } from './landingCopy'

/** Node anchors in the 1000×380 stage; traces are drawn from each anchor into the central chip. */
const NODES = [
  { key: 'l1', x: 15, y: 18.4, person: 0, side: 'left' },
  { key: 'you', x: 11, y: 50, person: -1, side: 'left' },
  { key: 'l3', x: 15, y: 81.6, person: 2, side: 'left' },
  { key: 'r1', x: 85, y: 18.4, person: 3, side: 'right' },
  { key: 'match', x: 89, y: 50, person: 1, side: 'right' },
  { key: 'r3', x: 85, y: 81.6, person: 4, side: 'right' },
] as const

const TRACES = [
  { d: 'M150 70 H310 L390 150 H500', tone: '', delay: 0 },
  { d: 'M110 190 H500', tone: 'trace--hot', delay: 0.4 },
  { d: 'M150 310 H310 L390 230 H500', tone: '', delay: 1.6 },
  { d: 'M850 70 H690 L610 150 H500', tone: '', delay: 2.2 },
  { d: 'M890 190 H500', tone: 'trace--hot trace--out', delay: 1.2 },
  { d: 'M850 310 H690 L610 230 H500', tone: '', delay: 0.9 },
] as const

export function MatchCircuit({ copy }: { copy: LandingCopy['circuit'] }) {
  return (
    <figure className="circuit" aria-hidden="true">
      <div className="circuit__stage">
        <svg className="circuit__traces" viewBox="0 0 1000 380" preserveAspectRatio="none" fill="none">
          {TRACES.map(trace => (
            <g key={trace.d} className={`trace ${trace.tone}`}>
              <path className="trace__base" d={trace.d} vectorEffect="non-scaling-stroke" />
              <path
                className="trace__pulse"
                d={trace.d}
                pathLength={100}
                vectorEffect="non-scaling-stroke"
                style={{ animationDelay: `${-trace.delay}s` }}
              />
            </g>
          ))}
        </svg>

        <div className="circuit__chip">
          <span className="circuit__chip-ring" />
          <span className="circuit__chip-ring circuit__chip-ring--late" />
          <TanysMark size={62} />
          <span className="circuit__chip-caption">{copy.chipCaption}</span>
        </div>

        {NODES.map((node, index) => {
          const person = node.person >= 0 ? copy.people[node.person] : null
          const name = person ? person.name : copy.you
          const role = person ? person.role : copy.youRole
          const initial = person ? person.initial : '★'
          return (
            <div
              key={node.key}
              className={`circuit__node circuit__node--${node.side} circuit__node--${node.key}`}
              style={{ left: `${node.x}%`, top: `${node.y}%`, animationDelay: `${index * -0.9}s` }}
            >
              <span className="circuit__avatar">{initial}</span>
              <span className="circuit__node-text">
                <strong>{name}</strong>
                <span>{role}</span>
              </span>
            </div>
          )
        })}
      </div>

      <div className="circuit__match">
        <div className="circuit__match-head">
          <span className="circuit__match-dot" />
          <strong>{copy.matchTitle}</strong>
        </div>
        <p>{copy.matchReason}</p>
        <p className="circuit__match-phrase">{copy.matchPhrase}</p>
      </div>
    </figure>
  )
}
