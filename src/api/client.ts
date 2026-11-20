import type { Feedback } from '../matching/session'
import type { Goal, Locale, ProfileInput, Recommendation } from '../matching/types'

export type AuthPurpose = 'login' | 'recover'
export type EventRole = 'organizer' | 'participant'
export type EventStatus = 'active' | 'closed'
export type IntroductionStatus = 'pending' | 'accepted' | 'declined' | 'withdrawn'
export type IntroductionDirection = 'incoming' | 'outgoing'
export type ServerMeetingStatus = 'pending' | 'confirmed' | 'declined' | 'cancelled'

export interface IntroductionItem {
  id: string
  status: IntroductionStatus
  direction: IntroductionDirection
  participantId?: string
  participantName?: string
  participantRole?: string
  contact?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface CommonSlot {
  id: string
  start: string
  end: string
}

export interface ServerMeeting {
  id: string
  introductionId: string
  slotId?: string
  start?: string
  end?: string
  status: ServerMeetingStatus
  direction?: IntroductionDirection
  participantName?: string
  participantRole?: string
}

export interface CreateEventPayload {
  name: string
  timeZone: string
  startsAt: string
  endsAt: string
}

export interface UpdateEventPayload {
  name?: string
  timeZone?: string
  startsAt?: string
  endsAt?: string
  status?: EventStatus
}

export interface EventInvite {
  id: string
  token: string
  expiresAt: string
  revoked?: boolean
}

export interface EventMemberItem {
  userId: string
  role: EventRole
  name?: string | null
  username?: string | null
  profileRole?: string | null
  goal?: Goal | null
  visible?: boolean | null
}

export interface EventInterestsPayload {
  topics: Array<{ name: string; count: number }>
  profileCount?: number
}

export interface EventBooth {
  id: string
  name: string
  description?: string
  topics: string[]
  published: boolean
}

export interface CreateBoothPayload {
  name: string
  description?: string
  topics: string[]
  published?: boolean
}

export interface UpdateBoothPayload {
  name?: string
  description?: string
  topics?: string[]
  published?: boolean
}

export type ReportReason = 'spam' | 'harassment' | 'fake_profile' | 'other'
export type ModerationAction = 'dismiss' | 'warn' | 'restrict'

export interface EventReportItem {
  id: string
  subjectId: string
  subjectName?: string
  reason: ReportReason
  details?: string
  status: 'open' | 'resolved'
  action?: ModerationAction | null
  resolvedBy?: string | null
  resolvedAt?: string | null
  createdAt?: string
}

export interface SubmitReportPayload {
  subjectId: string
  reason: ReportReason
  details?: string
}

export interface AdminUserItem {
  id: string
  username: string | null
  canCreateEvents: boolean
  createdAt: string
  eventsCount: number
  profilesCount: number
}

export interface AdminEventItem {
  id: string
  name: string
  timeZone: string
  startsAt: string
  endsAt: string
  status: EventStatus
  memberCount: number
  profileCount: number
}

export interface AdminParticipantItem {
  eventId: string
  eventName: string
  userId: string
  username: string | null
  name: string
  role: string
  goal: Goal
  skills: string[]
  interests: string[]
  experienceYears: number
  visible: boolean
}

export interface AdminIntroductionItem {
  id: string
  eventId: string
  eventName: string
  status: IntroductionStatus
  createdAt: string
  senderName: string
  recipientName: string
}

export interface AdminMeetingItem {
  id: string
  eventId: string
  eventName: string
  startsAt: string
  endsAt: string
  status: ServerMeetingStatus
  proposerName: string
  peerName: string | null
}

export interface AdminReportItem {
  id: string
  eventId: string
  eventName: string
  reason: ReportReason
  details: string
  status: 'open' | 'resolved'
  action: ModerationAction | null
  createdAt: string
  reporterName: string
  subjectName: string
}

export interface AdminOverview {
  stats: {
    usersCount: number
    organizersCount: number
    eventsCount: number
    profilesCount: number
    introductionsCount: number
    meetingsCount: number
    reportsCount: number
  }
  users: AdminUserItem[]
  events: AdminEventItem[]
  participants: AdminParticipantItem[]
  introductions: AdminIntroductionItem[]
  meetings: AdminMeetingItem[]
  reports: AdminReportItem[]
}

export interface AuthUser {
  id: string
  username?: string
}

export interface EventSummary {
  id: string
  name?: string
  role: EventRole
  status?: EventStatus
  timeZone?: string
}

export interface EventDetails {
  id: string
  name?: string
  status: EventStatus
  timeZone?: string
  startsAt?: string
  endsAt?: string
}

export interface ServerProfile extends ProfileInput {
  name: string
  visible: boolean
  consentVersion: 'v1'
}

export interface ServerProfilePayload {
  name: string
  role: string
  skills: string[]
  experienceYears: number
  interests: string[]
  about: string
  goal: Goal
  lookingFor?: string[]
  visible: boolean
  consentVersion: 'v1'
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly requestId?: string

