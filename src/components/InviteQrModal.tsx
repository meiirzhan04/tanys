import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { getMessages } from '../i18n/messages'
import type { Locale } from '../matching/types'
import { generateInviteQrSvg, getInviteState } from './inviteQr'

export interface InviteQrModalProps {
  eventName: string
  inviteUrl: string
  revoked?: boolean
  expiresAt?: string
  locale: Locale
  copied: boolean
  onCopy: () => void
  onClose: () => void
}

export function InviteQrModal({
  eventName,
  inviteUrl,
  revoked,
  expiresAt,
  locale,
  copied,
  onCopy,
  onClose,
}: InviteQrModalProps) {
  const o = getMessages(locale).organizer
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const [svgMarkup, setSvgMarkup] = useState('')
  const [nowMs, setNowMs] = useState(() => Date.now())
  const state = getInviteState({ revoked, expiresAt }, nowMs)

  // Focus Close button when opening and support Escape key dismissal.
  useEffect(() => {
    closeButtonRef.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Check expiration while the QR dialog stays open on a phone or projector.
  useEffect(() => {
    if (!expiresAt || state !== 'active') return
    const msLeft = Date.parse(expiresAt) - Date.now()
    if (!Number.isFinite(msLeft) || msLeft <= 0) {
      setNowMs(Date.now())
      return
    }
    const timer = window.setTimeout(() => setNowMs(Date.now()), Math.min(msLeft + 50, 60_000))
    return () => window.clearTimeout(timer)
  }, [expiresAt, state, nowMs])

  useEffect(() => {
    if (state !== 'active') {
      setSvgMarkup('')
      return
    }
    let cancelled = false
    void generateInviteQrSvg(inviteUrl).then(svg => {
      if (!cancelled) setSvgMarkup(svg)
    })
    return () => { cancelled = true }
  }, [inviteUrl, state])

  // Render at <body> level so page animations or stacking contexts never clip the overlay.
  return createPortal(
    <div
      className="qr-modal-backdrop"
      role="presentation"
      onClick={event => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className="qr-modal surface"
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-qr-title"
      >
        <div className="qr-modal__header">
          <div>
            <h2 id="invite-qr-title">{o.qrDialogTitle}</h2>
            {eventName && <p className="social-card__role">{eventName}</p>}
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="secondary-button"
            onClick={onClose}
          >{o.qrClose}</button>
        </div>

        {state === 'active' ? (
          <>
            <p className="qr-modal__hint">{o.qrDialogHint}</p>
            <div className="qr-svg-frame" role="img" aria-label={o.qrDialogTitle}>
              {svgMarkup ? (
                <div className="qr-svg-box" dangerouslySetInnerHTML={{ __html: svgMarkup }} />
              ) : (
                <p className="social-card__hint">{o.qrGenerating}</p>
              )}
            </div>
            <div className="qr-modal__link-box">
              <code className="invite-url">{inviteUrl}</code>
            </div>
            <div className="social-card__actions">
              <button type="button" className="primary-button" onClick={onCopy}>
                {copied ? o.inviteCopied : o.copyInvite}
              </button>
              <button type="button" className="secondary-button" onClick={onClose}>
                {o.qrClose}
              </button>
            </div>
          </>
        ) : (
          <div className="error-banner" role="alert">
            {o.qrUnavailableNotice}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
