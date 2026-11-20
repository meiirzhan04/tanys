import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { getMessages } from '../../i18n/messages'
import type { Locale } from '../../matching/types'
import { profileEditorCopy } from './profileEditorCopy'
import { identityCopy } from './identityCopy'

interface Props {
  locale: Locale
  title: string
  dirty: boolean
  children: ReactNode
  onSave: (form: HTMLFormElement) => Promise<string>
  onClose: () => void
}

export function ProfileEditDialog({ locale, title, dirty, children, onSave, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const stay = useRef<HTMLButtonElement>(null)
  const fieldFocus = useRef<HTMLElement | null>(null)
  const lock = useRef(false)
  const [confirm, setConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const id = useId()
  const m = getMessages(locale)
  const u = m.account.unsaved
  const labels = identityCopy[locale]

  useLayoutEffect(() => {
    const dialog = ref.current!
    const trigger = document.activeElement
    const overflow = document.body.style.overflow
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    dialog.querySelector<HTMLElement>('input, textarea, select')?.focus()
    return () => {
      dialog.close()
      document.body.style.overflow = overflow
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus()
    }
  }, [])

  useEffect(() => {
    if (!dirty) return
    const guard = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', guard)
    return () => window.removeEventListener('beforeunload', guard)
  }, [dirty])

  useLayoutEffect(() => {
    if (confirm) stay.current?.focus()
    else fieldFocus.current?.focus()
  }, [confirm])

  async function close() {
    lock.current = true
    const dialog = ref.current
    if (dialog && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      await dialog.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(5px)' }], 110).finished.catch(() => {})
    }
    onClose()
  }
  function requestClose() {
    if (lock.current) return
    if (confirm) setConfirm(false)
    else if (dirty) {
      fieldFocus.current = ref.current?.querySelector<HTMLElement>('input, textarea, select') ?? null
      setConfirm(true)
    } else void close()
  }

  return createPortal(
    <dialog ref={ref} className="profile-editor" aria-labelledby={id} role={confirm ? 'alertdialog' : 'dialog'}
      onKeyDown={event => {
        if (event.key !== 'Tab') return
        const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
          'button:enabled, input:enabled, select:enabled, textarea:enabled, a[href]',
        )).filter(control => control.getClientRects().length > 0 && !control.matches(':disabled'))
        const first = controls[0]
        const last = controls[controls.length - 1]
        if (!first || !last) { event.preventDefault(); return }
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
      }}
      onCancel={event => { event.preventDefault(); requestClose() }}
      onClick={event => {
        if (event.target !== ref.current) return
        const box = event.currentTarget.getBoundingClientRect()
        if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) requestClose()
      }}>
      <header className="profile-editor__header">
        <h2 id={id}>{confirm ? profileEditorCopy[locale].discardTitle : title}</h2>
        <button type="button" className="icon-button" aria-label={m.organizer.qrClose} disabled={saving} onClick={requestClose}>×</button>
      </header>
      {confirm && <>
        <p className="profile-editor__body">{profileEditorCopy[locale].discardBody}</p>
        <footer className="profile-editor__footer">
          <button type="button" className="secondary-button" onClick={() => void close()}>{u.discardButton}</button>
          <button ref={stay} type="button" className="primary-button" onClick={() => setConfirm(false)}>{u.stayButton}</button>
        </footer>
      </>}
      <form hidden={confirm} onSubmit={async event => {
        event.preventDefault()
        if (lock.current) return
        lock.current = true
        setError('')
        setSaving(true)
        try {
          const message = await onSave(event.currentTarget)
          if (!message) { await close(); return }
          setError(message)
        } catch { setError(labels.genericError) }
        lock.current = false
        setSaving(false)
      }}>
        <fieldset className="profile-editor__body" disabled={saving}>{children}
          {error && <p className="error-banner" role="alert">{error}</p>}
        </fieldset>
        <footer className="profile-editor__footer">
          <button type="button" className="secondary-button" disabled={saving} onClick={requestClose}>{labels.cancel}</button>
          <button type="submit" className="primary-button" disabled={saving}>{saving ? m.social.savingContact : labels.save}</button>
        </footer>
      </form>
    </dialog>, document.body,
  )
}
