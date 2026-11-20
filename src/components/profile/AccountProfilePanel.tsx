import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { getMessages } from '../../i18n/messages'
import type { Locale } from '../../matching/types'
import type { AccountProfile } from '../../api/client'
import { accountLabels } from './accountLabels'
import type { EventProfileDraft } from '../profileDirty'
import { profileCopy } from './profileCopy'
interface AccountProfilePanelProps {
  locale: Locale
  readAccount: () => Promise<AccountProfile>
  saveAccount: (profile: AccountProfile) => Promise<AccountProfile>
  source: EventProfileDraft | null
  username?: string
  eventName?: string
  hasEvent: boolean
  contactValue: string
  savingContact: boolean
  contactSaved: boolean
  onSaveContact: (value: string) => Promise<boolean>
  onLogout: () => void
  onLeaveEvent: () => void
  onDeleteAccount: () => void
  loggingOut: boolean
  leavingEvent: boolean
  deletingAccount: boolean
}

export function AccountProfilePanel({
  locale,
  readAccount,
  saveAccount,
  source,
  username,
  eventName,
  hasEvent,
  contactValue,
  savingContact,
  contactSaved,
  onSaveContact,
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
    <>
      <h1 id="me-title">{t.navLabel}</h1>
      <form className="surface profile-card account-profile-form" onSubmit={submit}>
        {draft && <fieldset disabled={status === 'saving'}>
          <label>{labels.name}<input name="accountName" required maxLength={80} value={draft.name}
            onChange={e => { setDraft({ ...draft, name: e.target.value }); setStatus('idle') }} /></label>
          <label>{labels.profession}<input name="accountProfession" maxLength={80} value={draft.profession}
            onChange={e => { setDraft({ ...draft, profession: e.target.value }); setStatus('idle') }} /></label>
          <label>{t.about}<textarea name="accountAbout" maxLength={400} value={draft.about}
            onChange={e => { setDraft({ ...draft, about: e.target.value }); setStatus('idle') }} /></label>
          {source && <button type="button" className="secondary-button" onClick={() => {
            setDraft({ name: source.name, profession: source.role, about: source.about })
            setStatus('idle')
          }}>{labels.copy} · {eventName}</button>}
          <button type="submit" className="primary-button">{labels.save}</button>
        </fieldset>}
        {status === 'saved' && <p role="status">{labels.saved}</p>}
        {status === 'error' && <p role="alert">{labels.error} {!draft && <button type="button" onClick={() => {
          setStatus('idle')
          setAttempt(value => value + 1)
        }}>{labels.retry}</button>}</p>}
      </form>
      <section className="surface profile-card" aria-labelledby="me-account-title">
        <h2 id="me-account-title">{t.accountTitle}</h2>
        {username && (
          <div className="profile-account-row">
            <span>{t.signedInAs}</span>
            <strong>{username}</strong>
          </div>
        )}
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

}
