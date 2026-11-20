import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { getMessages } from '../../i18n/messages'
import type { Locale } from '../../matching/types'
import type { AccountProfile } from '../../api/client'
import { accountLabels } from './accountLabels'
import type { EventProfileDraft } from '../profileDirty'
import { profileCopy } from './profileCopy'
import { accountDialogCopy } from './accountDialogCopy'
import { ConfirmDialog } from './ConfirmDialog'
import { EditFieldDialog } from './EditFieldDialog'
import { identityCopy } from './identityCopy'

interface AccountProfilePanelProps {
  locale: Locale
  eventToolbar: ReactNode
  readAccount: () => Promise<AccountProfile>
  saveAccount: (profile: AccountProfile) => Promise<AccountProfile>
  source: EventProfileDraft | null
  username?: string
  eventName?: string
  isOrganizer: boolean
  /** True when the user organizes any event: the server refuses to delete such an account. */
  organizesAnyEvent: boolean
  hasEvent: boolean
  contactValue: string
  /** Public @handle, or null when not set yet. */
  handle: string | null
  /** Both resolve with an error message, or '' once the server saved the value. */
  onSaveContact: (value: string) => Promise<string>
  onSaveHandle: (value: string) => Promise<string>
  onLogout: () => Promise<void>
  /** Resolves with an error message, or an empty string after the server confirmed the action. */
  onLeaveEvent: () => Promise<string>
  onDeleteAccount: () => Promise<string>
  loggingOut: boolean
  leavingEvent: boolean
  deletingAccount: boolean
}

