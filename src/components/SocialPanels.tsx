import { EditFieldDialog } from './profile/EditFieldDialog'
import { identityCopy } from './profile/identityCopy'
import { useId, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type {
  CommonSlot,
  IntroductionItem,
  IntroductionStatus,
  ServerMeeting,
  ServerMeetingStatus,
  TanysApiClient,
} from '../api/client'
import { getMessages } from '../i18n/messages'
import type { Locale } from '../matching/types'
import { formatMeetingInterval } from './socialHelpers'
import type { SocialNotification } from './socialHelpers'
import { introStatusText } from './connections/introStatus'
import { connectionsCopy } from './connections/connectionsCopy'
import { ContactValue } from './connections/ContactValue'
import { initialsOf } from './connections/contactLink'
import { ParticipantSearch } from './connections/ParticipantSearch'

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
  api: TanysApiClient
  eventId: string
  introductions: readonly IntroductionItem[]
  locale: Locale
  timeZone: string
  busyIntroId: string
  slotsByIntroId: Readonly<Record<string, readonly CommonSlot[]>>
  loadingSlotsIntroId: string
  proposingSlotKey: string
  ownProfile: 'visible' | 'hidden' | 'missing'
  /** The viewer's own contact (owner-only); revealed to a person only after both agree. */
  contactValue: string
  socialError: string
  socialNotice: string
  onRequest: (userId: string, message: string) => Promise<string>
  onOpenQuestionnaire: () => void
  onSaveContact: (value: string) => Promise<string>
  /** Closed event: history stays visible, every write action is hidden. */
  readOnly?: boolean
  onUpdateIntro: (introId: string, status: Exclude<IntroductionStatus, 'pending'>) => void
  onToggleSlots: (introId: string) => void
  onProposeMeeting: (introId: string, slotId: string) => void
  onRefresh: () => void
  refreshing: boolean
}

type RequestTab = 'incoming' | 'outgoing'

