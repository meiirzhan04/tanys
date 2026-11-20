import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { isApiError } from '../api/client'
import type {
  EventBooth,
  EventDetails,
  EventInterestsPayload,
  EventInvite,
  EventMemberItem,
  EventReportItem,
  ModerationAction,
  TanysApiClient,
} from '../api/client'
import { buildInterestCsvFilename, serializeInterestMapCsv } from '../data/interestCsv'
import type { InterestSummary } from '../data/interestSummary'
import { getMessages } from '../i18n/messages'
import type { Locale } from '../matching/types'
import { getGoalLabels } from './goalLabels'
import { InterestMap } from './InterestMap'
import { buildInviteUrl, getInviteState } from './inviteQr'
import { InviteQrModal } from './InviteQrModal'

export interface OrganizerCabinetProps {
  api: TanysApiClient
  locale: Locale
  activeEvent: EventDetails | null
  isOrganizerOfActive: boolean
  onEventCreated: (event: EventDetails) => Promise<void>
  onEventUpdated: (event: EventDetails) => void
  onBoothsChanged: (booths: EventBooth[]) => void
}

function defaultStartsAt(): string {
  return new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 19) + 'Z'
}

function defaultEndsAt(): string {
  return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 19) + 'Z'
}

function parseTopicList(value: string): string[] {
  return value.split(/[,\n]/).map(item => item.trim()).filter(Boolean)
}

function toInterestSummary(payload: EventInterestsPayload | null, memberCount: number): InterestSummary {
  if (!payload) return { profileCount: 0, topics: [] }
  return {
    profileCount: payload.profileCount ?? memberCount,
    topics: payload.topics.map(item => ({ topic: item.name, count: item.count })),
  }
}