export function AccountProfilePanel({
  locale,
  eventToolbar,
  readAccount,
  saveAccount,
  source,
  username,
  eventName,
  isOrganizer,
  organizesAnyEvent,
  hasEvent,
  contactValue,
  handle,
  onSaveContact,
  onSaveHandle,
  onLogout,
  onLeaveEvent,
  onDeleteAccount,
  loggingOut,
  leavingEvent,
  deletingAccount,
}: AccountProfilePanelProps) {
  const t = profileCopy[locale]
  const messages = getMessages(locale)
  const d = accountDialogCopy[locale]
  const ic = identityCopy[locale]
  const [editing, setEditing] = useState<'handle' | 'contact' | null>(null)
  const [dialog, setDialog] = useState<'logout' | 'leave' | 'delete' | null>(null)
  const [dialogError, setDialogError] = useState('')
  const busy = loggingOut || leavingEvent || deletingAccount
  const eventLabel = eventName || '—'

  function openDialog(next: 'logout' | 'leave' | 'delete') {
    setDialogError('')
    setDialog(next)
  }

  async function confirmDialog() {
    if (dialog === 'logout') {
      await onLogout()
      return
    }
    const error = dialog === 'leave' ? await onLeaveEvent() : await onDeleteAccount()
    if (error) setDialogError(error)
    else setDialog(null)
  }


  const labels = accountLabels[locale]
  const [draft, setDraft] = useState<AccountProfile | null>(null)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    readAccount().then(profile => { if (active) setDraft(profile) })
      .catch(() => { if (active) setStatus('error') })
    return () => { active = false }
  }, [readAccount, attempt])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!draft || status === 'saving') return
    setStatus('saving')
    try {
      setDraft(await saveAccount(draft))
      setStatus('saved')
    } catch { setStatus('error') }
  }

  return (
    <div className="account-settings">
      <header className="account-settings__header">
        <div>
          <h1 id="me-title">{t.navLabel}</h1>
          {username && <p>{t.signedInAs} <strong>{username}</strong></p>}
        </div>
        {username && <span className="account-initial" aria-hidden="true">{Array.from(username)[0]?.toUpperCase()}</span>}
      </header>

      <div className="account-settings__grid">
        <form className="surface profile-card account-profile-form" onSubmit={submit}>
          <h2>{labels.details}</h2>
          <p>{labels.scope}</p>
          {draft && <fieldset disabled={status === 'saving'}>
            <label className="field"><span>{labels.name}</span><input name="accountName" required maxLength={80} value={draft.name}
              onChange={e => { setDraft({ ...draft, name: e.target.value }); setStatus('idle') }} /></label>
            <label className="field"><span>{labels.profession}</span><input name="accountProfession" maxLength={80} value={draft.profession}
              onChange={e => { setDraft({ ...draft, profession: e.target.value }); setStatus('idle') }} /></label>
            <label className="field field-full"><span>{t.about}</span><textarea name="accountAbout" rows={4} maxLength={400} value={draft.about}
              onChange={e => { setDraft({ ...draft, about: e.target.value }); setStatus('idle') }} /></label>
            <div className="account-save">
              <button type="submit" className="primary-button">{labels.save}</button>
              {status === 'saved' && <span role="status">{labels.saved}</span>}
            </div>
          </fieldset>}
          {status === 'error' && <p role="alert">{labels.error} {!draft && <button type="button" onClick={() => {
            setStatus('idle')
            setAttempt(value => value + 1)
          }}>{labels.retry}</button>}</p>}
        </form>
        <div className="identity-cards">
          <section className="surface identity-card" aria-labelledby="me-handle-title">
            <div className="identity-card__head">
              <h2 id="me-handle-title">{ic.handleTitle}</h2>
              <button type="button" className="icon-button" data-edit="handle" aria-label={ic.editHandle} onClick={() => setEditing('handle')}>
                <PencilIcon />
              </button>
            </div>
            <p className={`identity-card__value ${handle ? '' : 'identity-card__value--empty'}`}>{handle ? `@${handle}` : ic.handleNone}</p>
            <p className="identity-card__note">{ic.handleHint}</p>
          </section>
          <section className="surface identity-card" aria-labelledby="me-contact-title">
            <div className="identity-card__head">
              <h2 id="me-contact-title">{ic.contactTitle}</h2>
              <button type="button" className="icon-button" data-edit="contact" aria-label={ic.editContact} onClick={() => setEditing('contact')}>
                <PencilIcon />
              </button>
            </div>
            <p className={`identity-card__value ${contactValue ? '' : 'identity-card__value--empty'}`} data-contact-value>{contactValue || ic.contactNone}</p>
            <p className="lock-note">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.8" /><path d="M8 11V8a4 4 0 1 1 8 0v3" stroke="currentColor" strokeWidth="1.8" /></svg>
              {ic.contactLock}
            </p>
            <details className="identity-card__help">
              <summary>{ic.contactHelpSummary}</summary>
              <p>{ic.contactHelp}</p>
            </details>
          </section>
        </div>
        {editing === 'handle' && (
          <EditFieldDialog
            title={ic.editHandle}
            label={ic.handleLabel}
            name="handle"
            initialValue={handle ?? ''}
            placeholder="parasat"
            hint={ic.handleRules}
            maxLength={33}
            saveLabel={ic.save}
            cancelLabel={ic.cancel}
            onSave={onSaveHandle}
            onClose={() => setEditing(null)}
          />
        )}
        {editing === 'contact' && (
          <EditFieldDialog
            title={ic.editContact}
            label={ic.contactLabel}
            name="profileContact"
            initialValue={contactValue}
            placeholder={ic.contactPlaceholder}
            hint={<><p>{ic.contactLock}</p><p>{ic.contactHelp}</p></>}
            maxLength={256}
            saveLabel={ic.save}
            cancelLabel={ic.cancel}
            clearLabel={ic.remove}
            onSave={onSaveContact}
            onClose={() => setEditing(null)}
          />
        )}
      </div>

      {eventToolbar && <section className="surface profile-card account-import">
        <h2>{labels.event}</h2>
        <div className="account-import__controls">
          {eventToolbar}
          {source && draft && <button type="button" disabled={status === 'saving'} className="secondary-button" onClick={() => {
            setDraft({ name: source.name, profession: source.role, about: source.about })
            setStatus('idle')
          }} aria-label={`${labels.copy} · ${eventName}`}>{labels.copy}</button>}
        </div>
      </section>}

      <section className="surface profile-card profile-danger" aria-labelledby="me-danger-title">
        <h2 id="me-danger-title">{t.dangerTitle}</h2>
        <p>{t.dangerHint}</p>
        <div className="profile-danger__actions">
          <button type="button" className="secondary-button account-action" data-action="logout" disabled={busy} onClick={() => openDialog('logout')}>
            <svg className="account-action__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
              <path d="M13 4H6.5A1.5 1.5 0 0 0 5 5.5v13A1.5 1.5 0 0 0 6.5 20H13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M10 12h10m0 0-3.2-3.2M20 12l-3.2 3.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {loggingOut ? messages.account.loggingOut : messages.account.logout}
          </button>
          {hasEvent && !isOrganizer && (
            <button type="button" className="danger-outline account-action" data-action="leave" disabled={busy} onClick={() => openDialog('leave')}>
              {leavingEvent ? messages.account.leavingEvent : messages.account.leaveEvent}
            </button>
          )}
          {hasEvent && isOrganizer && <p className="profile-danger__note">{d.leaveOrganizerNote}</p>}
          <button type="button" className="danger-outline account-action" data-action="delete" disabled={busy} onClick={() => openDialog('delete')}>
            {deletingAccount ? messages.account.deletingAccount : messages.account.deleteAccount}
          </button>
        </div>
      </section>

      {dialog === 'logout' && (
        <ConfirmDialog
          title={d.logoutTitle}
          confirmLabel={messages.account.logout}
          cancelLabel={d.cancel}
          tone="neutral"
          busy={loggingOut}
          onConfirm={() => void confirmDialog()}
          onCancel={() => setDialog(null)}
        >
          <p className="qr-modal__hint">{d.logoutBody}</p>
          <p className="qr-modal__hint">{d.logoutNote}</p>
        </ConfirmDialog>
      )}
      {dialog === 'leave' && (
        <ConfirmDialog
          title={d.leaveTitle(eventLabel)}
          confirmLabel={messages.account.leaveEvent}
          cancelLabel={d.cancel}
          tone="danger"
          busy={leavingEvent}
          error={dialogError}
          onConfirm={() => void confirmDialog()}
          onCancel={() => setDialog(null)}
        >
          <p className="qr-modal__hint">{d.leaveBody(eventLabel)}</p>
        </ConfirmDialog>
      )}
      {dialog === 'delete' && (
        <ConfirmDialog
          title={d.deleteTitle}
          confirmLabel={messages.account.deleteAccount}
          cancelLabel={d.cancel}
          tone="danger"
          busy={deletingAccount}
          blockedReason={organizesAnyEvent ? d.deleteBlockedOrganizer : undefined}
          error={dialogError}
          onConfirm={() => void confirmDialog()}
          onCancel={() => setDialog(null)}
        >
          <p className="qr-modal__hint">{d.deleteIntro}</p>
          <ul className="confirm-dialog__list">
            {d.deleteItems.map(item => <li key={item}>{item}</li>)}
          </ul>
          <p className="confirm-dialog__warning">{d.deleteWarning}</p>
        </ConfirmDialog>
      )}
    </div>
  )
}

function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="m13.5 6.5 4 4" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}