  constructor(status: number, code: string, message: string, requestId?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.requestId = requestId
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

export function isInviteExpiredError(error: unknown): boolean {
  if (!isApiError(error)) return false
  return (
    error.status === 404 ||
    error.status === 410 ||
    error.code === 'invite_expired' ||
    error.code === 'invite_revoked' ||
    error.code === 'invite_invalid'
  )
}

export function isNetworkError(error: unknown): boolean {
  return isApiError(error) && error.code === 'network_error'
}

export function isSlotConflictError(error: unknown): boolean {
  return isApiError(error) && (error.status === 409 || error.code === 'slot_conflict')
}

export function isBlockedOrRestrictedError(error: unknown): boolean {
  return (
    isApiError(error) &&
    (error.status === 403 || error.code === 'blocked' || error.code === 'user_restricted' || error.code === 'interaction_blocked')
  )
}

export interface TanysApiClient {
  registerWithPassword(username: string, password: string): Promise<AuthUser>
  signInWithPassword(username: string, password: string): Promise<AuthUser>
  requestAuthChallenge(email: string, purpose: AuthPurpose): Promise<{ challengeId: string }>
  verifyAuthChallenge(challengeId: string, code: string): Promise<AuthUser>
  getMe(): Promise<AuthUser | null>
  logout(): Promise<void>
  deleteAccount(confirmation?: { confirm: boolean }): Promise<void>
  saveContact(value: string): Promise<void>
  listEvents(): Promise<EventSummary[]>
  getEvent(eventId: string): Promise<EventDetails>
  joinEvent(eventId: string, token: string): Promise<{ role: EventRole }>
  leaveEvent(eventId: string): Promise<void>
  getEventProfile(eventId: string): Promise<ServerProfile | null>
  saveEventProfile(eventId: string, profile: ServerProfilePayload): Promise<ServerProfile>
  getEventRecommendations(eventId: string, locale: Locale): Promise<Recommendation[]>
  sendEventFeedback(eventId: string, candidateId: string, response: Feedback): Promise<void>
  listIntroductions(eventId: string): Promise<IntroductionItem[]>
  getIntroduction(eventId: string, introductionId: string): Promise<IntroductionItem>
  createIntroduction(eventId: string, recipientId: string): Promise<IntroductionItem>
  updateIntroduction(
    eventId: string,
    introductionId: string,
    status: Exclude<IntroductionStatus, 'pending'>,
  ): Promise<IntroductionItem>
  getAvailability(eventId: string): Promise<{ start: string; end: string }[]>
  saveAvailability(eventId: string, slots: readonly { start: string; end: string }[]): Promise<void>
  listCommonSlots(eventId: string, introductionId: string): Promise<CommonSlot[]>
  listMeetings(eventId: string): Promise<ServerMeeting[]>
  createMeeting(eventId: string, introductionId: string, slotId: string): Promise<ServerMeeting>
  updateMeeting(
    eventId: string,
    meetingId: string,
    status: Exclude<ServerMeetingStatus, 'pending'>,
  ): Promise<ServerMeeting>
  createEvent(payload: CreateEventPayload): Promise<EventDetails>
  updateEvent(eventId: string, payload: UpdateEventPayload): Promise<EventDetails>
  createInvite(eventId: string, expiresAt: string): Promise<EventInvite>
  revokeInvite(eventId: string, inviteId: string): Promise<void>
  listEventMembers(eventId: string): Promise<EventMemberItem[]>
  getEventInterests(eventId: string): Promise<EventInterestsPayload>
  listEventBooths(eventId: string): Promise<EventBooth[]>
  createEventBooth(eventId: string, payload: CreateBoothPayload): Promise<EventBooth>
  updateEventBooth(eventId: string, boothId: string, payload: UpdateBoothPayload): Promise<EventBooth>
  blockParticipant(eventId: string, targetUserId: string): Promise<void>
  submitReport(eventId: string, payload: SubmitReportPayload): Promise<{ id: string; status: 'open' }>
  listEventReports(eventId: string): Promise<EventReportItem[]>
  resolveEventReport(eventId: string, reportId: string, action: ModerationAction): Promise<EventReportItem>
  getAdminOverview(): Promise<AdminOverview>
  setUserOrganizerRole(userId: string, canCreateEvents: boolean): Promise<{ id: string; username: string | null; canCreateEvents: boolean }>
}

type FetchLike = typeof fetch

interface ErrorPayload {
  error?: {
    code?: string
    message?: string
    requestId?: string
  }
}

async function readJsonSafe<T>(response: Response): Promise<T | null> {
  if (response.status === 204) return null
  const text = await response.text()
  if (!text.trim()) return null
  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

export function createTanysApiClient(
  baseUrl = '/api/v1',
  fetchImpl: FetchLike = globalThis.fetch.bind(globalThis),
): TanysApiClient {
  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers)
    headers.set('Accept', 'application/json')
    if (init.body !== undefined && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }

    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}${path}`, {
        ...init,
        headers,
        credentials: 'same-origin',
      })
    } catch {
      throw new ApiError(0, 'network_error', 'Network request failed')
    }

    const payload = await readJsonSafe<T & ErrorPayload>(response)

    if (!response.ok) {
      const code = payload?.error?.code ?? (response.status >= 500 ? 'server_error' : `http_${response.status}`)
      const message = payload?.error?.message ?? response.statusText ?? 'Request failed'
      throw new ApiError(response.status, code, message, payload?.error?.requestId)
    }

    if (response.status !== 204 && payload === null && response.headers.get('content-type')?.toLowerCase().includes('text/html')) {
      throw new ApiError(503, 'api_unavailable', 'API unavailable')
    }

    return payload as T
  }

  return {
    registerWithPassword(username, password) {
      return request<AuthUser>('/auth/register', { method: 'POST', body: JSON.stringify({ username, password }) })
    },
    signInWithPassword(username, password) {
      return request<AuthUser>('/auth/password', { method: 'POST', body: JSON.stringify({ username, password }) })
    },

    requestAuthChallenge(email, purpose) {
      return request<{ challengeId: string }>('/auth/challenges', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), purpose }),
      })
    },

    verifyAuthChallenge(challengeId, code) {
      return request<AuthUser>('/auth/sessions', {
        method: 'POST',
        body: JSON.stringify({ challengeId, code: code.trim() }),
      })
    },

    async getMe() {
      try {
        return await request<AuthUser>('/me')
      } catch (error) {
        if (isApiError(error) && error.status === 401) return null
        throw error
      }
    },

    async logout() {
      await request<null>('/auth/session', { method: 'DELETE' })
    },

    async deleteAccount(confirmation = { confirm: true }) {
      await request<null>('/me', {
        method: 'DELETE',
        body: JSON.stringify(confirmation),
      })
    },

    async saveContact(value) {
      await request<null>('/me/contact', {
        method: 'PUT',
        body: JSON.stringify({ value: value.trim() }),
      })
    },

    async listEvents() {
      const data = await request<{ items?: EventSummary[] }>('/events')
      return Array.isArray(data?.items) ? data.items : []
    },

    getEvent(eventId) {
      return request<EventDetails>(`/events/${encodeURIComponent(eventId)}`)
    },

    joinEvent(eventId, token) {
      return request<{ role: EventRole }>(`/events/${encodeURIComponent(eventId)}/members/me`, {
        method: 'PUT',
        body: JSON.stringify({ token }),
      })
    },

    async leaveEvent(eventId) {
      await request<null>(`/events/${encodeURIComponent(eventId)}/members/me`, {
        method: 'DELETE',
      })
    },

    async getEventProfile(eventId) {
      try {
        return await request<ServerProfile>(`/events/${encodeURIComponent(eventId)}/profile`)
      } catch (error) {
        if (isApiError(error) && error.status === 404) return null
        throw error
      }
    },

    saveEventProfile(eventId, profile) {
      return request<ServerProfile>(`/events/${encodeURIComponent(eventId)}/profile`, {
        method: 'PUT',
        body: JSON.stringify(profile),
      })
    },

    async getEventRecommendations(eventId, locale) {
      const query = new URLSearchParams({ locale })
      const data = await request<{ items?: Recommendation[] }>(
        `/events/${encodeURIComponent(eventId)}/recommendations?${query.toString()}`,
      )
      return Array.isArray(data?.items) ? data.items : []
    },

    async sendEventFeedback(eventId, candidateId, response) {
      await request<null>(
        `/events/${encodeURIComponent(eventId)}/feedback/${encodeURIComponent(candidateId)}`,
        {
          method: 'PUT',
          body: JSON.stringify({ response }),
        },
      )
    },

    async listIntroductions(eventId) {
      const data = await request<{ items?: IntroductionItem[] }>(
        `/events/${encodeURIComponent(eventId)}/introductions`,
      )
      return Array.isArray(data?.items) ? data.items : []
    },

    getIntroduction(eventId, introductionId) {
      return request<IntroductionItem>(
        `/events/${encodeURIComponent(eventId)}/introductions/${encodeURIComponent(introductionId)}`,
      )
    },

    createIntroduction(eventId, recipientId) {
      return request<IntroductionItem>(
        `/events/${encodeURIComponent(eventId)}/introductions`,
        {
          method: 'POST',
          body: JSON.stringify({ recipientId }),
        },
      )
    },

    updateIntroduction(eventId, introductionId, status) {
      return request<IntroductionItem>(
        `/events/${encodeURIComponent(eventId)}/introductions/${encodeURIComponent(introductionId)}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        },
      )
    },

    async getAvailability(eventId) {
      const result = await request<{ slots: {start:string;end:string}[] }>(`/events/${encodeURIComponent(eventId)}/availability/me`)
      return result.slots
    },
    async saveAvailability(eventId, slots) {
      await request<null>(
        `/events/${encodeURIComponent(eventId)}/availability/me`,
        {
          method: 'PUT',
          body: JSON.stringify({ slots }),
        },
      )
    },

    async listCommonSlots(eventId, introductionId) {
      const data = await request<{ items?: CommonSlot[] }>(
        `/events/${encodeURIComponent(eventId)}/introductions/${encodeURIComponent(introductionId)}/slots`,
      )
      return Array.isArray(data?.items) ? data.items : []
    },

    async listMeetings(eventId) {
      const data = await request<{ items?: ServerMeeting[] }>(
        `/events/${encodeURIComponent(eventId)}/meetings`,
      )
      return Array.isArray(data?.items) ? data.items : []
    },

    createMeeting(eventId, introductionId, slotId) {
      return request<ServerMeeting>(
        `/events/${encodeURIComponent(eventId)}/meetings`,
        {
          method: 'POST',
          body: JSON.stringify({ introductionId, slotId }),
        },
      )
    },

    updateMeeting(eventId, meetingId, status) {
      return request<ServerMeeting>(
        `/events/${encodeURIComponent(eventId)}/meetings/${encodeURIComponent(meetingId)}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        },
      )
    },

    createEvent(payload) {
      return request<EventDetails>('/events', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },

    updateEvent(eventId, payload) {
      return request<EventDetails>(`/events/${encodeURIComponent(eventId)}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })
    },

    async createInvite(eventId, expiresAt) {
      const created = await request<{ id: string; token: string }>(
        `/events/${encodeURIComponent(eventId)}/invites`,
        {
          method: 'POST',
          body: JSON.stringify({ expiresAt }),
        },
      )
      return { id: created.id, token: created.token, expiresAt }
    },

    async revokeInvite(eventId, inviteId) {
      await request<null>(
        `/events/${encodeURIComponent(eventId)}/invites/${encodeURIComponent(inviteId)}`,
        { method: 'DELETE' },
      )
    },

    async listEventMembers(eventId) {
      const all: EventMemberItem[] = []
      const seenUsers = new Set<string>()
      const seenCursors = new Set<string>()
      let cursor: string | null = null

      while (true) {
        const suffix: string = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''
        const data: { items?: EventMemberItem[]; nextCursor?: string | null } = await request<{
          items?: EventMemberItem[]
          nextCursor?: string | null
        }>(`/events/${encodeURIComponent(eventId)}/members${suffix}`)
        const items = Array.isArray(data?.items) ? data.items : []
        for (const member of items) {
          if (seenUsers.has(member.userId)) continue
          seenUsers.add(member.userId)
          all.push(member)
        }
        const next: string | null =
          typeof data?.nextCursor === 'string' && data.nextCursor.trim() ? data.nextCursor : null
        if (!next || seenCursors.has(next)) break
        seenCursors.add(next)
        cursor = next
      }

      return all
    },

    async getEventInterests(eventId) {
      const data = await request<EventInterestsPayload>(
        `/events/${encodeURIComponent(eventId)}/interests`,
      )
      return {
        topics: Array.isArray(data?.topics) ? data.topics : [],
        profileCount: typeof data?.profileCount === 'number' ? data.profileCount : undefined,
      }
    },

    async listEventBooths(eventId) {
      const data = await request<{ items?: EventBooth[] }>(
        `/events/${encodeURIComponent(eventId)}/booths`,
      )
      return Array.isArray(data?.items) ? data.items : []
    },

    createEventBooth(eventId, payload) {
      return request<EventBooth>(
        `/events/${encodeURIComponent(eventId)}/booths`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      )
    },

    updateEventBooth(eventId, boothId, payload) {
      return request<EventBooth>(
        `/events/${encodeURIComponent(eventId)}/booths/${encodeURIComponent(boothId)}`,
        {
          method: 'PATCH',
          body: JSON.stringify(payload),
        },
      )
    },

    async blockParticipant(eventId, targetUserId) {
      await request<null>(
        `/events/${encodeURIComponent(eventId)}/blocks/${encodeURIComponent(targetUserId)}`,
        { method: 'PUT' },
      )
    },

    submitReport(eventId, payload) {
      return request<{ id: string; status: 'open' }>(
        `/events/${encodeURIComponent(eventId)}/reports`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      )
    },

    async listEventReports(eventId) {
      const data = await request<{ items?: EventReportItem[] }>(
        `/events/${encodeURIComponent(eventId)}/reports`,
      )
      return Array.isArray(data?.items) ? data.items : []
    },

    resolveEventReport(eventId, reportId, action) {
      return request<EventReportItem>(
        `/events/${encodeURIComponent(eventId)}/reports/${encodeURIComponent(reportId)}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status: 'resolved', action }),
        },
      )
    },

    getAdminOverview() {
      return request<AdminOverview>('/admin/overview')
    },

    setUserOrganizerRole(userId, canCreateEvents) {
      return request<{ id: string; username: string | null; canCreateEvents: boolean }>(
        `/admin/users/${encodeURIComponent(userId)}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ canCreateEvents }),
        },
      )
    },
  }
}

export const defaultApiClient: TanysApiClient = createTanysApiClient()
