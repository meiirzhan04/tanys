import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { getMessages } from '../../i18n/messages'
import type { Locale } from '../../matching/types'
import type { AccountProfile } from '../../api/client'
import { accountLabels } from './accountLabels'
import type { EventProfileDraft } from '../profileDirty'
import { profileCopy } from './profileCopy'
import { accountDialogCopy } from './accountDialogCopy'
import { ConfirmDialog } from './ConfirmDialog'
import { EventEditor, IdentityEditor, PersonalEditor } from './AccountEditors'
import { profileEditorCopy } from './profileEditorCopy'
import { getGoalLabels } from '../goalLabels'
import { identityCopy } from './identityCopy'

interface AccountProfilePanelProps {
  locale: Locale
  eventToolbar: ReactNode
  readAccount: () => Promise<AccountProfile>
  saveAccount: (profile: AccountProfile) => Promise<AccountProfile>
  source: EventProfileDraft | null
  eventDraft: EventProfileDraft | null
  saveEvent: (draft: EventProfileDraft) => Promise<void>
  contact: string
  contactState: 'loading' | 'error' | 'ready'
  retryContact: () => void
  onSaveContact: (value: string) => Promise<string>
  username?: string
  eventName?: string
  isOrganizer: boolean
  /** True when the user organizes any event: the server refuses to delete such an account. */
  organizesAnyEvent: boolean
  hasEvent: boolean
  /** Public @handle, or null when not set yet. */
  handle: string | null
  onSaveHandle: (value: string) => Promise<string>
  onLogout: () => void
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
  source, eventDraft, saveEvent, contact, contactState, retryContact, onSaveContact,
  username,
  eventName,
  isOrganizer,
  organizesAnyEvent,
  hasEvent,
  handle,
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
  const copy = profileEditorCopy[locale]
  const [editor, setEditor] = useState<'personal' | 'contact' | 'handle' | 'event' | null>(null)
  const [initialPersonal, setInitialPersonal] = useState<AccountProfile | null>(null)
  const [notice, setNotice] = useState('')
  const open = (section: NonNullable<typeof editor>) => {
    setNotice('')
    setEditor(section)
  }
  const [dialog, setDialog] = useState<'leave' | 'delete' | null>(null)
  const [dialogError, setDialogError] = useState('')
  const busy = loggingOut || leavingEvent || deletingAccount
  const eventLabel = eventName || '—'

  function openDialog(next: 'leave' | 'delete') {
    setDialogError('')
    setDialog(next)
  }

  async function confirmDialog() {
    const error = dialog === 'leave' ? await onLeaveEvent() : await onDeleteAccount()
    if (error) setDialogError(error)
    else setDialog(null)
  }


