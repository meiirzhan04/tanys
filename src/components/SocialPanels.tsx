import { useState } from 'react'
import type { FormEvent } from 'react'
import type {
  CommonSlot,
  IntroductionItem,
  IntroductionStatus,
  ServerMeeting,
  ServerMeetingStatus,
} from '../api/client'
import { getMessages } from '../i18n/messages'
import type { Locale } from '../matching/types'
import { formatMeetingInterval } from './socialHelpers'
import type { SocialNotification } from './socialHelpers'

function introStatusText(status: IntroductionStatus, locale: Locale): string {
  const s = getMessages(locale).social
  switch (status) {
    case 'pending': return s.statusPending
    case 'accepted': return s.statusAccepted
    case 'declined': return s.statusDeclined
    case 'withdrawn': return s.statusWithdrawn
  }
}

function meetingStatusText(status: ServerMeetingStatus, locale: Locale): string {
  const s = getMessages(locale).social
  switch (status) {
    case 'pending': return s.meetingPending
    case 'confirmed': return s.meetingConfirmed
    case 'declined': return s.meetingDeclined
    case 'cancelled': return s.meetingCancelled
  }
}

function renderNotificationText(item: SocialNotification, locale: Locale): string {
  const n = getMessages(locale).social.notifications
  switch (item.kind) {
    case 'new_incoming_intro': return n.newIncomingIntro(item.actorName)
    case 'intro_accepted': return n.introAccepted(item.actorName)
    case 'new_meeting_invite': return n.newMeetingInvite(item.actorName)
    case 'meeting_confirmed': return n.meetingConfirmed(item.actorName)
    case 'meeting_cancelled': return n.meetingCancelled(item.actorName)
  }
}

export function NotificationBanner({
  notifications,
  locale,
  onDismiss,
}: {
  notifications: readonly SocialNotification[]
  locale: Locale
  onDismiss: () => void
}) {
  if (!notifications.length) return null
  const s = getMessages(locale).social
  return (
    <div className="notification-banner" role="status" aria-live="polite">
      <ul>
        {notifications.map(item => (
          <li key={item.id}>{renderNotificationText(item, locale)}</li>
        ))}
      </ul>
      <button type="button" className="text-button" onClick={onDismiss}>{s.dismissNotification}</button>
    </div>
  )
}

export interface IntroductionsPanelProps {
  introductions: readonly IntroductionItem[]
  locale: Locale
  timeZone: string
  busyIntroId: string
  slotsByIntroId: Readonly<Record<string, readonly CommonSlot[]>>
  loadingSlotsIntroId: string
  proposingSlotKey: string
  contactValue: string
  savingContact: boolean
  contactSaved: boolean
  socialError: string
  socialNotice: string
  onSaveContact: (value: string) => Promise<boolean>
  onUpdateIntro: (introId: string, status: Exclude<IntroductionStatus, 'pending'>) => void
  onToggleSlots: (introId: string) => void
  onProposeMeeting: (introId: string, slotId: string) => void
  onRefresh: () => void
  refreshing: boolean
}

