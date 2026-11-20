import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface ConfirmDialogProps {
  title: string
  children: ReactNode
  confirmLabel: string
  cancelLabel: string
  tone: 'neutral' | 'danger'
  busy?: boolean
  /** When set, the confirm button is hidden and this text explains why the action is unavailable. */
  blockedReason?: string
  error?: string
  onConfirm: () => void
  onCancel: () => void
}

/** Modal confirmation: Cancel is focused first and Escape or a backdrop click cancel without side effects. */
export function ConfirmDialog({
  title,
  children,
  confirmLabel,
  cancelLabel,
  tone,
  busy = false,
  blockedReason,
  error,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const id = useId()
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => { cancelRef.current?.focus() }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) {
        event.preventDefault()
        onCancel()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [busy, onCancel])

  // Render at <body> level so page animations or stacking contexts never clip the overlay.
  return createPortal(
    <div
      className="qr-modal-backdrop"
      role="presentation"
      onClick={event => {
        if (event.target === event.currentTarget && !busy) onCancel()
      }}
    >
      <div
        className="qr-modal surface confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-body`}
        data-tone={tone}
      >
        <h2 id={`${id}-title`}>{title}</h2>
        <div id={`${id}-body`} className="confirm-dialog__body">{children}</div>
        {blockedReason && <p className="confirm-dialog__blocked" role="note">{blockedReason}</p>}
        {error && <p className="error-banner" role="alert">{error}</p>}
        <div className="confirm-dialog__actions">
          <button ref={cancelRef} type="button" className="secondary-button" disabled={busy} onClick={onCancel}>
            {cancelLabel}
          </button>
          {!blockedReason && (
            <button
              type="button"
              className={tone === 'danger' ? 'danger-solid' : 'primary-button'}
              disabled={busy}
              onClick={onConfirm}
            >
              {confirmLabel}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
