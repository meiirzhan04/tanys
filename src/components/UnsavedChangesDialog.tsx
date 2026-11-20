import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { getMessages } from '../i18n/messages'
import type { Locale } from '../matching/types'

export interface UnsavedChangesDialogProps {
  locale: Locale
  onStay: () => void
  onDiscard: () => void
}

export function UnsavedChangesDialog({ locale, onStay, onDiscard }: UnsavedChangesDialogProps) {
  const u = getMessages(locale).account.unsaved
  const stayRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    stayRef.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onStay()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onStay])

  // Render at <body> level so page animations or stacking contexts never clip the overlay.
  return createPortal(
    <div
      className="qr-modal-backdrop"
      role="presentation"
      onClick={event => {
        if (event.target === event.currentTarget) onStay()
      }}
    >
      <div
        className="qr-modal surface"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="unsaved-dialog-title"
        aria-describedby="unsaved-dialog-body"
      >
        <h2 id="unsaved-dialog-title">{u.title}</h2>
        <p id="unsaved-dialog-body" className="qr-modal__hint">{u.body}</p>
        <div className="social-card__actions">
          <button ref={stayRef} type="button" className="primary-button" onClick={onStay}>
            {u.stayButton}
          </button>
          <button type="button" className="meeting-slot-cancel" onClick={onDiscard}>
            {u.discardButton}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
