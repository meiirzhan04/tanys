import { useState } from 'react'
import type { FormEvent } from 'react'
import { getMessages } from '../../i18n/messages'
import type { Locale } from '../../matching/types'
import { parseProfileTopics } from '../profileDirty'
import type { EventProfileDraft } from '../profileDirty'
import { profileCopy } from './profileCopy'
import { accountDialogCopy } from './accountDialogCopy'
import { ConfirmDialog } from './ConfirmDialog'
import { ProfileOverview } from './ProfileOverview'
import type { ProfileSnapshot } from './profileCompleteness'

interface AccountProfilePanelProps {
  locale: Locale
  savedProfile: EventProfileDraft | null
  username?: string
  eventName?: string
  isOrganizer: boolean
  /** True when the user organizes any event: the server refuses to delete such an account. */
  organizesAnyEvent: boolean
  hasEvent: boolean
  recommendationsCount: number
  introductionsCount: number
  meetingsCount: number
  contactValue: string
  savingContact: boolean
  contactSaved: boolean
  onSaveContact: (value: string) => Promise<boolean>
  onEdit: () => void
  onShowMatches?: () => void
  onLogout: () => Promise<void>
  /** Resolves with an error message, or an empty string after the server confirmed the action. */
  onLeaveEvent: () => Promise<string>
  onDeleteAccount: () => Promise<string>
  loggingOut: boolean
  leavingEvent: boolean
  deletingAccount: boolean
}

function toSnapshot(draft: EventProfileDraft): ProfileSnapshot {
  const years = Number(draft.experience)
  return {
    goal: draft.goal,
    role: draft.role,
    experienceYears: draft.experience.trim() !== '' && Number.isInteger(years) ? years : null,
    skills: parseProfileTopics(draft.skills),
    interests: parseProfileTopics(draft.interests),
    about: draft.about,
    lookingFor: parseProfileTopics(draft.lookingFor),
  }
}

export function AccountProfilePanel({
  locale,
  savedProfile,
  username,
  eventName,
  isOrganizer,
  organizesAnyEvent,
  hasEvent,
  recommendationsCount,
  introductionsCount,
  meetingsCount,
  contactValue,
  savingContact,
  contactSaved,
  onSaveContact,
  onEdit,
  onShowMatches,
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
  const [contactInput, setContactInput] = useState('')
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

  async function submitContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = contactInput.trim()
    if (savingContact || !value) return
    if (await onSaveContact(value)) setContactInput('')
  }

  const aside = (
    <>
      <section className="surface profile-card" aria-labelledby="me-account-title">
        <h2 id="me-account-title">{t.accountTitle}</h2>
        {username && (
          <div className="profile-account-row">
            <span>{t.signedInAs}</span>
            <strong>{username}</strong>
          </div>
        )}
        <div className="profile-account-row">
          <span>{t.eventLabel}</span>
          <strong>{hasEvent ? `${eventName || '—'} · ${isOrganizer ? t.roleOrganizer : t.roleParticipant}` : t.noEvent}</strong>
        </div>
      </section>

      <section className="surface profile-card" aria-labelledby="me-contact-title">
        <h2 id="me-contact-title">{t.contactTitle}</h2>
        <p>{messages.social.contactNotice}</p>
        <p>{contactValue ? `${t.contactCurrent} ${contactValue}` : t.contactNone}</p>
        <form className="profile-contact-form" onSubmit={submitContact}>
          <label className="visually-hidden" htmlFor="me-contact-input">{messages.social.contactLabel}</label>
          <input
            id="me-contact-input"
            name="profileContact"
            maxLength={120}
            placeholder={messages.social.contactPlaceholder}
            value={contactInput}
            disabled={savingContact}
            onChange={event => setContactInput(event.target.value)}
          />
          <button type="submit" className="secondary-button" disabled={savingContact || !contactInput.trim()}>
            {t.contactSave}
          </button>
          {contactSaved && <span className="copy-status" role="status">{messages.social.contactSaved}</span>}
        </form>
      </section>

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
    </>
  )

  return (
    <ProfileOverview
      locale={locale}
      profile={savedProfile ? toSnapshot(savedProfile) : null}
      displayName={savedProfile?.name}
      visible={savedProfile ? savedProfile.visible : undefined}
      stats={[
        { value: recommendationsCount, label: t.statRecommendations },
        { value: introductionsCount, label: t.statIntroductions },
        { value: meetingsCount, label: t.statMeetings },
      ]}
      onEdit={onEdit}
      onShowMatches={onShowMatches}
      aside={aside}
    />
  )
}
