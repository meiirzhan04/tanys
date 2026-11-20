import { AvailabilityEditor } from './AvailabilityEditor'
import { lazy, Suspense, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import {
  defaultApiClient,
  isApiError,
  isBlockedOrRestrictedError,
  isInviteExpiredError,
  isNetworkError,
  isSlotConflictError,
} from '../api/client'
import type {
  AuthUser,
  CommonSlot,
  EventBooth,
  EventDetails,
  EventSummary,
  IntroductionItem,
  IntroductionStatus,
  ReportReason,
  ServerMeeting,
  ServerMeetingStatus,
  ServerProfile,
  TanysApiClient,
} from '../api/client'
import { loadPendingInvite, savePendingInvite } from '../api/inviteRoute'
import type { InviteTarget } from '../api/inviteRoute'
import { recommendBooths } from '../data/booths'
import type { PartnerBooth } from '../data/booths'
import { getMessages } from '../i18n/messages'
import type { Feedback } from '../matching/session'
import type { Goal, Locale, Recommendation } from '../matching/types'
import { CustomSelect } from './CustomSelect'
import { getGoalLabels } from './goalLabels'
import { PartnerBooths } from './PartnerBooths'

const OrganizerCabinet = lazy(() =>
  import('./OrganizerCabinet').then(m => ({ default: m.OrganizerCabinet })),
)
import { hasUnsavedProfileChanges, parseProfileTopics } from './profileDirty'
import type { EventProfileDraft } from './profileDirty'
import { RecommendationResults } from './RecommendationResults'
import {
  countActionableMeetings,
  countPendingIncomingIntros,
  diffSocialEvents,
} from './socialHelpers'
import type { SocialNotification } from './socialHelpers'
import { IntroductionsPanel, NotificationBanner, ServerMeetingsPanel } from './SocialPanels'
import { UnsavedChangesDialog } from './UnsavedChangesDialog'

type ProfileErrorField = 'name' | 'goal' | 'role' | 'experience' | 'skills' | 'interests' | 'about' | 'consent'
type ProfileErrors = Partial<Record<ProfileErrorField, string>>
type EventTab = 'profile' | 'results' | 'introductions' | 'meetings' | 'organizer'

function emptyDraft(): EventProfileDraft {
  return {
    name: '',
    goal: '',
    role: '',
    experience: '',
    skills: '',
    interests: '',
    about: '',
    lookingFor: '',
    visible: false,
    consentAccepted: false,
  }
}

function profileToDraft(profile: ServerProfile | null): EventProfileDraft {
  if (!profile) return emptyDraft()
  return {
    name: profile.name,
    goal: profile.goal,
    role: profile.role,
    experience: String(profile.experienceYears),
    skills: profile.skills.join(', '),
    interests: profile.interests.join(', '),
    about: profile.about,
    lookingFor: profile.lookingFor?.join(', ') ?? '',
    visible: profile.visible,
    consentAccepted: profile.consentVersion === 'v1',
  }
}

function parseTopics(value: string): string[] {
  return parseProfileTopics(value)
}

function validateDraft(draft: EventProfileDraft, locale: Locale): ProfileErrors {
  const formErrors = getMessages(locale).form.errors
  const accountErrors = getMessages(locale).account.errors
  const errors: ProfileErrors = {}
  const experience = Number(draft.experience)

  if (!draft.name.trim()) errors.name = accountErrors.nameRequired
  if (!draft.goal) errors.goal = formErrors.goal
  if (!draft.role.trim()) errors.role = formErrors.role
  if (!draft.experience || !Number.isInteger(experience) || experience < 0 || experience > 60) {
    errors.experience = formErrors.experience
  }
  if (!parseTopics(draft.skills).length) errors.skills = formErrors.skills
  if (!parseTopics(draft.interests).length) errors.interests = formErrors.interests
  if (!draft.about.trim()) errors.about = formErrors.about
  if (!draft.consentAccepted) errors.consent = accountErrors.consentRequired
  return errors
}

function formatApiError(error: unknown, locale: Locale, context: 'authService' | 'auth' | 'save' | 'general'): string {
  const err = getMessages(locale).account.errors
  if (isNetworkError(error)) {
    return context === 'save' ? err.networkSavePreserved : err.networkGeneral
  }
  if (isApiError(error)) {
    if ((context === 'authService' || context === 'auth') && [404, 503].includes(error.status)) return err.authUnavailable
    if (error.status === 401) {
      return context === 'auth' ? err.invalidCredentials : err.sessionExpired
    }
    if (error.status === 429) return err.rateLimited
    if (context === 'auth') {
      if (error.code === 'invalid_username') return err.usernameInvalid
      if (error.code === 'invalid_password') return err.passwordTooShort
      if (error.code === 'username_unavailable') return err.usernameUnavailable
    }
  }
  return context === 'save' ? err.genericSave : err.genericRequest
}

export interface EventAccountFlowProps {
  locale: Locale
  initialInvite: InviteTarget | null
  onExitToDemo: () => void
  exitRequestSeq?: number
  api?: TanysApiClient
}

export function EventAccountFlow({
  locale,
  initialInvite,
  onExitToDemo,
  exitRequestSeq = 0,
  api = defaultApiClient,
}: EventAccountFlowProps) {
  const id = useId()
  const messages = getMessages(locale)
  const t = messages.account
  const formText = messages.form
  const goalLabels = getGoalLabels(locale)

  const [pendingInvite, setPendingInvite] = useState<InviteTarget | null>(() => {
    const resolved = initialInvite ?? loadPendingInvite()
    if (resolved) savePendingInvite(resolved)
    return resolved
  })
  const [user, setUser] = useState<AuthUser | null>(null)
  const [phase, setPhase] = useState<'checking' | 'auth' | 'joining' | 'expired' | 'ready'>('checking')

  // Auth form state
  const [registering, setRegistering] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [authError, setAuthError] = useState('')

  // Event & profile state
  const [events, setEvents] = useState<EventSummary[]>([])
  const [activeEventId, setActiveEventId] = useState<string>('')
  const [activeEvent, setActiveEvent] = useState<EventDetails | null>(null)
  const [eventLoading, setEventLoading] = useState(false)
  const [eventError, setEventError] = useState('')
  const [tab, setTab] = useState<EventTab>('profile')
  const [hasSavedProfile, setHasSavedProfile] = useState(false)
  const [savedBaseline, setSavedBaseline] = useState<EventProfileDraft | null>(null)
  const [draft, setDraft] = useState<EventProfileDraft>(() => emptyDraft())
  const [pendingLeaveAction, setPendingLeaveAction] = useState<(() => void) | null>(null)
  const pendingTriggerRef = useRef<HTMLElement | null>(null)
  const [showErrors, setShowErrors] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Recommendations & social state
  const [recommendations, setRecommendations] = useState<Recommendation[] | null>(null)
  const [eventBooths, setEventBooths] = useState<EventBooth[]>([])
  const [recsLoading, setRecsLoading] = useState(false)
  const [recsMessage, setRecsMessage] = useState('')
  const [introductions, setIntroductions] = useState<IntroductionItem[]>([])
  const [meetings, setMeetings] = useState<ServerMeeting[]>([])
  const [notifications, setNotifications] = useState<SocialNotification[]>([])
  const [socialRefreshing, setSocialRefreshing] = useState(false)
  const [socialError, setSocialError] = useState('')
  const [socialNotice, setSocialNotice] = useState('')
  const [requestingIntroId, setRequestingIntroId] = useState('')
  const [busyIntroId, setBusyIntroId] = useState('')
  const [busyMeetingId, setBusyMeetingId] = useState('')
  const [slotsByIntroId, setSlotsByIntroId] = useState<Record<string, readonly CommonSlot[]>>({})
  const [loadingSlotsIntroId, setLoadingSlotsIntroId] = useState('')
  const [proposingSlotKey, setProposingSlotKey] = useState('')
  const [contactValue, setContactValue] = useState('')
  const [savingContact, setSavingContact] = useState(false)
  const [contactSaved, setContactSaved] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [leavingEvent, setLeavingEvent] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)

  const prevIntrosRef = useRef<readonly IntroductionItem[]>([])
  const prevMeetingsRef = useRef<readonly ServerMeeting[]>([])
  const socialInitializedRef = useRef(false)

  const refreshSocialState = useCallback(async (eventId: string, detectDiffs: boolean) => {
    setSocialRefreshing(true)
    try {
      const [rawIntros, nextMeetings] = await Promise.all([
        api.listIntroductions(eventId),
        api.listMeetings(eventId),
      ])

      // Enrich accepted introductions with GET /events/E/introductions/I when contact is omitted from the list.
      const nextIntros = await Promise.all(
        rawIntros.map(async item => {
          if (item.status === 'accepted' && item.contact === undefined) {
            try {
              const detailed = await api.getIntroduction(eventId, item.id)
              return { ...item, ...detailed }
            } catch {
              return item
            }
          }
          return item
        }),
      )

      if (detectDiffs && socialInitializedRef.current) {
        const fresh = diffSocialEvents(prevIntrosRef.current, nextIntros, prevMeetingsRef.current, nextMeetings)
        if (fresh.length) {
          setNotifications(current => {
            const seen = new Set(current.map(n => n.id))
            return [...fresh.filter(n => !seen.has(n.id)), ...current].slice(0, 5)
          })
        }
      }

      prevIntrosRef.current = nextIntros
      prevMeetingsRef.current = nextMeetings
      socialInitializedRef.current = true
      setIntroductions(nextIntros)
      setMeetings(nextMeetings)
    } catch (error) {
      if (isApiError(error) && error.status === 401) {
        setUser(null)
        setPhase('auth')
        setAuthError(formatApiError(error, locale, 'authService'))
        return
      }
      // Keep existing state intact if background refresh fails (e.g., backend #52/#53 not yet mounted).
    } finally {
      setSocialRefreshing(false)
    }
  }, [api, locale])

  const loadEventWorkspace = useCallback(async (eventId: string, preserveDraft = false) => {
    setEventLoading(true)
    setEventError('')
    setSaveError('')
    setSaveSuccess(false)
    setSocialError('')
    setSocialNotice('')
    setSlotsByIntroId({})
    setNotifications([])
    prevIntrosRef.current = []
    prevMeetingsRef.current = []
    socialInitializedRef.current = false
    try {
      const [details, profile] = await Promise.all([
        api.getEvent(eventId),
        api.getEventProfile(eventId),
      ])
      setActiveEventId(eventId)
      setActiveEvent(details)
      setHasSavedProfile(Boolean(profile))
      const loadedDraft = profile ? profileToDraft(profile) : null
      setSavedBaseline(loadedDraft)
      if (!preserveDraft) {
        setDraft(loadedDraft ?? emptyDraft())
        setShowErrors(false)
      }
      setRecommendations(null)
      setEventBooths([])
      setRecsMessage('')
      setTab('profile')
      await refreshSocialState(eventId, false)
      try {
        setEventBooths(await api.listEventBooths(eventId))
      } catch {
        setEventBooths([])
      }
    } catch (error) {
      if (isApiError(error) && error.status === 401) {
        setUser(null)
        setPhase('auth')
        setAuthError(formatApiError(error, locale, 'authService'))
        return
      }
      setEventError(formatApiError(error, locale, 'general'))
    } finally {
      setEventLoading(false)
    }
  }, [api, locale, refreshSocialState])

  const enterAuthenticated = useCallback(async (invite: InviteTarget | null, preserveDraft = false) => {
    if (invite?.token) {
      setPhase('joining')
      try {
        await api.joinEvent(invite.eventId, invite.token)
        savePendingInvite(null)
        setPendingInvite(null)
      } catch (error) {
        if (isApiError(error) && error.status === 401) {
          setUser(null)
          setPhase('auth')
          setAuthError(formatApiError(error, locale, 'authService'))
          return
        }
        if (isInviteExpiredError(error)) {
          savePendingInvite(null)
          setPendingInvite(null)
          try {
            const existingEvents = await api.listEvents()
            setEvents(existingEvents)
          } catch {
            setEvents([])
          }
          setPhase('expired')
          return
        }
        setEventError(formatApiError(error, locale, 'general'))
      }
    }

    setPhase('ready')
    try {
      const list = await api.listEvents()
      setEvents(list)
      const preferredId = invite?.eventId && list.some(item => item.id === invite.eventId)
        ? invite.eventId
        : invite?.eventId && !invite.token
          ? invite.eventId
          : list[0]?.id ?? ''
      if (preferredId) {
        await loadEventWorkspace(preferredId, preserveDraft)
      } else {
        setActiveEventId('')
        setActiveEvent(null)
      }
    } catch (error) {
      if (isApiError(error) && error.status === 401) {
        setUser(null)
        setPhase('auth')
        setAuthError(formatApiError(error, locale, 'authService'))
        return
      }
      setEventError(formatApiError(error, locale, 'general'))
    }
  }, [api, loadEventWorkspace, locale])

  useEffect(() => {
    let cancelled = false
    async function bootstrap() {
      setPhase('checking')
      try {
        const me = await api.getMe()
        if (cancelled) return
        if (!me) {
          setUser(null)
          setPhase('auth')
          return
        }
        setUser(me)
        await enterAuthenticated(pendingInvite, false)
      } catch (error) {
        if (cancelled) return
        setUser(null)
        setPhase('auth')
        setAuthError(formatApiError(error, locale, 'authService'))
      }
    }
    void bootstrap()
    return () => { cancelled = true }
    // Run initial session check once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api])

  // Refetch server recommendations when switching language while viewing results.
  useEffect(() => {
    if (phase !== 'ready' || tab !== 'results' || !activeEventId || recommendations === null) return
    let cancelled = false
    async function reloadLocalizedRecs() {
      setRecsLoading(true)
      try {
        const items = await api.getEventRecommendations(activeEventId, locale)
        if (!cancelled) setRecommendations(items)
      } catch {
        // Keep current recommendations visible if locale reload fails.
      } finally {
        if (!cancelled) setRecsLoading(false)
      }
    }
    void reloadLocalizedRecs()
    return () => { cancelled = true }
    // Trigger only when locale changes while viewing server recommendations.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale])

  // Refresh introductions, meetings & active recommendations when returning to the browser tab.
  useEffect(() => {
    if (phase !== 'ready' || !activeEventId) return
    const handleReturn = () => {
      if (document.visibilityState === 'visible') {
        void refreshSocialState(activeEventId, true)
        if (tab === 'results' && hasSavedProfile) {
          void api.getEventRecommendations(activeEventId, locale).then(items => {
            setRecommendations(items)
            setRecsMessage(items.length > 0 && items.length < 5 ? messages.results.partialMatches(items.length) : '')
          }).catch(() => {})
        }
      }
    }
    const handleWindowFocus = () => {
      void refreshSocialState(activeEventId, true)
      if (tab === 'results' && hasSavedProfile) {
        void api.getEventRecommendations(activeEventId, locale).then(items => {
          setRecommendations(items)
          setRecsMessage(items.length > 0 && items.length < 5 ? messages.results.partialMatches(items.length) : '')
        }).catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', handleReturn)
    window.addEventListener('focus', handleWindowFocus)
    return () => {
      document.removeEventListener('visibilitychange', handleReturn)
      window.removeEventListener('focus', handleWindowFocus)
    }
  }, [activeEventId, api, hasSavedProfile, locale, messages.results, phase, refreshSocialState, tab])

  // Sync browser URL to /events/{id} when an event is active, and clear stale /events or /invite path when no event is selected.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.history?.replaceState) return
    if (phase === 'ready' && user && activeEventId) {
      const targetPath = `/events/${encodeURIComponent(activeEventId)}`
      if (window.location.pathname !== targetPath || window.location.search) {
        window.history.replaceState(null, '', targetPath)
      }
    } else if ((phase === 'ready' && user && !activeEventId) || phase === 'expired') {
      if (/^\/(events|invite)\//.test(window.location.pathname)) {
        window.history.replaceState(null, '', '/?mode=account')
      }
    }
  }, [activeEventId, phase, user])

  function chooseAuthMode(createAccount: boolean) {
    setRegistering(createAccount)
    setPassword('')
    setAuthError('')
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const login = username.trim().toLowerCase()
    if (!/^[a-z0-9_-]{3,32}$/.test(login)) {
      setAuthError(t.errors.usernameInvalid)
      return
    }
    if (!password || (registering && Array.from(password).length < 6)) {
      setAuthError(registering ? t.errors.passwordTooShort : t.errors.passwordRequired)
      return
    }
    setAuthBusy(true)
    setAuthError('')
    try {
      const me = registering
        ? await api.registerWithPassword(login, password)
        : await api.signInWithPassword(login, password)
      setUser(me)
      setPassword('')
      const preserveDraft = Boolean(draft.name || draft.role || draft.skills || draft.about)
      await enterAuthenticated(pendingInvite ?? (activeEventId ? { eventId: activeEventId } : null), preserveDraft)
    } catch (error) {
      setAuthError(formatApiError(error, locale, 'auth'))
    } finally {
      setAuthBusy(false)
    }
  }

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await api.logout()
    } catch {
      // Clear local session view even if session already expired.
    } finally {
      setLoggingOut(false)
      setUser(null)
      setEvents([])
      setActiveEventId('')
      setActiveEvent(null)
      setRecommendations(null)
      setIntroductions([])
      setMeetings([])
      setNotifications([])
      setSlotsByIntroId({})
      setSocialError('')
      setSocialNotice('')
      prevIntrosRef.current = []
      prevMeetingsRef.current = []
      socialInitializedRef.current = false
      setDraft(emptyDraft())
      setSavedBaseline(null)
      setPendingLeaveAction(null)
      setHasSavedProfile(false)
      setShowErrors(false)
      setSaveError('')
      setSaveSuccess(false)
      setAuthError('')
      setPhase('auth')
    }
  }

  async function handleLeaveEvent() {
    if (!activeEventId) return
    setLeavingEvent(true)
    setEventError('')
    try {
      await api.leaveEvent(activeEventId)
      const remaining = events.filter(item => item.id !== activeEventId)
      setEvents(remaining)
      if (remaining[0]) {
        await loadEventWorkspace(remaining[0].id)
      } else {
        setActiveEventId('')
        setActiveEvent(null)
        setRecommendations(null)
        setDraft(emptyDraft())
        setSavedBaseline(null)
        setHasSavedProfile(false)
      }
    } catch (error) {
      setEventError(formatApiError(error, locale, 'general'))
    } finally {
      setLeavingEvent(false)
    }
  }

  async function handleDeleteAccount() {
    if (!window.confirm(t.deleteAccountConfirm)) return
    setDeletingAccount(true)
    setEventError('')
    try {
      await api.deleteAccount({ confirm: true })
      setUser(null)
      setEvents([])
      setActiveEventId('')
      setActiveEvent(null)
      setRecommendations(null)
      setDraft(emptyDraft())
      setHasSavedProfile(false)
      onExitToDemo()
    } catch (error) {
      setEventError(formatApiError(error, locale, 'general'))
    } finally {
      setDeletingAccount(false)
    }
  }

  async function loadRecommendations(eventId: string, afterFeedback = false) {
    setRecsLoading(true)
    setEventError('')
    try {
      const items = await api.getEventRecommendations(eventId, locale)
      setRecommendations(items)
      if (afterFeedback) {
        setRecsMessage(messages.results.feedbackSaved(items.length))
      } else if (items.length > 0 && items.length < 5) {
        setRecsMessage(messages.results.partialMatches(items.length))
      } else {
        setRecsMessage('')
      }
      setTab('results')
      if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
      }
      requestAnimationFrame(() => document.getElementById('results-title')?.focus({ preventScroll: true }))
    } catch (error) {
      if (isApiError(error) && error.status === 401) {
        setUser(null)
        setPhase('auth')
        setAuthError(formatApiError(error, locale, 'authService'))
        return
      }
      setEventError(formatApiError(error, locale, 'general'))
    } finally {
      setRecsLoading(false)
    }
  }

  async function saveProfileAndFetch() {
    if (!activeEventId || !draft.goal) return
    setSaving(true)
    setSaveError('')
    setSaveSuccess(false)
    const showLookingFor =
      draft.goal === 'find_job' ||
      draft.goal === 'hire' ||
      draft.goal === 'find_cofounder' ||
      draft.goal === 'find_mentor'
    try {
      const saved = await api.saveEventProfile(activeEventId, {
        name: draft.name.trim(),
        goal: draft.goal,
        role: draft.role.trim(),
        experienceYears: Number(draft.experience),
        skills: parseTopics(draft.skills),
        interests: parseTopics(draft.interests),
        about: draft.about.trim(),
        ...(showLookingFor && draft.lookingFor.trim() ? { lookingFor: parseTopics(draft.lookingFor) } : {}),
        visible: draft.visible,
        consentVersion: 'v1',
      })
      const nextSaved = profileToDraft(saved)
      setHasSavedProfile(true)
      setSavedBaseline(nextSaved)
      setDraft(nextSaved)
      setSaveSuccess(true)
      await loadRecommendations(activeEventId)
    } catch (error) {
      if (isApiError(error) && error.status === 401) {
        // Keep draft intact so user does not lose typed fields on re-login.
        setUser(null)
        setPhase('auth')
        setAuthError(t.errors.sessionExpired)
        return
      }
      setSaveError(formatApiError(error, locale, 'save'))
    } finally {
      setSaving(false)
    }
  }

  function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const currentErrors = validateDraft(draft, locale)
    const firstInvalid = Object.keys(currentErrors)[0]
    if (firstInvalid) {
      setShowErrors(true)
      const control = event.currentTarget.elements.namedItem(firstInvalid)
      if (control instanceof HTMLElement) requestAnimationFrame(() => control.focus())
      return
    }
    setShowErrors(false)
    void saveProfileAndFetch()
  }

  async function handleServerFeedback(candidateId: string, response: Feedback) {
    if (!activeEventId) return
    try {
      await api.sendEventFeedback(activeEventId, candidateId, response)
      await loadRecommendations(activeEventId, true)
    } catch (error) {
      setEventError(formatApiError(error, locale, 'general'))
    }
  }

  async function handleRequestIntro(candidateId: string) {
    if (!activeEventId || requestingIntroId) return
    const existing = introductions.find(item => item.participantId === candidateId)
    if (existing && (existing.status === 'pending' || existing.status === 'accepted')) {
      setSocialNotice(messages.social.alreadyRequested)
      return
    }
    setRequestingIntroId(candidateId)
    setSocialError('')
    setSocialNotice('')
    try {
      const created = await api.createIntroduction(activeEventId, candidateId)
      const enriched: IntroductionItem = {
        ...created,
        participantId: created.participantId ?? candidateId,
        direction: created.direction ?? 'outgoing',
      }
      setIntroductions(current => {
        const exists = current.some(item => item.id === enriched.id)
        const next = exists
          ? current.map(item => (item.id === enriched.id ? { ...item, ...enriched } : item))
          : [enriched, ...current]
        prevIntrosRef.current = next
        return next
      })
      await refreshSocialState(activeEventId, false)
    } catch (error) {
      if (isBlockedOrRestrictedError(error)) {
        setSocialError(messages.moderation.interactionBlockedError)
      } else {
        setSocialError(formatApiError(error, locale, 'general'))
      }
    } finally {
      setRequestingIntroId('')
    }
  }

  async function handleBlockParticipant(candidateId: string) {
    if (!activeEventId) return
    setSocialError('')
    setSocialNotice('')
    try {
      await api.blockParticipant(activeEventId, candidateId)
      setRecommendations(current => current && current.filter(item => item.candidate.id !== candidateId))
      setSocialNotice(messages.moderation.blockedNotice)
      await refreshSocialState(activeEventId, false)
    } catch (error) {
      setSocialError(formatApiError(error, locale, 'general'))
    }
  }

  async function handleReportParticipant(candidateId: string, reason: ReportReason, details: string) {
    if (!activeEventId) return
    setSocialError('')
    setSocialNotice('')
    try {
      await api.submitReport(activeEventId, { subjectId: candidateId, reason, details })
      setSocialNotice(messages.moderation.reportedNotice)
    } catch (error) {
      setSocialError(formatApiError(error, locale, 'general'))
    }
  }

  async function handleUpdateIntro(introId: string, status: Exclude<IntroductionStatus, 'pending'>) {
    if (!activeEventId || busyIntroId) return
    setBusyIntroId(introId)
    setSocialError('')
    setSocialNotice('')
    try {
      await api.updateIntroduction(activeEventId, introId, status)
      await refreshSocialState(activeEventId, false)
    } catch (error) {
      setSocialError(formatApiError(error, locale, 'general'))
    } finally {
      setBusyIntroId('')
    }
  }

  async function handleSaveContact(value: string) {
    setSavingContact(true)
    setContactSaved(false)
    setSocialError('')
    try {
      await api.saveContact(value)
      setContactValue(value)
      setContactSaved(true)
      return true
    } catch (error) {
      setSocialError(formatApiError(error, locale, 'general'))
      return false
    } finally {
      setSavingContact(false)
    }
  }

  async function handleToggleSlots(introId: string) {
    if (!activeEventId) return
    if (slotsByIntroId[introId] !== undefined) {
      setSlotsByIntroId(current => {
        const next = { ...current }
        delete next[introId]
        return next
      })
      return
    }
    setLoadingSlotsIntroId(introId)
    setSocialError('')
    try {
      const slots = await api.listCommonSlots(activeEventId, introId)
      setSlotsByIntroId(current => ({ ...current, [introId]: slots }))
    } catch (error) {
      setSocialError(formatApiError(error, locale, 'general'))
    } finally {
      setLoadingSlotsIntroId('')
    }
  }

  async function handleProposeMeeting(introId: string, slotId: string) {
    if (!activeEventId || proposingSlotKey) return
    const key = `${introId}:${slotId}`
    setProposingSlotKey(key)
    setSocialError('')
    setSocialNotice('')
    try {
      await api.createMeeting(activeEventId, introId, slotId)
      setSocialNotice(messages.social.slotProposed)
      await refreshSocialState(activeEventId, false)
      const refreshedSlots = await api.listCommonSlots(activeEventId, introId)
      setSlotsByIntroId(current => ({ ...current, [introId]: refreshedSlots }))
    } catch (error) {
      if (isSlotConflictError(error)) {
        setSocialError(messages.social.slotConflict)
        try {
          const refreshedSlots = await api.listCommonSlots(activeEventId, introId)
          setSlotsByIntroId(current => ({ ...current, [introId]: refreshedSlots }))
          await refreshSocialState(activeEventId, false)
        } catch {
          // Keep slot conflict error visible.
        }
      } else {
        setSocialError(formatApiError(error, locale, 'general'))
      }
    } finally {
      setProposingSlotKey('')
    }
  }

  async function handleUpdateMeeting(meetingId: string, status: Exclude<ServerMeetingStatus, 'pending'>) {
    if (!activeEventId || busyMeetingId) return
    setBusyMeetingId(meetingId)
    setSocialError('')
    setSocialNotice('')
    try {
      await api.updateMeeting(activeEventId, meetingId, status)
      await refreshSocialState(activeEventId, false)
    } catch (error) {
      if (isSlotConflictError(error)) {
        setSocialError(messages.social.slotConflict)
        await refreshSocialState(activeEventId, false)
      } else {
        setSocialError(formatApiError(error, locale, 'general'))
      }
    } finally {
      setBusyMeetingId('')
    }
  }

  const introStatusByCandidate = useMemo(() => {
    const map: Record<string, IntroductionStatus> = {}
    for (const item of introductions) {
      if (item.participantId) map[item.participantId] = item.status
    }
    return map
  }, [introductions])

  const pendingIncomingCount = countPendingIncomingIntros(introductions)
  const activeMeetingsCount = countActionableMeetings(meetings)
  const eventTimeZone = activeEvent?.timeZone || 'Asia/Almaty'
  const activeEventSummary = events.find(item => item.id === activeEventId)
  const isOrganizerOfActive = activeEventSummary?.role === 'organizer'

  const matchedEventBooths = useMemo(() => {
    const published: PartnerBooth[] = eventBooths
      .filter(booth => booth.published)
      .map(booth => ({
        id: booth.id,
        name: booth.name,
        demo: false,
        topics: booth.topics,
        description: {
          ru: booth.description ?? '',
          kk: booth.description ?? '',
          en: booth.description ?? '',
        },
      }))
    if (!published.length) return []
    const skills = parseTopics(draft.skills)
    const interests = parseTopics(draft.interests)
    const lookingFor = parseTopics(draft.lookingFor)
    return recommendBooths({ skills, interests, lookingFor }, published, locale)
  }, [draft.interests, draft.lookingFor, draft.skills, eventBooths, locale])

  const errors = showErrors ? validateDraft(draft, locale) : {}
  const showLookingFor =
    draft.goal === 'find_job' ||
    draft.goal === 'hire' ||
    draft.goal === 'find_cofounder' ||
    draft.goal === 'find_mentor'
  const isClosed = activeEvent?.status === 'closed'
  const hasUnsavedChanges = useMemo(
    () => phase === 'ready' && tab === 'profile' && hasUnsavedProfileChanges(savedBaseline, draft),
    [draft, phase, savedBaseline, tab],
  )

  useEffect(() => {
    if (!hasUnsavedChanges) return
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  const guardNavigation = useCallback((action: () => void, trigger?: HTMLElement | null) => {
    if (!hasUnsavedChanges) {
      action()
      return
    }
    pendingTriggerRef.current = trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null)
    setPendingLeaveAction(() => action)
  }, [hasUnsavedChanges])

  const lastExitSeqRef = useRef(exitRequestSeq)
  useEffect(() => {
    if (exitRequestSeq === lastExitSeqRef.current) return
    lastExitSeqRef.current = exitRequestSeq
    guardNavigation(onExitToDemo)
  }, [exitRequestSeq, guardNavigation, onExitToDemo])

  function handleStayOnProfile() {
    setPendingLeaveAction(null)
    requestAnimationFrame(() => pendingTriggerRef.current?.focus())
  }

  function handleDiscardAndContinue() {
    const action = pendingLeaveAction
    setPendingLeaveAction(null)
    if (savedBaseline) {
      setDraft(savedBaseline)
      setShowErrors(false)
      setSaveError('')
    }
    action?.()
  }

  function updateField<K extends keyof EventProfileDraft>(key: K, value: EventProfileDraft[K]) {
    setDraft(current => ({ ...current, [key]: value }))
    setSaveSuccess(false)
  }

  if (phase === 'checking' || phase === 'joining') {
    return (
      <main className="site-width account-main">
        <div className="surface status-panel" role="status" aria-live="polite" aria-busy="true">
          <p>{phase === 'joining' ? t.joiningInvite : t.loadingSession}</p>
        </div>
      </main>
    )
  }

  if (phase === 'expired') {
    return (
      <main className="site-width account-main">
        <section className="surface status-panel" aria-labelledby="expired-invite-title">
          <h1 id="expired-invite-title">{t.expiredTitle}</h1>
          <p>{t.expiredBody}</p>
          <div className="status-actions">
            {events.length > 0 && (
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  setPhase('ready')
                  void loadEventWorkspace(events[0].id)
                }}
              >{t.openMyEvents}</button>
            )}
            <button type="button" className="secondary-button" onClick={onExitToDemo}>{t.backToDemo}</button>
          </div>
        </section>
      </main>
    )
  }

  if (phase === 'auth' || !user) {
    const authShowcase = locale === 'kk'
      ? {
          tag: 'Qazaq IT Community',
          headline: 'Офлайн және гибрид IT-іс-шараларға арналған нетворкинг',
          caption: 'QR-шақыру бойынша кіріп, ортақ стек пен мақсатқа сай мамандармен 1:1 кездесулер жоспарлаңыз.',
          badges: ['Almaty · Astana', '1:1 кездесулер', 'QR-рұқсат'],
        }
      : locale === 'en'
        ? {
            tag: 'Qazaq IT Community',
            headline: 'Structured networking for live IT meetups',
            caption: 'Join with an organizer QR pass, match by engineering goals and stack, and book focused 1:1 meetings.',
            badges: ['Almaty · Astana', '1:1 meetings', 'QR pass'],
          }
        : {
            tag: 'Qazaq IT Community',
            headline: 'Нетворкинг для живых IT-митапов и конференций',
            caption: 'Входите по приглашению организатора, находите собеседников по целям и стеку и бронируйте 1:1 встречи.',
            badges: ['Almaty · Astana', '1:1 встречи', 'QR-пропуск'],
          }
    return (
      <main className="site-width account-main">
        <div className="auth-split">
          <section className="auth-card surface" aria-labelledby="auth-title">
            <div className="page-heading">
              <div>
                <h1 id="auth-title">{t.signInTitle}</h1>
                <p>{t.signInSubtitle}</p>
              </div>
            </div>

            {pendingInvite && (
              <div className="info-banner" role="status">
                {t.inviteNotice}
              </div>
            )}

            {authError && (
              <div className="error-banner" role="alert">
                {authError}
              </div>
            )}

            <form noValidate onSubmit={handlePasswordSubmit} className="auth-form">
              <div className="purpose-toggle" role="group" aria-label={t.signInTitle}>
                <button type="button" aria-pressed={!registering} disabled={authBusy} onClick={() => chooseAuthMode(false)}>
                  {t.purposeLogin}
                </button>
                <button type="button" aria-pressed={registering} disabled={authBusy} onClick={() => chooseAuthMode(true)}>
                  {t.purposeRegister}
                </button>
              </div>

              <div className="field">
                <label htmlFor={`${id}-username`}>{t.usernameLabel}</label>
                <input
                  id={`${id}-username`}
                  name="username"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  maxLength={32}
                  required
                  value={username}
                  disabled={authBusy}
                  onChange={event => {
                    setUsername(event.target.value)
                    setAuthError('')
                  }}
                />
              </div>

              <div className="field">
                <label htmlFor={`${id}-password`}>{t.passwordLabel}</label>
                <input
                  id={`${id}-password`}
                  name="password"
                  type="password"
                  autoComplete={registering ? 'new-password' : 'current-password'}
                  aria-describedby={registering ? `${id}-password-hint` : undefined}
                  maxLength={512}
                  required
                  value={password}
                  disabled={authBusy}
                  onChange={event => {
                    setPassword(event.target.value)
                    setAuthError('')
                  }}
                />
                {registering && <p id={`${id}-password-hint`} className="auth-hint">{t.passwordHint}</p>}
              </div>

              <div className="auth-actions">
                <button type="submit" className="primary-button" disabled={authBusy}>
                  {authBusy ? t.authSubmitting : registering ? t.purposeRegister : t.purposeLogin}
                </button>
                <button type="button" className="secondary-button" onClick={onExitToDemo}>
                  {t.backToDemo}
                </button>
              </div>
            </form>
          </section>

          <aside className="surface auth-showcase" aria-hidden="true">
            <div className="auth-showcase__top">
              <span className="gcore-pill">✦ {authShowcase.tag}</span>
              <strong className="auth-showcase__headline">{authShowcase.headline}</strong>
              <p className="auth-showcase__caption">{authShowcase.caption}</p>
            </div>
            <div className="auth-circuit-box">
              <div className="gcore-chip">
                <span className="gcore-chip__core">QR · 1:1</span>
                <span className="gcore-chip__sub">TANYS</span>
              </div>
              <div className="auth-Showcase-grid">
                {authShowcase.badges.map((badge, idx) => (
                  <div key={badge} className="gcore-node">
                    <span className="gcore-node__code">{idx === 0 ? 'KZ' : idx === 1 ? '1:1' : 'QR'}</span>
                    <span className="gcore-node__label">{badge}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>
    )
  }

  return (
    <div className="site-width workspace">
      <nav className="workspace-nav" aria-label={messages.nav.label}>
        <button
          type="button"
          aria-current={tab === 'profile' ? 'page' : undefined}
          disabled={!activeEventId}
          onClick={() => setTab('profile')}
        >{messages.nav.profile}</button>
        <button
          type="button"
          aria-current={tab === 'results' ? 'page' : undefined}
          disabled={!activeEventId || !hasSavedProfile}
          onClick={event => guardNavigation(() => {
            if (activeEventId) {
              void loadRecommendations(activeEventId)
            } else {
              setTab('results')
            }
          }, event.currentTarget)}
        >
          {messages.nav.results} {recommendations && <span className="nav-count">{recommendations.length}</span>}
        </button>
        <button
          type="button"
          aria-current={tab === 'introductions' ? 'page' : undefined}
          disabled={!activeEventId}
          onClick={event => guardNavigation(() => {
            setTab('introductions')
            if (activeEventId) void refreshSocialState(activeEventId, true)
          }, event.currentTarget)}
        >
          {messages.social.navIntroductions}{' '}
          <span className="nav-count">{pendingIncomingCount || introductions.length}</span>
        </button>
        <button
          type="button"
          aria-current={tab === 'meetings' ? 'page' : undefined}
          disabled={!activeEventId}
          onClick={event => guardNavigation(() => {
            setTab('meetings')
            if (activeEventId) void refreshSocialState(activeEventId, true)
          }, event.currentTarget)}
        >
          {messages.social.navMeetings} <span className="nav-count">{activeMeetingsCount}</span>
        </button>
        <button
          type="button"
          aria-current={tab === 'organizer' ? 'page' : undefined}
          onClick={event => guardNavigation(() => setTab('organizer'), event.currentTarget)}
        >
          {messages.organizer.navLabel}
        </button>
        <button
          type="button"
          disabled={loggingOut}
          onClick={event => guardNavigation(() => void handleLogout(), event.currentTarget)}
        >{loggingOut ? t.loggingOut : t.logout}</button>
      </nav>

      <main className="main-content">
        <NotificationBanner
          notifications={notifications}
          locale={locale}
          onDismiss={() => setNotifications([])}
        />
        <div className="event-toolbar surface">
          {events.length > 0 ? (
            <label className="event-picker">
              <span>{t.eventSelectorLabel}</span>
              <select
                value={activeEventId}
                disabled={eventLoading || saving}
                onChange={event => {
                  const nextId = event.target.value
                  guardNavigation(() => void loadEventWorkspace(nextId), event.currentTarget)
                }}
              >
                {events.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.name || item.id}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <span className="event-picker-empty">{t.noEventsTitle}</span>
          )}

          <div className="event-toolbar-actions">
            {activeEventId && (
              <button
                type="button"
                className="text-button"
                disabled={leavingEvent || saving || deletingAccount}
                onClick={event => guardNavigation(() => void handleLeaveEvent(), event.currentTarget)}
              >{leavingEvent ? t.leavingEvent : t.leaveEvent}</button>
            )}
            <button
              type="button"
              className="text-button danger-button"
              disabled={deletingAccount || leavingEvent || loggingOut || saving}
              onClick={() => void handleDeleteAccount()}
            >{deletingAccount ? t.deletingAccount : t.deleteAccount}</button>
          </div>
        </div>

        {eventError && <div className="error-banner" role="alert">{eventError}</div>}

        {eventLoading ? (
          <div className="surface status-panel" role="status" aria-live="polite" aria-busy="true">
            <p>{t.loadingEvent}</p>
          </div>
        ) : tab === 'organizer' ? (
          <Suspense fallback={<div className="surface status-panel" role="status" aria-live="polite" aria-busy="true"><p>{t.loadingEvent}</p></div>}>
            <OrganizerCabinet
              api={api}
              locale={locale}
              activeEvent={activeEvent}
              isOrganizerOfActive={isOrganizerOfActive}
              onEventCreated={async created => {
                const list = await api.listEvents()
                const merged = list.some(item => item.id === created.id)
                  ? list
                  : [{ id: created.id, name: created.name, role: 'organizer' as const, status: created.status, timeZone: created.timeZone }, ...list]
                setEvents(merged)
                await loadEventWorkspace(created.id)
                setTab('organizer')
              }}
              onEventUpdated={updated => {
                setActiveEvent(updated)
                setEvents(current => current.map(item => (item.id === updated.id ? { ...item, name: updated.name, status: updated.status } : item)))
              }}
              onBoothsChanged={nextBooths => setEventBooths(nextBooths)}
            />
          </Suspense>
        ) : !activeEventId ? (
          <section className="surface empty-state">
            <h1>{t.noEventsTitle}</h1>
            <p>{t.noEventsBody}</p>
          </section>
        ) : tab === 'introductions' ? (
          <IntroductionsPanel
            introductions={introductions}
            locale={locale}
            timeZone={eventTimeZone}
            busyIntroId={busyIntroId}
            slotsByIntroId={slotsByIntroId}
            loadingSlotsIntroId={loadingSlotsIntroId}
            proposingSlotKey={proposingSlotKey}
            contactValue={contactValue}
            savingContact={savingContact}
            contactSaved={contactSaved}
            socialError={socialError}
            socialNotice={socialNotice}
            onSaveContact={handleSaveContact}
            onUpdateIntro={(introId, status) => void handleUpdateIntro(introId, status)}
            onToggleSlots={introId => void handleToggleSlots(introId)}
            onProposeMeeting={(introId, slotId) => void handleProposeMeeting(introId, slotId)}
            onRefresh={() => { if (activeEventId) void refreshSocialState(activeEventId, true) }}
            refreshing={socialRefreshing}
          />
        ) : tab === 'meetings' ? (
          <div className="meetings-bento-grid bento-grid">
          {!isClosed && (
            <AvailabilityEditor
              key={activeEventId}
              api={api}
              event={activeEventId}
              locale={locale}
              zone={eventTimeZone}
              startsAt={activeEvent?.startsAt}
              endsAt={activeEvent?.endsAt}
            />
          )}
          <ServerMeetingsPanel
            meetings={meetings}
            locale={locale}
            timeZone={eventTimeZone}
            busyMeetingId={busyMeetingId}
            socialError={socialError}
            socialNotice={socialNotice}
            onUpdateMeeting={(meetingId, status) => void handleUpdateMeeting(meetingId, status)}
            onRefresh={() => { if (activeEventId) void refreshSocialState(activeEventId, true) }}
            refreshing={socialRefreshing}
          />
          </div>
        ) : tab === 'results' ? (
          recsLoading && recommendations === null ? (
            <div className="surface status-panel" role="status" aria-live="polite" aria-busy="true">
              <p>{t.loadingRecommendations}</p>
            </div>
          ) : (
            <>
              {socialError && <div className="error-banner" role="alert">{socialError}</div>}
              {socialNotice && <div className="info-banner" role="status">{socialNotice}</div>}
              {!draft.visible && (
                <div className="info-banner visibility-warning-banner" role="status">
                  {t.hiddenProfileWarning}
                </div>
              )}
              <RecommendationResults
                recommendations={recommendations ?? []}
                onEdit={() => {
                  setTab('profile')
                  if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
                    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
                  }
                  requestAnimationFrame(() => document.getElementById('event-profile-title')?.focus({ preventScroll: true }))
                }}
                onRefresh={() => {
                  if (activeEventId) void loadRecommendations(activeEventId)
                }}
                refreshing={recsLoading}
                onFeedback={(candidateId, response) => void handleServerFeedback(candidateId, response)}
                onRequestIntro={candidateId => void handleRequestIntro(candidateId)}
                introStatusByCandidate={introStatusByCandidate}
                requestingIntroId={requestingIntroId}
                onBlockParticipant={candidateId => void handleBlockParticipant(candidateId)}
                onReportParticipant={(candidateId, reason, details) => void handleReportParticipant(candidateId, reason, details)}
                message={recsMessage}
                locale={locale}
              />
              <PartnerBooths recommendations={matchedEventBooths} locale={locale} />
            </>
          )
        ) : (
          <form className="profile-form" aria-labelledby="event-profile-title" noValidate onSubmit={handleProfileSubmit}>
            <div className="page-heading">
              <div>
                <h1 id="event-profile-title" tabIndex={-1}>
                  {hasSavedProfile ? t.profileEditTitle : t.profileTitle}
                </h1>
                <p>{activeEvent?.name ? `${activeEvent.name} · ` : ''}{t.profileSubtitle}</p>
              </div>
              <span className={`visibility-pill ${draft.visible ? 'visibility-pill--on' : ''}`}>
                {draft.visible ? t.visibilityStatusVisible : t.visibilityStatusHidden}
              </span>
            </div>

            {isClosed && <div className="info-banner" role="status">{t.eventClosedNotice}</div>}

            {saveError && (
              <div className="error-banner error-banner--actions" role="alert">
                <span>{saveError}</span>
                <button
                  type="button"
                  className="secondary-button"
                  disabled={saving}
                  onClick={() => void saveProfileAndFetch()}
                >{t.retrySave}</button>
              </div>
            )}

            {saveSuccess && <div className="info-banner" role="status">{t.savedNotice}</div>}

            <div className="form-panel surface">
              <div className="form-fields">
                <div className="field">
                  <label htmlFor={`${id}-name`}>{t.nameLabel}</label>
                  <input
                    id={`${id}-name`}
                    name="name"
                    required
                    maxLength={80}
                    disabled={saving || isClosed}
                    placeholder={t.namePlaceholder}
                    aria-invalid={errors.name ? true : undefined}
                    aria-describedby={errors.name ? `${id}-name-error` : undefined}
                    value={draft.name}
                    onChange={event => updateField('name', event.target.value)}
                  />
                  {errors.name && <span id={`${id}-name-error`} className="field-error">{errors.name}</span>}
                </div>

                <div className="field">
                  <label htmlFor={`${id}-goal`}>{formText.goalLabel}</label>
                  <CustomSelect
                    id={`${id}-goal`}
                    name="goal"
                    required
                    disabled={saving || isClosed}
                    aria-invalid={errors.goal ? true : undefined}
                    aria-describedby={errors.goal ? `${id}-goal-error` : undefined}
                    value={draft.goal}
                    placeholder={formText.goalPlaceholder}
                    options={Object.entries(goalLabels).map(([goal, label]) => ({ value: goal, label }))}
                    onChange={val => updateField('goal', val as Goal | '')}
                  />
                  {errors.goal && <span id={`${id}-goal-error`} className="field-error">{errors.goal}</span>}
                </div>

                <div className="field">
                  <label htmlFor={`${id}-role`}>{formText.roleLabel}</label>
                  <input
                    id={`${id}-role`}
                    name="role"
                    required
                    maxLength={80}
                    disabled={saving || isClosed}
                    placeholder={formText.rolePlaceholder}
                    aria-invalid={errors.role ? true : undefined}
                    aria-describedby={errors.role ? `${id}-role-error` : undefined}
                    value={draft.role}
                    onChange={event => updateField('role', event.target.value)}
                  />
                  {errors.role && <span id={`${id}-role-error`} className="field-error">{errors.role}</span>}
                </div>

                <div className="field">
                  <label htmlFor={`${id}-experience`}>{formText.experienceLabel}</label>
                  <input
                    id={`${id}-experience`}
                    name="experience"
                    type="number"
                    min={0}
                    max={60}
                    required
                    disabled={saving || isClosed}
                    placeholder="0"
                    aria-invalid={errors.experience ? true : undefined}
                    aria-describedby={errors.experience ? `${id}-experience-error` : undefined}
                    value={draft.experience}
                    onChange={event => updateField('experience', event.target.value)}
                  />
                  {errors.experience && <span id={`${id}-experience-error`} className="field-error">{errors.experience}</span>}
                </div>

                <div className="field">
                  <label htmlFor={`${id}-skills`}>{formText.skillsLabel}</label>
                  <input
                    id={`${id}-skills`}
                    name="skills"
                    required
                    maxLength={160}
                    disabled={saving || isClosed}
                    placeholder={formText.skillsPlaceholder}
                    aria-invalid={errors.skills ? true : undefined}
                    aria-describedby={errors.skills ? `${id}-skills-error` : undefined}
                    value={draft.skills}
                    onChange={event => updateField('skills', event.target.value)}
                  />
                  {errors.skills && <span id={`${id}-skills-error`} className="field-error">{errors.skills}</span>}
                </div>

                <div className="field">
                  <label htmlFor={`${id}-interests`}>{formText.interestsLabel}</label>
                  <input
                    id={`${id}-interests`}
                    name="interests"
                    required
                    maxLength={160}
                    disabled={saving || isClosed}
                    placeholder={formText.interestsPlaceholder}
                    aria-invalid={errors.interests ? true : undefined}
                    aria-describedby={errors.interests ? `${id}-interests-error` : undefined}
                    value={draft.interests}
                    onChange={event => updateField('interests', event.target.value)}
                  />
                  {errors.interests && <span id={`${id}-interests-error`} className="field-error">{errors.interests}</span>}
                </div>

                {showLookingFor && (
                  <label className="field field-full">
                    <span>
                      {draft.goal === 'find_job' ? formText.findJobLookingForLabel : formText.lookingForLabel}{' '}
                      <small>{formText.optional}</small>
                    </span>
                    <input
                      name="lookingFor"
                      maxLength={160}
                      disabled={saving || isClosed}
                      placeholder={
                        draft.goal === 'find_job'
                          ? formText.findJobLookingForPlaceholder
                          : formText.lookingForPlaceholder
                      }
                      value={draft.lookingFor}
                      onChange={event => updateField('lookingFor', event.target.value)}
                    />
                    {draft.goal === 'hire' && !draft.lookingFor.trim() && (
                      <span className="field-hint">{formText.hireLookingForHint}</span>
                    )}
                  </label>
                )}

                <div className="field field-full">
                  <label htmlFor={`${id}-about`}>{formText.aboutLabel}</label>
                  <textarea
                    id={`${id}-about`}
                    name="about"
                    rows={2}
                    maxLength={400}
                    required
                    disabled={saving || isClosed}
                    placeholder={formText.aboutPlaceholder}
                    aria-invalid={errors.about ? true : undefined}
                    aria-describedby={errors.about ? `${id}-about-error` : undefined}
                    value={draft.about}
                    onChange={event => updateField('about', event.target.value)}
                  />
                  {errors.about && <span id={`${id}-about-error`} className="field-error">{errors.about}</span>}
                </div>

                <div className="field field-full privacy-box">
                  <span className="privacy-box__heading">{t.visibilityHeading}</span>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      name="visible"
                      disabled={saving || isClosed}
                      checked={draft.visible}
                      onChange={event => updateField('visible', event.target.checked)}
                    />
                    <span>{t.visibilityToggleLabel}</span>
                  </label>
                  <p className="privacy-box__note">{t.visibilityNotice}</p>
                  {!draft.visible && (
                    <p className="field-hint privacy-box__warning">{t.hiddenProfileWarning}</p>
                  )}
                </div>

                <div className="field field-full">
                  <label className="checkbox-row">
                    <input
                      id={`${id}-consent`}
                      type="checkbox"
                      name="consent"
                      required
                      disabled={saving || isClosed}
                      aria-invalid={errors.consent ? true : undefined}
                      aria-describedby={errors.consent ? `${id}-consent-error` : undefined}
                      checked={draft.consentAccepted}
                      onChange={event => updateField('consentAccepted', event.target.checked)}
                    />
                    <span className="consent-text">{t.consentLabel}</span>
                  </label>
                  {errors.consent && <span id={`${id}-consent-error`} className="field-error">{errors.consent}</span>}
                </div>
              </div>

              <div className="form-footer">
                <button type="submit" className="primary-button" disabled={saving || isClosed}>
                  {saving ? t.savingProfile : t.saveProfile}
                </button>
                <span>
                  {hasUnsavedChanges
                    ? t.unsaved.badge
                    : draft.visible
                      ? t.visibilityStatusVisible
                      : t.visibilityStatusHidden}
                </span>
              </div>
            </div>
          </form>
        )}
        {pendingLeaveAction && (
          <UnsavedChangesDialog
            locale={locale}
            onStay={handleStayOnProfile}
            onDiscard={handleDiscardAndContinue}
          />
        )}
        <footer className="support-footer">
          <p>{messages.moderation.supportNotice}</p>
        </footer>
      </main>
    </div>
  )
}
