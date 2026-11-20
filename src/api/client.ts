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

export interface AuthUser {
  id: string
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

export interface TanysApiClient {
  requestAuthChallenge(email: string, purpose: AuthPurpose): Promise<{ challengeId: string }>
  verifyAuthChallenge(challengeId: string, code: string): Promise<AuthUser>
  getMe(): Promise<AuthUser | null>
  logout(): Promise<void>
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
  saveAvailability(eventId: string, slots: readonly { start: string; end: string }[]): Promise<void>
  listCommonSlots(eventId: string, introductionId: string): Promise<CommonSlot[]>
  listMeetings(eventId: string): Promise<ServerMeeting[]>
  createMeeting(eventId: string, introductionId: string, slotId: string): Promise<ServerMeeting>
  updateMeeting(
    eventId: string,
    meetingId: string,
    status: Exclude<ServerMeetingStatus, 'pending'>,
  ): Promise<ServerMeeting>
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

    return payload as T
  }

  return {
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
  }
}

export const defaultApiClient: TanysApiClient = createTanysApiClient()