export function OrganizerCabinet({
  api,
  locale,
  activeEvent,
  isOrganizerOfActive,
  onEventCreated,
  onEventUpdated,
  onBoothsChanged,
}: OrganizerCabinetProps) {
  const messages = getMessages(locale)
  const o = messages.organizer
  const goalLabels = getGoalLabels(locale)

  // New event form state
  const [newName, setNewName] = useState('')
  const [newTimeZone, setNewTimeZone] = useState('Asia/Almaty')
  const [newStartsAt, setNewStartsAt] = useState(() => defaultStartsAt())
  const [newEndsAt, setNewEndsAt] = useState(() => defaultEndsAt())
  const [creatingEvent, setCreatingEvent] = useState(false)

  // Edit active event state
  const [editName, setEditName] = useState(activeEvent?.name ?? '')
  const [savingEvent, setSavingEvent] = useState(false)

  // Event-scoped real data (strictly reset when switching activeEvent!)
  const [invites, setInvites] = useState<EventInvite[]>([])
  const [issuingInvite, setIssuingInvite] = useState(false)
  const [copiedInviteId, setCopiedInviteId] = useState('')
  const [qrInviteId, setQrInviteId] = useState<string | null>(null)
  const qrTriggerRef = useRef<HTMLButtonElement | null>(null)
  const [members, setMembers] = useState<EventMemberItem[]>([])
  const [interests, setInterests] = useState<EventInterestsPayload | null>(null)
  const [booths, setBooths] = useState<EventBooth[]>([])
  const [reports, setReports] = useState<EventReportItem[]>([])
  const [resolvingReportId, setResolvingReportId] = useState('')
  const [loadingData, setLoadingData] = useState(false)

  // Booth create/edit form state
  const [editingBoothId, setEditingBoothId] = useState<string | null>(null)
  const [boothName, setBoothName] = useState('')
  const [boothTopics, setBoothTopics] = useState('')
  const [boothDescription, setBoothDescription] = useState('')
  const [boothPublished, setBoothPublished] = useState(true)
  const [savingBooth, setSavingBooth] = useState(false)

  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    setEditName(activeEvent?.name ?? '')
    setInvites([])
    setQrInviteId(null)
    setMembers([])
    setInterests(null)
    setBooths([])
    setReports([])
    setEditingBoothId(null)
    setBoothName('')
    setBoothTopics('')
    setBoothDescription('')
    setBoothPublished(true)
    setError('')
    setNotice('')

    if (!activeEvent || !isOrganizerOfActive) return

    let cancelled = false
    async function loadOrganizerData(eventId: string) {
      setLoadingData(true)
      try {
        const [memberList, interestData, boothList, reportList] = await Promise.all([
          api.listEventMembers(eventId),
          api.getEventInterests(eventId),
          api.listEventBooths(eventId),
          api.listEventReports(eventId).catch(() => [] as EventReportItem[]),
        ])
        if (cancelled) return
        setMembers(memberList)
        setInterests(interestData)
        setBooths(boothList)
        setReports(reportList)
        onBoothsChanged(boothList)
      } catch (err) {
        if (!cancelled) {
          setError(isApiError(err) && err.status === 403 ? o.forbiddenCreate : messages.account.errors.genericRequest)
        }
      } finally {
        if (!cancelled) setLoadingData(false)
      }
    }
    void loadOrganizerData(activeEvent.id)
    return () => { cancelled = true }
    // Reload strictly when active event or organizer role changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEvent?.id, isOrganizerOfActive])

  async function handleCreateEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!newName.trim() || !newStartsAt.trim() || !newEndsAt.trim()) {
      setError(o.invalidEventFields)
      return
    }
    setCreatingEvent(true)
    setError('')
    setNotice('')
    try {
      const created = await api.createEvent({
        name: newName.trim(),
        timeZone: newTimeZone.trim() || 'Asia/Almaty',
        startsAt: newStartsAt.trim(),
        endsAt: newEndsAt.trim(),
      })
      setNewName('')
      await onEventCreated(created)
      setNotice(o.eventSaved)
    } catch (err) {
      if (isApiError(err) && err.status === 403) {
        setError(o.forbiddenCreate)
      } else if (isApiError(err) && err.status === 400) {
        setError(o.invalidEventFields)
      } else {
        setError(messages.account.errors.genericRequest)
      }
    } finally {
      setCreatingEvent(false)
    }
  }

  async function handleSaveEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!activeEvent || !editName.trim()) {
      setError(o.invalidEventFields)
      return
    }
    setSavingEvent(true)
    setError('')
    setNotice('')
    try {
      const updated = await api.updateEvent(activeEvent.id, { name: editName.trim() })
      onEventUpdated(updated)
      setNotice(o.eventSaved)
    } catch {
      setError(messages.account.errors.genericRequest)
    } finally {
      setSavingEvent(false)
    }
  }

  async function handleCloseEvent() {
    if (!activeEvent) return
    setSavingEvent(true)
    setError('')
    setNotice('')
    try {
      const updated = await api.updateEvent(activeEvent.id, { status: 'closed' })
      onEventUpdated(updated)
      setNotice(o.eventSaved)
    } catch {
      setError(messages.account.errors.genericRequest)
    } finally {
      setSavingEvent(false)
    }
  }

  async function handleCreateInvite() {
    if (!activeEvent) return
    setIssuingInvite(true)
    setError('')
    try {
      const expiresAt = activeEvent.endsAt || defaultEndsAt()
      const invite = await api.createInvite(activeEvent.id, expiresAt)
      setInvites(current => [invite, ...current])
    } catch {
      setError(messages.account.errors.genericRequest)
    } finally {
      setIssuingInvite(false)
    }
  }

  async function handleRevokeInvite(inviteId: string) {
    if (!activeEvent) return
    setError('')
    try {
      await api.revokeInvite(activeEvent.id, inviteId)
      setInvites(current => current.map(item => (item.id === inviteId ? { ...item, revoked: true } : item)))
    } catch {
      setError(messages.account.errors.genericRequest)
    }
  }

  async function handleCopyInvite(invite: EventInvite) {
    if (!activeEvent) return
    const url = buildInviteUrl(window.location.origin, activeEvent.id, invite.token)
    try {
      await navigator.clipboard.writeText(url)
      setCopiedInviteId(invite.id)
    } catch {
      setCopiedInviteId(invite.id)
    }
  }

  function startEditBooth(booth: EventBooth) {
    setEditingBoothId(booth.id)
    setBoothName(booth.name)
    setBoothTopics(booth.topics.join(', '))
    setBoothDescription(booth.description ?? '')
    setBoothPublished(booth.published)
  }

  function resetBoothForm() {
    setEditingBoothId(null)
    setBoothName('')
    setBoothTopics('')
    setBoothDescription('')
    setBoothPublished(true)
  }

  async function handleSubmitBooth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!activeEvent) return
    const topics = parseTopicList(boothTopics)
    if (!boothName.trim() || !topics.length) {
      setError(o.invalidBoothFields)
      return
    }
    setSavingBooth(true)
    setError('')
    try {
      if (editingBoothId) {
        const updated = await api.updateEventBooth(activeEvent.id, editingBoothId, {
          name: boothName.trim(),
          topics,
          description: boothDescription.trim(),
          published: boothPublished,
        })
        const next = booths.map(item => (item.id === updated.id ? updated : item))
        setBooths(next)
        onBoothsChanged(next)
      } else {
        const created = await api.createEventBooth(activeEvent.id, {
          name: boothName.trim(),
          topics,
          description: boothDescription.trim(),
          published: boothPublished,
        })
        const next = [...booths, created]
        setBooths(next)
        onBoothsChanged(next)
      }
      resetBoothForm()
    } catch {
      setError(messages.account.errors.genericRequest)
    } finally {
      setSavingBooth(false)
    }
  }

  async function handleToggleBoothPublished(booth: EventBooth) {
    if (!activeEvent) return
    setError('')
    try {
      const updated = await api.updateEventBooth(activeEvent.id, booth.id, {
        published: !booth.published,
      })
      const next = booths.map(item => (item.id === updated.id ? updated : item))
      setBooths(next)
      onBoothsChanged(next)
    } catch {
      setError(messages.account.errors.genericRequest)
    }
  }

  async function handleResolveReport(reportId: string, action: ModerationAction) {
    if (!activeEvent || resolvingReportId) return
    setResolvingReportId(reportId)
    setError('')
    try {
      const resolved = await api.resolveEventReport(activeEvent.id, reportId, action)
      setReports(current => current.map(item => (item.id === resolved.id ? resolved : item)))
    } catch {
      setError(messages.account.errors.genericRequest)
    } finally {
      setResolvingReportId('')
    }
  }

  const isClosed = activeEvent?.status === 'closed'
  const interestSummary = toInterestSummary(interests, members.length)

  function handleExportInterestsCsv() {
    if (!activeEvent || interestSummary.topics.length === 0) return
    const csv = serializeInterestMapCsv(interestSummary.topics, {
      topic: messages.interestMap.topic,
      participants: messages.interestMap.participants,
    })
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = buildInterestCsvFilename(activeEvent.name || activeEvent.id, activeEvent.id)
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="organizer-section" aria-labelledby="organizer-title">
      <div className="page-heading">
        <div>
          <h1 id="organizer-title" tabIndex={-1}>{o.title}</h1>
          <p>{o.subtitle}</p>
        </div>
        {activeEvent && (
          <span className={`status-badge ${isClosed ? 'status-badge--cancelled' : 'status-badge--accepted'}`}>
            {isClosed ? o.eventClosedBadge : o.eventActiveBadge}
          </span>
        )}
      </div>

      {error && <div className="error-banner" role="alert">{error}</div>}
      {notice && <div className="info-banner" role="status">{notice}</div>}

      {/* 1. Create new event form (without touching JSON!) */}
      <form className="surface organizer-card" onSubmit={handleCreateEvent} noValidate>
        <h2>{o.createEventTitle}</h2>
        <div className="form-fields">
          <label className="field">
            <span>{o.eventNameLabel}</span>
            <input
              name="eventName"
              maxLength={160}
              placeholder={o.eventNamePlaceholder}
              value={newName}
              disabled={creatingEvent}
              onChange={event => setNewName(event.target.value)}
            />
          </label>
          <label className="field">
            <span>{o.timeZoneLabel}</span>
            <input
              name="eventTimeZone"
              maxLength={64}
              value={newTimeZone}
              disabled={creatingEvent}
              onChange={event => setNewTimeZone(event.target.value)}
            />
          </label>
          <label className="field">
            <span>{o.startsAtLabel}</span>
            <input
              name="eventStartsAt"
              value={newStartsAt}
              disabled={creatingEvent}
              onChange={event => setNewStartsAt(event.target.value)}
            />
          </label>
          <label className="field">
            <span>{o.endsAtLabel}</span>
            <input
              name="eventEndsAt"
              value={newEndsAt}
              disabled={creatingEvent}
              onChange={event => setNewEndsAt(event.target.value)}
            />
          </label>
        </div>
        <div className="social-card__actions">
          <button type="submit" className="primary-button" disabled={creatingEvent}>
            {creatingEvent ? o.creatingEvent : o.createEventButton}
          </button>
        </div>
      </form>

      {activeEvent && isOrganizerOfActive && (
        <>
          {/* 2. Edit / close active event */}
          <form className="surface organizer-card" onSubmit={handleSaveEvent}>
            <h2>{o.editEventTitle}</h2>
            <div className="contact-row">
              <input
                name="editEventName"
                maxLength={160}
                value={editName}
                disabled={savingEvent || isClosed}
                onChange={event => setEditName(event.target.value)}
              />
              <button type="submit" className="secondary-button" disabled={savingEvent || isClosed}>
                {o.saveEventButton}
              </button>
              {!isClosed && (
                <button type="button" className="meeting-slot-cancel" disabled={savingEvent} onClick={() => void handleCloseEvent()}>
                  {o.closeEventButton}
                </button>
              )}
            </div>
          </form>

          {/* 3. Invites */}
          <div className="surface organizer-card">
            <div className="social-card__header">
              <h2>{o.invitesTitle}</h2>
              <button
                type="button"
                className="primary-button"
                disabled={issuingInvite || isClosed}
                onClick={() => void handleCreateInvite()}
              >{issuingInvite ? o.creatingInvite : o.createInviteButton}</button>
            </div>
            {invites.length === 0 ? (
              <p className="social-card__hint">{o.noInvites}</p>
            ) : (
              <ul className="invite-list">
                {invites.map(invite => {
                  const fullUrl = buildInviteUrl(window.location.origin, activeEvent.id, invite.token)
                  const inviteState = getInviteState(invite)
                  return (
                    <li key={invite.id} className="invite-row" data-invite-id={invite.id}>
                      <code className="invite-url">{fullUrl}</code>
                      <div className="social-card__actions">
                        {inviteState !== 'active' ? (
                          <span className="status-badge status-badge--cancelled">
                            {inviteState === 'revoked' ? o.inviteRevoked : o.inviteExpired}
                          </span>
                        ) : (
                          <>
                            <button type="button" className="secondary-button" onClick={() => void handleCopyInvite(invite)}>
                              {copiedInviteId === invite.id ? o.inviteCopied : o.copyInvite}
                            </button>
                            <button
                              type="button"
                              className="secondary-button"
                              onClick={event => {
                                qrTriggerRef.current = event.currentTarget
                                setQrInviteId(invite.id)
                              }}
                            >{o.showQr}</button>
                            <button type="button" className="meeting-slot-cancel" onClick={() => void handleRevokeInvite(invite.id)}>
                              {o.revokeInvite}
                            </button>
                          </>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {/* 4. Event members (permitted fields only, no emails or contacts) */}
          <div className="surface organizer-card">
            <h2>{o.membersTitle}</h2>
            {loadingData ? (
              <p className="social-card__hint">{messages.account.loadingEvent}</p>
            ) : members.length === 0 ? (
              <p className="social-card__hint">{o.noMembers}</p>
            ) : (
              <table className="interest-table members-table">
                <thead>
                  <tr>
                    <th scope="col">{o.memberNameCol}</th>
                    <th scope="col">{o.memberRoleCol}</th>
                    <th scope="col">{o.memberGoalCol}</th>
                    <th scope="col">{o.memberVisibilityCol}</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map(member => (
                    <tr key={member.userId} data-member-id={member.userId}>
                      <th scope="row">{member.name || member.userId}</th>
                      <td>{member.profileRole || (member.role === 'organizer' ? o.roleOrganizer : o.roleParticipant)}</td>
                      <td>{member.goal ? goalLabels[member.goal] : '—'}</td>
                      <td>
                        {member.visible === true
                          ? o.profileVisible
                          : member.visible === false
                            ? o.profileHidden
                            : o.profileIncomplete}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* 5. Real event interest map (#12 connected to event aggregates, zero demo profiles) */}
          <InterestMap
            summary={interestSummary}
            locale={locale}
            onExportCsv={handleExportInterestsCsv}
          />

          {/* 6. Managed partner booths (#14 connected to event booths, zero demo booths) */}
          <div className="surface organizer-card">
            <h2>{o.boothsTitle}</h2>

            <form className="booth-manage-form" onSubmit={handleSubmitBooth} noValidate>
              <div className="form-fields">
                <label className="field">
                  <span>{o.boothNameLabel}</span>
                  <input
                    name="boothName"
                    maxLength={160}
                    placeholder={o.boothNamePlaceholder}
                    value={boothName}
                    disabled={savingBooth || isClosed}
                    onChange={event => setBoothName(event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>{o.boothTopicsLabel}</span>
                  <input
                    name="boothTopics"
                    maxLength={240}
                    placeholder={o.boothTopicsPlaceholder}
                    value={boothTopics}
                    disabled={savingBooth || isClosed}
                    onChange={event => setBoothTopics(event.target.value)}
                  />
                </label>
                <label className="field field-full">
                  <span>{o.boothDescLabel}</span>
                  <input
                    name="boothDescription"
                    maxLength={400}
                    placeholder={o.boothDescPlaceholder}
                    value={boothDescription}
                    disabled={savingBooth || isClosed}
                    onChange={event => setBoothDescription(event.target.value)}
                  />
                </label>
                <label className="checkbox-row field-full">
                  <input
                    type="checkbox"
                    name="boothPublished"
                    checked={boothPublished}
                    disabled={savingBooth || isClosed}
                    onChange={event => setBoothPublished(event.target.checked)}
                  />
                  <span>{o.boothPublishedLabel}</span>
                </label>
              </div>
              <div className="social-card__actions">
                <button type="submit" className="primary-button" disabled={savingBooth || isClosed}>
                  {editingBoothId ? o.saveBoothButton : o.addBoothButton}
                </button>
                {editingBoothId && (
                  <button type="button" className="secondary-button" onClick={resetBoothForm}>
                    {o.cancelEditButton}
                  </button>
                )}
              </div>
            </form>

            {booths.length === 0 ? (
              <p className="social-card__hint">{o.noBooths}</p>
            ) : (
              <div className="social-list">
                {booths.map(booth => (
                  <article key={booth.id} className="social-card surface" data-managed-booth-id={booth.id}>
                    <div className="social-card__header">
                      <div>
                        <h3>{booth.name}</h3>
                        {booth.description && <p className="social-card__role">{booth.description}</p>}
                      </div>
                      <span className={`status-badge ${booth.published ? 'status-badge--accepted' : 'status-badge--cancelled'}`}>
                        {booth.published ? o.statusPublished : o.statusHidden}
                      </span>
                    </div>
                    <ul className="skill-list">
                      {booth.topics.map(topic => <li key={topic}>{topic}</li>)}
                    </ul>
                    <div className="social-card__actions">
                      <button
                        type="button"
                        className="secondary-button"
                        disabled={isClosed}
                        onClick={() => startEditBooth(booth)}
                      >{o.editBoothButton}</button>
                      <button
                        type="button"
                        className={booth.published ? 'meeting-slot-cancel' : 'secondary-button'}
                        disabled={isClosed}
                        onClick={() => void handleToggleBoothPublished(booth)}
                      >{booth.published ? o.unpublishButton : o.publishButton}</button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          {/* 7. Closed moderation & reports queue (#56) */}
          <div className="surface organizer-card" aria-labelledby="moderation-queue-title">
            <div>
              <h2 id="moderation-queue-title">{messages.moderation.queueTitle}</h2>
              <p className="social-card__role">{messages.moderation.queueSubtitle}</p>
            </div>
            {reports.length === 0 ? (
              <p className="social-card__hint">{messages.moderation.queueEmpty}</p>
            ) : (
              <div className="social-list">
                {reports.map(report => {
                  const isBusy = resolvingReportId === report.id
                  const actionLabel = report.action === 'restrict'
                    ? messages.moderation.actionRestrict
                    : report.action === 'warn'
                      ? messages.moderation.actionWarn
                      : report.action === 'dismiss'
                        ? messages.moderation.actionDismiss
                        : ''
                  return (
                    <article key={report.id} className="social-card surface" data-report-id={report.id}>
                      <div className="social-card__header">
                        <div>
                          <h3>{report.subjectName || report.subjectId}</h3>
                          <p className="social-card__role">{messages.moderation.reasons[report.reason]}</p>
                        </div>
                        <span className={`status-badge ${report.status === 'resolved' ? 'status-badge--accepted' : 'status-badge--pending'}`}>
                          {report.status === 'resolved' ? messages.moderation.statusResolved : messages.moderation.statusOpen}
                        </span>
                      </div>
                      {report.details && <p className="social-card__hint">{report.details}</p>}
                      {report.status === 'open' ? (
                        <div className="social-card__actions">
                          <button
                            type="button"
                            className="meeting-slot-cancel"
                            disabled={isBusy}
                            onClick={() => void handleResolveReport(report.id, 'restrict')}
                          >{messages.moderation.actionRestrict}</button>
                          <button
                            type="button"
                            className="secondary-button"
                            disabled={isBusy}
                            onClick={() => void handleResolveReport(report.id, 'warn')}
                          >{messages.moderation.actionWarn}</button>
                          <button
                            type="button"
                            className="text-button"
                            disabled={isBusy}
                            onClick={() => void handleResolveReport(report.id, 'dismiss')}
                          >{messages.moderation.actionDismiss}</button>
                        </div>
                      ) : (
                        actionLabel && <p className="social-card__hint">{messages.moderation.resolvedWithAction(actionLabel)}</p>
                      )}
                    </article>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}

      {activeEvent && qrInviteId && (() => {
        const activeInvite = invites.find(item => item.id === qrInviteId)
        if (!activeInvite) return null
        const fullUrl = buildInviteUrl(window.location.origin, activeEvent.id, activeInvite.token)
        return (
          <InviteQrModal
            eventName={activeEvent.name || activeEvent.id}
            inviteUrl={fullUrl}
            revoked={activeInvite.revoked}
            expiresAt={activeInvite.expiresAt}
            locale={locale}
            copied={copiedInviteId === activeInvite.id}
            onCopy={() => void handleCopyInvite(activeInvite)}
            onClose={() => {
              setQrInviteId(null)
              requestAnimationFrame(() => qrTriggerRef.current?.focus())
            }}
          />
        )
      })()}
    </section>
  )
}
