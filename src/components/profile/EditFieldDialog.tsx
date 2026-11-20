import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface EditFieldDialogProps {
  title: string
  label: string
  name: string
  initialValue: string
  placeholder?: string
  hint?: ReactNode
  maxLength: number
  saveLabel: string
  cancelLabel: string
  clearLabel?: string
  /** Resolves with an error message, or '' once the server saved the value. */
  onSave: (value: string) => Promise<string>
  onClose: () => void
}

/** Modal editor for one private field: focus moves into it, Escape cancels, focus returns to the trigger. */
export function EditFieldDialog({
  title,
  label,
  name,
  initialValue,
  placeholder,
  hint,
  maxLength,
  saveLabel,
  cancelLabel,
  clearLabel,
  onSave,
  onClose,
}: EditFieldDialogProps) {
  const id = useId()
  const [value, setValue] = useState(initialValue)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    returnFocus.current = document.activeElement as HTMLElement | null
    inputRef.current?.focus()
    inputRef.current?.select()
    return () => returnFocus.current?.focus()
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) {
        event.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [busy, onClose])

  async function save(next: string) {
    setBusy(true)
    setError('')
    const message = await onSave(next)
    setBusy(false)
    if (message) setError(message)
    else onClose()
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!busy) void save(value.trim())
  }

  return createPortal(
    <div className="qr-modal-backdrop" role="presentation" onClick={event => { if (event.target === event.currentTarget && !busy) onClose() }}>
      <form className="qr-modal surface edit-dialog" role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} onSubmit={submit}>
        <h2 id={`${id}-title`}>{title}</h2>
        <label className="field">
          <span>{label}</span>
          <input
            ref={inputRef}
            name={name}
            maxLength={maxLength}
            placeholder={placeholder}
            value={value}
            disabled={busy}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
            onChange={event => setValue(event.target.value)}
          />
        </label>
        {hint && <div id={`${id}-hint`} className="edit-dialog__hint">{hint}</div>}
        {error && <p id={`${id}-error`} className="error-banner" role="alert">{error}</p>}
        <div className="confirm-dialog__actions">
          {clearLabel && initialValue && (
            <button type="button" className="text-button danger-button" disabled={busy} onClick={() => void save('')}>{clearLabel}</button>
          )}
          <button type="button" className="secondary-button" disabled={busy} onClick={onClose}>{cancelLabel}</button>
          <button type="submit" className="primary-button" disabled={busy}>{saveLabel}</button>
        </div>
      </form>
    </div>,
    document.body,
  )
}