  const labels = accountLabels[locale]
  const [profile, setProfile] = useState<AccountProfile | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    setLoadError(false)
    readAccount().then(value => { if (active) setProfile(value) })
      .catch(() => { if (active) setLoadError(true) })
    return () => { active = false }
  }, [readAccount, attempt])

  function editPersonal(initial: AccountProfile) {
    setInitialPersonal(initial)
    open('personal')
  }

  function editButton(kind: NonNullable<typeof editor>, label: string, action: () => void) {
    return <button type="button" className="icon-button" data-edit={kind} aria-label={label}
      onClick={event => { event.currentTarget.focus(); action() }}><PencilIcon /></button>
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
        <section className="surface profile-card account-personal" aria-labelledby="me-details-title">
          <div className="identity-card__head">
            <h2 id="me-details-title">{labels.details}</h2>
            {profile && editButton('personal', copy.personal, () => editPersonal(profile))}
          </div>
          {profile ? <>
            <dl className="account-facts">
              <div><dt>{labels.name}</dt><dd>{profile.name || t.noValue}</dd></div>
              <div><dt>{labels.profession}</dt><dd>{profile.profession || t.noValue}</dd></div>
              <div><dt>{t.about}</dt><dd>{profile.about || t.noValue}</dd></div>
            </dl>
            <p className="identity-card__note account-scope">{labels.scope}</p>
          </> : loadError ? <p role="alert">{labels.error}{' '}
            <button type="button" className="text-button" onClick={() => setAttempt(value => value + 1)}>{labels.retry}</button>
          </p> : <p role="status">{copy.loading}</p>}
        </section>
        <div className="identity-cards">
          <section className="surface identity-card" aria-labelledby="me-contact-title">
            <div className="identity-card__head">
              <h2 id="me-contact-title">{t.contactTitle}</h2>
              {contactState === 'ready' && editButton('contact', ic.editContact, () => open('contact'))}
            </div>
            {contactState === 'error' ? <p role="alert">{copy.contactError}{' '}
              <button type="button" className="text-button" onClick={retryContact}>{labels.retry}</button></p>
              : <p className={contact ? 'identity-card__value' : 'identity-card__value--empty'} data-contact-value>
                {contactState === 'loading' ? copy.loading : contact || ic.contactNone}
              </p>}
            <p className="identity-card__note">{ic.contactLock}</p>
          </section>
          <section className="surface identity-card" aria-labelledby="me-handle-title">
            <div className="identity-card__head">
              <h2 id="me-handle-title">{ic.handleTitle}</h2>
              {editButton('handle', ic.editHandle, () => open('handle'))}
            </div>
            <p className={handle ? 'identity-card__value' : 'identity-card__value--empty'}>{handle ? `@${handle}` : ic.handleNone}</p>
            <p className="identity-card__note">{ic.handleHint}</p>
          </section>
        </div>
      </div>

      {eventToolbar && <section className="surface profile-card account-import">
        <div className="identity-card__head">
          <h2>{labels.event}</h2>
          {eventDraft && editButton('event', t.editProfile, () => open('event'))}
        </div>
        <div className="account-import__controls">
          {eventToolbar}
          {source && profile && <button type="button" className="secondary-button" data-copy-profile
            onClick={event => {
              event.currentTarget.focus()
              editPersonal({ name: source.name, profession: source.role, about: source.about })
            }} aria-label={`${labels.copy} · ${eventName}`}>{labels.copy}</button>}
        </div>
        {source ? <div className="account-event-summary">
          <strong>{source.name}</strong>
          <span>{[source.role, source.goal && getGoalLabels(locale)[source.goal]].filter(Boolean).join(' · ')}</span>
          <span className="identity-card__note">{source.visible ? t.visible : t.hidden}</span>
        </div> : <p className="identity-card__note">{copy.noEventProfile}</p>}
      </section>}

      {notice && <p className="account-notice" role="status">{notice}</p>}
      {editor === 'personal' && initialPersonal && profile && <PersonalEditor locale={locale} initial={initialPersonal} saved={profile}
        onClose={() => setEditor(null)} onSave={async next => {
          setProfile(await saveAccount(next))
          setNotice(labels.saved)
        }} />}
      {(editor === 'contact' || editor === 'handle') && <IdentityEditor locale={locale} kind={editor}
        initial={editor === 'contact' ? contact : handle ?? ''} onClose={() => setEditor(null)} onSave={async value => {
          const error = await (editor === 'contact' ? onSaveContact : onSaveHandle)(value)
          if (!error) setNotice(editor === 'contact' ? messages.social.contactSaved : copy.saved)
          return error
        }} />}
      {editor === 'event' && eventDraft && <EventEditor locale={locale} eventName={eventName} initial={eventDraft}
        onClose={() => setEditor(null)} onSave={async value => {
          await saveEvent(value)
          setNotice(copy.saved)
        }} />}

      <section className="surface profile-card profile-danger" aria-labelledby="me-danger-title">
        <h2 id="me-danger-title">{t.dangerTitle}</h2>
        <p>{t.dangerHint}</p>
        <div className="profile-danger__actions">
          <button type="button" className="secondary-button account-action" data-action="logout" disabled={busy} onClick={onLogout}>
            <svg className="account-action__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
              <path d="M13 4H6.5A1.5 1.5 0 0 0 5 5.5v13A1.5 1.5 0 0 0 6.5 20H13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M10 12h10m0 0-3.2-3.2M20 12l-3.2 3.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {loggingOut ? messages.account.loggingOut : d.logoutAction}
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
