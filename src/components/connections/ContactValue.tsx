import { useState } from 'react'
import type { Locale } from '../../matching/types'
import { connectionsCopy } from './connectionsCopy'
import { contactHref } from './contactLink'

/** An unlocked contact shown as text, with Copy and — for safe https/mailto/Telegram values — Open. */
export function ContactValue({ value, locale }: { value: string; locale: Locale }) {
  const c = connectionsCopy[locale]
  const [copied, setCopied] = useState(false)
  const href = contactHref(value)

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="contact-value">
      <span className="contact-value__text">{value}</span>
      <span className="contact-value__actions">
        <button type="button" className="chip-button" onClick={() => void copy()}>
          {copied ? c.copied : c.copy}
        </button>
        {href && (
          <a className="chip-button" href={href} target="_blank" rel="noopener noreferrer">{c.openLink}</a>
        )}
      </span>
      <span className="visually-hidden" role="status">{copied ? c.copied : ''}</span>
    </div>
  )
}