export function IntroductionsPanel({
  introductions,
  locale,
  timeZone,
  busyIntroId,
  slotsByIntroId,
  loadingSlotsIntroId,
  proposingSlotKey,
  contactValue,
  savingContact,
  contactSaved,
  socialError,
  socialNotice,
  onSaveContact,
  onUpdateIntro,
  onToggleSlots,
  onProposeMeeting,
  onRefresh,
  refreshing,
}: IntroductionsPanelProps) {
  const s = getMessages(locale).social
  const [contactInput, setContactInput] = useState('')
  const incoming = introductions.filter(item => item.direction === 'incoming')
  const outgoing = introductions.filter(item => item.direction === 'outgoing')

  async function submitContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (savingContact || !contactInput.trim()) return
    if (await onSaveContact(contactInput.trim())) setContactInput('')
  }

  function renderIntroCard(item: IntroductionItem) {
    const isBusy = busyIntroId === item.id
    const slots = slotsByIntroId[item.id]
    const isSlotsOpen = slots !== undefined || loadingSlotsIntroId === item.id

    return (
      <article key={item.id} className="social-card surface" data-intro-id={item.id}>
        <div className="social-card__header">
          <div>
            <h3>{item.participantName || item.participantId || item.id}</h3>
            {item.participantRole && <p className="social-card__role">{item.participantRole}</p>}
          </div>
          <span className={`status-badge status-badge--${item.status}`}>
            {introStatusText(item.status, locale)}
          </span>
        </div>

        {item.status === 'pending' && item.direction === 'incoming' && (
          <div className="social-card__actions">
            <button
              type="button"
              className="primary-button"
              disabled={isBusy}
              onClick={() => onUpdateIntro(item.id, 'accepted')}
            >{s.accept}</button>
            <button
              type="button"
              className="secondary-button"
              disabled={isBusy}
              onClick={() => onUpdateIntro(item.id, 'declined')}
            >{s.decline}</button>
          </div>
        )}

        {item.status === 'pending' && item.direction === 'outgoing' && (
          <div className="social-card__actions">
            <button
              type="button"
              className="secondary-button"
              disabled={isBusy}
              onClick={() => onUpdateIntro(item.id, 'withdrawn')}
            >{s.withdraw}</button>
          </div>
        )}

        {item.status === 'accepted' && (
          <div className="social-card__accepted">
            <div className="contact-reveal">
              <strong>{s.sharedContactLabel}:</strong>{' '}
              <span>{item.contact?.trim() ? item.contact : s.contactNotShared}</span>
            </div>
            <div className="social-card__actions">
              <button
                type="button"
                className="secondary-button"
                aria-expanded={isSlotsOpen}
                onClick={() => onToggleSlots(item.id)}
              >{isSlotsOpen ? s.hideSlots : s.proposeMeeting}</button>
            </div>

            {loadingSlotsIntroId === item.id && (
              <p className="social-card__hint" role="status">{s.loadingSlots}</p>
            )}

            {slots && (
              <div className="social-slots">
                {slots.length === 0 ? (
                  <p className="social-card__hint">{s.noCommonSlots}</p>
                ) : (
                  <div className="meeting-picker__slots">
                    {slots.map(slot => {
                      const slotKey = `${item.id}:${slot.id}`
                      const label = formatMeetingInterval(slot.start, slot.end, timeZone, locale)
                      return (
                        <button
                          key={slot.id}
                          type="button"
                          className="meeting-slot-btn"
                          disabled={proposingSlotKey === slotKey}
                          onClick={() => onProposeMeeting(item.id, slot.id)}
                        >{label}</button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </article>
    )
  }

  return (
    <section className="social-section" aria-labelledby="introductions-title">
      <div className="page-heading">
        <h1 id="introductions-title" tabIndex={-1}>{s.introTitle}</h1>
        <button type="button" className="secondary-button" disabled={refreshing} onClick={onRefresh}>
          {refreshing ? s.refreshing : s.refresh}
        </button>
      </div>

      {socialError && <div className="error-banner" role="alert">{socialError}</div>}
      {socialNotice && <div className="info-banner" role="status">{socialNotice}</div>}

      <div className="bento-grid social-bento-grid">
        <form className="surface contact-panel bento-card--wide" onSubmit={submitContact}>
          <label className="field">
            <span>{s.contactLabel}</span>
            <div className="contact-row">
              <input
                name="contact"
                maxLength={160}
                placeholder={s.contactPlaceholder}
                value={contactInput}
                disabled={savingContact}
                onChange={event => setContactInput(event.target.value)}
              />
              <button type="submit" className="secondary-button" disabled={savingContact || !contactInput.trim()}>
                {savingContact ? s.savingContact : s.saveContact}
              </button>
            </div>
          </label>
          <p className="privacy-box__note">{s.contactNotice}</p>
          {contactSaved && <p className="copy-status" role="status">{s.contactSaved}</p>}
          {contactValue && <p className="contact-reveal"><strong>{s.currentContact}</strong> {contactValue}</p>}
        </form>

        <div className="social-group bento-card">
          <h2>{s.incomingHeading}</h2>
          {incoming.length ? (
            <div className="social-list">{incoming.map(renderIntroCard)}</div>
          ) : (
            <div className="surface empty-state"><p>{s.noIncoming}</p></div>
          )}
        </div>

        <div className="social-group bento-card">
          <h2>{s.outgoingHeading}</h2>
          {outgoing.length ? (
            <div className="social-list">{outgoing.map(renderIntroCard)}</div>
          ) : (
            <div className="surface empty-state"><p>{s.noOutgoing}</p></div>
          )}
        </div>
      </div>
    </section>
  )
}

export interface ServerMeetingsPanelProps {
  meetings: readonly ServerMeeting[]
  locale: Locale
  timeZone: string
  busyMeetingId: string
  socialError: string
  socialNotice: string
  onUpdateMeeting: (meetingId: string, status: Exclude<ServerMeetingStatus, 'pending'>) => void
  onRefresh: () => void
  refreshing: boolean
}

export function ServerMeetingsPanel({
  meetings,
  locale,
  timeZone,
  busyMeetingId,
  socialError,
  socialNotice,
  onUpdateMeeting,
  onRefresh,
  refreshing,
}: ServerMeetingsPanelProps) {
  const s = getMessages(locale).social

  return (
    <section className="social-section" aria-labelledby="server-meetings-title">
      <div className="page-heading">
        <h1 id="server-meetings-title" tabIndex={-1}>{s.meetingsTitle}</h1>
        <button type="button" className="secondary-button" disabled={refreshing} onClick={onRefresh}>
          {refreshing ? s.refreshing : s.refresh}
        </button>
      </div>

      {socialError && <div className="error-banner" role="alert">{socialError}</div>}
      {socialNotice && <div className="info-banner" role="status">{socialNotice}</div>}

      {meetings.length === 0 ? (
        <div className="surface empty-state"><p>{s.noMeetings}</p></div>
      ) : (
        <div className="social-list">
          {meetings.map(meeting => {
            const isBusy = busyMeetingId === meeting.id
            const interval = formatMeetingInterval(meeting.start, meeting.end, timeZone, locale) || meeting.slotId || ''
            return (
              <article key={meeting.id} className="social-card surface" data-meeting-id={meeting.id}>
                <div className="social-card__header">
                  <div>
                    <h3>{interval}</h3>
                    <p className="social-card__role">
                      {meeting.participantName || meeting.introductionId}
                      {meeting.participantRole ? ` · ${meeting.participantRole}` : ''}
                    </p>
                  </div>
                  <span className={`status-badge status-badge--${meeting.status}`}>
                    {meetingStatusText(meeting.status, locale)}
                  </span>
                </div>

                {meeting.status === 'pending' && (
                  <div className="social-card__actions">
                    {meeting.direction !== 'outgoing' && (
                      <>
                        <button
                          type="button"
                          className="primary-button"
                          disabled={isBusy}
                          onClick={() => onUpdateMeeting(meeting.id, 'confirmed')}
                        >{s.confirm}</button>
                        <button
                          type="button"
                          className="secondary-button"
                          disabled={isBusy}
                          onClick={() => onUpdateMeeting(meeting.id, 'declined')}
                        >{s.decline}</button>
                      </>
                    )}
                    <button
                      type="button"
                      className="meeting-slot-cancel"
                      disabled={isBusy}
                      onClick={() => onUpdateMeeting(meeting.id, 'cancelled')}
                    >{s.cancel}</button>
                  </div>
                )}

                {meeting.status === 'confirmed' && (
                  <div className="social-card__actions">
                    <button
                      type="button"
                      className="meeting-slot-cancel"
                      disabled={isBusy}
                      onClick={() => onUpdateMeeting(meeting.id, 'cancelled')}
                    >{s.cancel}</button>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
