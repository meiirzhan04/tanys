import { useId } from 'react'

/**
 * Tanys mark: two overlapping circles (two people) with the shared lens filled —
 * the "common ground" a reciprocal match is built on.
 */
export function TanysMark({ size = 32, className = '' }: { size?: number; className?: string }) {
  const gradientId = `tanys-mark-${useId().replace(/:/g, '')}`
  return (
    <svg
      className={`tanys-mark ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={gradientId} x1="4" y1="2" x2="36" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FF8A3D" />
          <stop offset="0.55" stopColor="#F2500F" />
          <stop offset="1" stopColor="#B83200" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="38" height="38" rx="11" fill={`url(#${gradientId})`} />
      <rect x="1.5" y="1.5" width="37" height="37" rx="10.5" stroke="#FFFFFF" strokeOpacity="0.22" />
      <circle className="tanys-mark__ring tanys-mark__ring--left" cx="15.5" cy="20" r="7.5" stroke="#FFFFFF" strokeWidth="2.6" />
      <circle className="tanys-mark__ring tanys-mark__ring--right" cx="24.5" cy="20" r="7.5" stroke="#FFFFFF" strokeWidth="2.6" />
      <path className="tanys-mark__lens" d="M20 14.08A7.5 7.5 0 0 1 20 25.92A7.5 7.5 0 0 1 20 14.08Z" fill="#FFFFFF" />
    </svg>
  )
}

export function TanysWordmark({ size = 30 }: { size?: number }) {
  return (
    <span className="brand-lockup">
      <TanysMark size={size} />
      <span className="brand-word">tanys</span>
    </span>
  )
}