export function IntroductionsPanel({
  api,
  eventId,
  introductions,
  locale,
  timeZone,
  busyIntroId,
  slotsByIntroId,
  loadingSlotsIntroId,
  proposingSlotKey,
  ownProfile,
  contactValue,
  socialError,
  socialNotice,
  onRequest,
  onOpenQuestionnaire,
  onSaveContact,
  readOnly = false,
  onUpdateIntro,
  onToggleSlots,
  onProposeMeeting,
  onRefresh,
  refreshing,
}: IntroductionsPanelProps) {
  const s = getMessages(locale).social
  const ic = identityCopy[locale]
  const [editingContact, setEditingContact] = useState(false)
  const c = connectionsCopy[locale]
  const incoming = introductions.filter(item => item.direction === 'incoming')
  const outgoing = introductions.filter(item => item.direction === 'outgoing')
  const pendingIncoming = incoming.filter(item => item.status === 'pending').length
  // Open the tab that needs attention first: pending incoming requests, otherwise where the history is.
  const preferredTab: RequestTab = pendingIncoming || !outgoing.length ? 'incoming' : 'outgoing'
  const [chosenTab, setChosenTab] = useState<RequestTab | null>(null)
  const tab = chosenTab ?? preferredTab
  const tabsId = useId()

  function showIntroduction(introId: string) {
    const item = introductions.find(intro => intro.id === introId)
    if (item) setChosenTab(item.direction)
    requestAnimationFrame(() => document.getElementById(`intro-${introId}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }))
  }

  function handleTabKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const next: RequestTab = tab === 'incoming' ? 'outgoing' : 'incoming'
    setChosenTab(next)
    requestAnimationFrame(() => document.getElementById(`${tabsId}-${next}`)?.focus())
  }

  function renderIntroCard(item: IntroductionItem) {
    const isBusy = busyIntroId === item.id
    const slots = slotsByIntroId[item.id]
    const isSlotsOpen = slots !== undefined || loadingSlotsIntroId === item.id
    const name = item.participantName || (item.participantHandle ? `@${item.participantHandle}` : item.id)

    return (
      <article key={item.id} id={`intro-${item.id}`} className="social-card surface request-card" data-intro-id={item.id}>
        <div className="social-card__header">
          <span className="person-avatar" aria-hidden="true">{initialsOf(item.participantName, item.participantHandle)}</span>
          <div className="request-card__id">
            <h3>{name}</h3>
            <p className="social-card__role">
              {[item.participantHandle ? `@${item.participantHandle}` : null, item.participantRole].filter(Boolean).join(' · ')}
            </p>
          </div>
          <span className={`status-badge status-badge--${item.status}`}>
            {introStatusText(item.status, locale)}
          </span>
        </div>

        {item.message && (
          <blockquote className="request-card__message">
            <span className="visually-hidden">{c.messageFrom}: </span>{item.message}
          </blockquote>
        )}

        {!readOnly && item.status === 'pending' && item.direction === 'incoming' && (
          <div className="social-card__actions">
            <button type="button" className="primary-button" disabled={isBusy} onClick={() => onUpdateIntro(item.id, 'accepted')}>{s.accept}</button>
            <button type="button" className="secondary-button" disabled={isBusy} onClick={() => onUpdateIntro(item.id, 'declined')}>{s.decline}</button>
          </div>
        )}

        {!readOnly && item.status === 'pending' && item.direction === 'outgoing' && (
          <div className="social-card__actions">
            <p className="social-card__hint">{c.sentPending}</p>
            <button type="button" className="secondary-button" disabled={isBusy} onClick={() => onUpdateIntro(item.id, 'withdrawn')}>{s.withdraw}</button>
          </div>
        )}

        {item.status === 'accepted' && (
          <div className="social-card__accepted">
            {item.icebreaker && (
              <div className="request-card__message">
                <strong>{getMessages(locale).results.icebreakerTitle}</strong>
                <p>{item.icebreaker}</p>
              </div>
            )}
            <div className="contact-reveal">
              <strong>{s.sharedContactLabel}</strong>
              {item.contact?.trim() ? <ContactValue value={item.contact} locale={locale} /> : <span className="lock-note">{c.noContact}</span>}
            </div>
            {!readOnly && (
              <div className="social-card__actions">
                <button type="button" className="secondary-button" aria-expanded={isSlotsOpen} onClick={() => onToggleSlots(item.id)}>
                  {isSlotsOpen ? s.hideSlots : s.proposeMeeting}
                </button>
              </div>
            )}

            {loadingSlotsIntroId === item.id && <p className="social-card__hint" role="status">{s.loadingSlots}</p>}

            {!readOnly && slots && (
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

  const list = tab === 'incoming' ? incoming : outgoing

  return (
    <section className="social-section connections" aria-labelledby="introductions-title">
      <div className="page-heading">
        <h1 id="introductions-title" tabIndex={-1}>{s.introTitle}</h1>
        <button type="button" className="secondary-button" disabled={refreshing} onClick={onRefresh}>
          {refreshing ? s.refreshing : s.refresh}
        </button>
      </div>

      <ol className="how-steps" aria-label={c.howTitle}>
        {c.howSteps.map((step, index) => (
          <li key={step}>
            <span className="how-steps__index" aria-hidden="true">{index + 1}</span>
            <span className="how-steps__text"><strong>{step}</strong><span>{c.howHints[index]}</span></span>
          </li>
        ))}
      </ol>

      {readOnly && <div className="info-banner" role="status" data-closed-banner>{getMessages(locale).account.closedReadOnly}</div>}
      {socialError && <div className="error-banner" role="alert">{socialError}</div>}
      {socialNotice && <div className="info-banner" role="status">{socialNotice}</div>}

      <div className="connections__grid">
        <ParticipantSearch
          key={eventId}
          api={api}
          eventId={eventId}
          locale={locale}
          introductions={introductions}
          busyIntroId={busyIntroId}
          ownProfile={ownProfile}
          readOnly={readOnly}
          onOpenQuestionnaire={onOpenQuestionnaire}
          onRequest={onRequest}
          onUpdateIntro={onUpdateIntro}
          onShowIntroduction={showIntroduction}
        />

        <section className="surface requests" aria-labelledby={`${tabsId}-title`}>
          <div className="requests__head">
            <h2 id={`${tabsId}-title`}>{c.requestsTitle}</h2>
            <div className="segmented" role="tablist" aria-label={c.requestsTitle}>
              {(['incoming', 'outgoing'] as const).map(value => {
                const count = value === 'incoming' ? incoming.length : outgoing.length
                return (
                  <button
                    key={value}
                    id={`${tabsId}-${value}`}
                    type="button"
                    role="tab"
                    aria-selected={tab === value}
                    aria-controls={`${tabsId}-panel`}
                    tabIndex={tab === value ? 0 : -1}
                    className="segmented__tab"
                    onClick={() => setChosenTab(value)}
                    onKeyDown={handleTabKey}
                  >
                    {value === 'incoming' ? s.incomingHeading : s.outgoingHeading}
                    <span className="nav-count">{count}</span>
                  </button>
                )
              })}
            </div>
          </div>
          <div id={`${tabsId}-panel`} role="tabpanel" aria-labelledby={`${tabsId}-${tab}`} className="requests__panel">
            {list.length ? (
              <div className="social-list">{list.map(renderIntroCard)}</div>
            ) : (
              <div className="requests__empty"><p>{tab === 'incoming' ? s.noIncoming : s.noOutgoing}</p></div>
            )}
          </div>
        </section>
        <section className="surface own-contact-card" aria-labelledby={`${tabsId}-contact`}>
          <span className="own-contact-card__icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.8" /><path d="M8 11V8a4 4 0 1 1 8 0v3" stroke="currentColor" strokeWidth="1.8" /></svg>
          </span>
          <div className="own-contact-card__body">
            <h3 id={`${tabsId}-contact`}>{c.contactTitle}</h3>
            <p>{c.contactExplain}</p>
            <p className="own-contact-card__value" data-contact-value>
              {contactValue ? <strong>{contactValue}</strong> : <span>{c.contactNotSet}</span>}
            </p>
          </div>
          <button type="button" className="secondary-button" data-edit="contact" onClick={() => setEditingContact(true)}>
            {contactValue ? ic.editContact : c.contactAdd}
          </button>
        {editingContact && (
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
            onClose={() => setEditingContact(false)}
          />
        )}
        </section>
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
  /** Closed event: meetings stay visible, confirm/decline/cancel are hidden. */
  readOnly?: boolean
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
  readOnly = false,
}: ServerMeetingsPanelProps) {
  const s = getMessages(locale).social

  return (
    <section className={meetings.length ? 'social-section meetings-panel' : 'social-section meetings-panel meetings-panel--empty'} aria-labelledby="server-meetings-title">
      <div className="page-heading">
        <h1 id="server-meetings-title" tabIndex={-1}>{s.meetingsTitle}</h1>
        <button type="button" className="secondary-button" disabled={refreshing} onClick={onRefresh}>
          {refreshing ? s.refreshing : s.refresh}
        </button>
      </div>

      {readOnly && <div className="info-banner" role="status" data-closed-banner>{getMessages(locale).account.closedReadOnly}</div>}
      {socialError && <div className="error-banner" role="alert">{socialError}</div>}
      {socialNotice && <div className="info-banner" role="status">{socialNotice}</div>}

      {meetings.length === 0 ? (
        <p className="meeting-empty-note">{s.noMeetings}</p>
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

                {!readOnly && meeting.status === 'pending' && (
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

                {!readOnly && meeting.status === 'confirmed' && (
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
