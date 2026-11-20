const PATHS = {
  form: 'M7 4h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm2 5h6M9 12h6M9 15h4',
  match: 'M9 12a4 4 0 1 1 0-.01M15 12a4 4 0 1 1 0-.01M12 9.2v5.6',
  chat: 'M5 6h14v9H9l-4 3.5V6Zm4 4.5h6',
  clock: 'M12 7v5l3 2M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18Z',
  find_job: 'M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M4 9a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9Zm0 3h16',
  hire: 'M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6 9a6 6 0 0 1 12 0M18 8v6M15 11h6',
  find_mentor: 'M12 4 3 8.5l9 4.5 9-4.5L12 4Zm-5 6.5V15c0 1.7 2.2 3 5 3s5-1.3 5-3v-4.5',
  be_mentor: 'M12 3.5l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 15.9l-4.8 2.5.9-5.4-3.9-3.8 5.4-.8L12 3.5Z',
  find_cofounder: 'M12 3c3 2.2 4.5 5.2 4.5 9L12 17l-4.5-5c0-3.8 1.5-6.8 4.5-9Zm0 6.5v.01M9 17l-2.5 3.5M15 17l2.5 3.5',
  exchange_experience: 'M5 8h12l-3-3M19 16H7l3 3',
  check: 'M5 12.5 9.5 17 19 7.5',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  qr: 'M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z',
} as const

export type LandingIconName = keyof typeof PATHS

export function LandingIcon({ name, size = 20 }: { name: LandingIconName; size?: number }) {
  return (
    <svg
      className="landing-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
