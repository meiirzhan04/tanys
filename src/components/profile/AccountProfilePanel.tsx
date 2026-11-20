import { useState } from 'react'
import type { FormEvent } from 'react'
import { getMessages } from '../../i18n/messages'
import type { Locale } from '../../matching/types'
import { parseProfileTopics } from '../profileDirty'
import type { EventProfileDraft } from '../profileDirty'
import { profileCopy } from './profileCopy'
import { ProfileOverview } from './ProfileOverview'
import type { ProfileSnapshot } from './profileCompleteness'

interface AccountProfilePanelProps {
  locale: Locale
  savedProfile: EventProfileDraft | null
  username?: string
  eventName?: string
  isOrganizer: boolean
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
  onLogout: () => void
  onLeaveEvent: () => void
  onDeleteAccount: () => void
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
  const [contactInput, setContactInput] = useState('')
  const busy = loggingOut || leavingEvent || deletingAccount

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
          <button type="button" className="secondary-button" disabled={busy} onClick={onLogout}>
            {loggingOut ? messages.account.loggingOut : messages.account.logout}
          </button>
          {hasEvent && (
            <button type="button" className="danger-outline" disabled={busy} onClick={onLeaveEvent}>
              {leavingEvent ? messages.account.leavingEvent : messages.account.leaveEvent}
            </button>
          )}
          <button type="button" className="danger-outline" disabled={busy} onClick={onDeleteAccount}>
            {deletingAccount ? messages.account.deletingAccount : messages.account.deleteAccount}
          </button>
        </div>
      </section>
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
