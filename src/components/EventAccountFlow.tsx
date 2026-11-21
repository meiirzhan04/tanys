import { InviteEntry } from './InviteEntry'
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
  AccountProfile,
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
import type { Locale, Recommendation } from '../matching/types'
import { CustomSelect } from './CustomSelect'
import { EventQuestionnaireFields, validateDraft, usesLookingFor } from './profile/EventQuestionnaireFields'
import { ConfirmDialog } from './profile/ConfirmDialog'
import { accountLabels } from './profile/accountLabels'
import { AccountProfilePanel } from './profile/AccountProfilePanel'
import { profileCopy } from './profile/profileCopy'
import { accountDialogCopy } from './profile/accountDialogCopy'
import { identityCopy } from './profile/identityCopy'
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

const RECOMMENDATIONS_REFRESH_MS = 15_000
type EventTab = 'profile' | 'results' | 'introductions' | 'meetings' | 'organizer' | 'me'

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
    // Visible by default: hidden questionnaires cannot be found or receive requests, which confused people.
    visible: true,
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
  onAuthenticatedChange?: (active: boolean) => void
  exitRequestSeq?: number
  api?: TanysApiClient
}

export function EventAccountFlow({
  locale,
  initialInvite,
  onExitToDemo,
  exitRequestSeq = 0,
  onAuthenticatedChange,
  api = defaultApiClient,
}: EventAccountFlowProps) {
  const id = useId()
  const needsInviteLink = /^\/join\/?$/.test(window.location.pathname) ||
    (window.location.pathname.startsWith('/invite/') && !initialInvite?.token)
  const messages = getMessages(locale)
  const t = messages.account

  const [pendingInvite, setPendingInvite] = useState<InviteTarget | null>(() => {
    const resolved = initialInvite ?? loadPendingInvite()
    if (resolved) savePendingInvite(resolved)
    return resolved
  })
  const [user, setUser] = useState<AuthUser | null>(null)
  const [phase, setPhase] = useState<'checking' | 'auth' | 'joining' | 'expired' | 'inviteError' | 'ready'>('checking')

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
  const [inviteFailure, setInviteFailure] = useState<'inviteClosed' | 'inviteRevoked' | 'inviteExpired' | 'expiredTitle'>('expiredTitle')
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
  const [contactState, setContactState] = useState<'loading' | 'ready' | 'error'>('loading')
  const contactRevision = useRef(0)
  const loadContact = useCallback(async () => {
    const revision = ++contactRevision.current
    setContactState('loading')
    try {
      const value = await api.getContact()
      if (revision !== contactRevision.current) return
      setContactValue(value ?? '')
      setContactState('ready')
    } catch { if (revision === contactRevision.current) setContactState('error') }
  }, [api])
  const endingSession = useRef(false)
  const redirectToLogin = useCallback(() => {
    endingSession.current = true
    window.location.replace('/login')
  }, [])
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [logoutError, setLogoutError] = useState('')
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
        api.listIntroductions(eventId, locale),
        api.listMeetings(eventId),
      ])

      // Enrich accepted introductions with GET /events/E/introductions/I when contact is omitted from the list.
      const nextIntros = await Promise.all(
        rawIntros.map(async item => {
          if (item.status === 'accepted' && item.contact === undefined) {
            try {
              const detailed = await api.getIntroduction(eventId, item.id, locale)
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
        redirectToLogin()
        return
      }
      // Keep existing state intact if background refresh fails (e.g., backend #52/#53 not yet mounted).
    } finally {
      setSocialRefreshing(false)
    }
  }, [api, locale, redirectToLogin])

  const accountCache = useRef<Promise<AccountProfile> | null>(null)
  const readAccount = useCallback(() => {
    if (!accountCache.current) {
      const pending = api.getAccountProfile().catch(error => {
        if (accountCache.current === pending) accountCache.current = null
        throw error
      })
      accountCache.current = pending
    }
    return accountCache.current
  }, [api])

  const loadEventWorkspace = useCallback(async (eventId: string, preserveDraft = false, nextTab: EventTab = 'profile') => {
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
      const membershipRole = details.role
      if (membershipRole) {
        setEvents(current => current.some(item => item.id === details.id)
          ? current : [...current, { ...details, role: membershipRole }])
      }
      setHasSavedProfile(Boolean(profile))
      const loadedDraft = profile ? profileToDraft(profile) : null
      setSavedBaseline(loadedDraft)
      if (!preserveDraft) {
        const next = loadedDraft ?? emptyDraft()
        if (!loadedDraft) {
          try {
            const account = await readAccount()
            Object.assign(next, { name: account.name, role: account.profession, about: account.about })
          } catch (error) {
            setEventError(formatApiError(error, locale, 'general'))
          }
        }
        setDraft(next)
        setShowErrors(false)
      }
      setRecommendations(null)
      setEventBooths([])
      setRecsMessage('')
      setTab(nextTab)
      await refreshSocialState(eventId, false)
      try {
        setEventBooths(await api.listEventBooths(eventId))
      } catch {
        setEventBooths([])
      }
      return true
    } catch (error) {
      if (isApiError(error) && error.status === 401) {
        redirectToLogin()
        return
      }
      setEventError(isApiError(error) && error.status === 404 ? getMessages(locale).account.expiredBody : formatApiError(error, locale, 'general'))
      return false
    } finally {
      setEventLoading(false)
    }
  }, [api, locale, readAccount, redirectToLogin, refreshSocialState])

  const enterAuthenticated = useCallback(async (invite: InviteTarget | null, preserveDraft = false) => {
    accountCache.current = null
    // Owner-only contact so the profile and the requests screen show what is saved after a reload.
    setContactValue('')
    void loadContact()
    if (invite?.token) {
      setEventError('')
      setPhase('joining')
      try {
        await api.joinEvent(invite.eventId, invite.token)
      } catch (error) {
        if (isApiError(error) && error.status === 401) {
          redirectToLogin()
          return
        }
        if (isApiError(error) && (isInviteExpiredError(error) || error.code === 'event_closed')) {
          switch (error.code) {
            case 'event_closed': setInviteFailure('inviteClosed'); break
            case 'invite_revoked': setInviteFailure('inviteRevoked'); break
            case 'invite_expired': setInviteFailure('inviteExpired'); break
            default: setInviteFailure('expiredTitle')
          }
          savePendingInvite(null)
          setPendingInvite(null)
          setPhase('expired')
          return
        }
        setEventError(isApiError(error) && error.status >= 500
          ? getMessages(locale).account.inviteUnavailable : formatApiError(error, locale, 'general'))
        setPhase('inviteError')
        return
      }
    }

    try {
      const list = await api.listEvents()
      setEvents(list)
      const preferredId = invite?.eventId || list[0]?.id || ''
      if (preferredId) {
        const loaded = await loadEventWorkspace(preferredId, preserveDraft)
        if (!loaded && invite) {
          setPhase('inviteError')
          return
        }
        savePendingInvite(null)
        setPendingInvite(null)
      } else {
        setActiveEventId('')
        setActiveEvent(null)
      }
      setPhase('ready')
    } catch (error) {
      if (isApiError(error) && error.status === 401) {
        redirectToLogin()
        return
      }
      setEventError(formatApiError(error, locale, 'general'))
      setPhase(invite ? 'inviteError' : 'ready')
    }
  }, [api, loadContact, loadEventWorkspace, locale, redirectToLogin])

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
        if (needsInviteLink) { setPhase('ready'); return }
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

  // While the results tab stays open, pick up participants who join or update their profile later.
  useEffect(() => {
    if (phase !== 'ready' || !activeEventId || tab !== 'results' || !hasSavedProfile) return
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      void api.getEventRecommendations(activeEventId, locale).then(items => {
        setRecommendations(items)
        setRecsMessage(items.length > 0 && items.length < 5 ? messages.results.partialMatches(items.length) : '')
      }).catch(() => {})
    }, RECOMMENDATIONS_REFRESH_MS)
    return () => window.clearInterval(timer)
  }, [activeEventId, api, hasSavedProfile, locale, messages.results, phase, tab])

  // Sync browser URL to /events/{id} when an event is active, and clear stale /events or /invite path when no event is selected.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.history?.replaceState) return
    if (phase === 'ready' && user && activeEventId) {
      const targetPath = `/events/${encodeURIComponent(activeEventId)}`
      if (window.location.pathname !== targetPath || window.location.search) {
        window.history.replaceState(null, '', targetPath)
      }
    } else if (!needsInviteLink && ((phase === 'ready' && user && !activeEventId) || phase === 'expired')) {
      if (/^\/(events|invite)\//.test(window.location.pathname)) {
        window.history.replaceState(null, '', '/?mode=account')
      }
    }
  }, [activeEventId, needsInviteLink, phase, user])

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
      // The sign-in response carries only the id; /me adds the username and organizer permission.
      const current = await api.getMe().catch(() => null)
      setUser(current ? { ...me, ...current } : me)
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
    } catch (error) {
      if (!isApiError(error) || error.status !== 401) {
        setLogoutError(formatApiError(error, locale, 'general'))
        setLoggingOut(false)
        return
      }
    }
    savePendingInvite(null)
    redirectToLogin()
  }

  async function handleLeaveEvent(): Promise<string> {
    if (!activeEventId) return ''
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
      return ''
    } catch (error) {
      return formatApiError(error, locale, 'general')
    } finally {
      setLeavingEvent(false)
    }
  }

  async function handleDeleteAccount(): Promise<string> {
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
      return ''
    } catch (error) {
      if (isApiError(error) && error.code === 'organizer_owns_events') return accountDialogCopy[locale].deleteBlockedOrganizer
      return formatApiError(error, locale, 'general')
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
        redirectToLogin()
        return
      }
      setEventError(formatApiError(error, locale, 'general'))
    } finally {
      setRecsLoading(false)
    }
  }

  async function persistQuestionnaire(draft: EventProfileDraft) {
    if (!activeEventId || !draft.goal) throw new Error(t.errors.genericSave)
    const saved = await api.saveEventProfile(activeEventId, {
      name: draft.name.trim(),
      goal: draft.goal,
      role: draft.role.trim(),
      experienceYears: Number(draft.experience),
      skills: parseTopics(draft.skills),
      interests: parseTopics(draft.interests),
      about: draft.about.trim(),
      ...(usesLookingFor(draft.goal) && draft.lookingFor.trim() ? { lookingFor: parseTopics(draft.lookingFor) } : {}),
      visible: draft.visible,
      consentVersion: 'v1',
    })
    const next = profileToDraft(saved)
    setHasSavedProfile(true)
    setSavedBaseline(next)
    setDraft(next)
  }

  async function saveProfileAndFetch() {
    if (!activeEventId || !draft.goal) return
    setSaving(true)
    setSaveError('')
    setSaveSuccess(false)
    try {
      await persistQuestionnaire(draft)
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

  async function saveContact(value: string): Promise<string> {
    try {
      await api.saveContact(value)
      contactRevision.current++
      setContactValue(value)
      setContactState('ready')
      return ''
    } catch (error) {
      if (isApiError(error) && error.code === 'invalid_contact') return identityCopy[locale].contactError
      return formatApiError(error, locale, 'general')
    }
  }

  async function saveHandle(value: string): Promise<string> {
    try {
      const { handle } = await api.updateHandle(value)
      setUser(current => (current ? { ...current, handle } : current))
      return ''
    } catch (error) {
      const errors = identityCopy[locale].handleErrors
      if (isApiError(error) && error.code in errors) return errors[error.code as keyof typeof errors]
      return formatApiError(error, locale, 'general')
    }
  }

  /** Request from the people search; resolves with an error message, or '' once the server stored it. */
  async function handleRequestFromSearch(userId: string, message: string): Promise<string> {
    if (!activeEventId) return messages.account.errors.genericRequest
    setSocialError('')
    setSocialNotice('')
    try {
      await api.createIntroduction(activeEventId, userId, message)
      await refreshSocialState(activeEventId, false)
      return ''
    } catch (error) {
      if (isBlockedOrRestrictedError(error)) return messages.moderation.interactionBlockedError
      return formatApiError(error, locale, 'general')
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
      const icebreaker = recommendations?.find(item => item.candidate.id === candidateId)?.icebreaker
      const created = await api.createIntroduction(activeEventId, candidateId, undefined, icebreaker)
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
  const isOrganizerOfActive = Boolean(user?.canCreateEvents) && activeEventSummary?.role === 'organizer'
  // The organizer cabinet is a separate view for people who may create or already run events, never for plain participants.
  const canOrganize = Boolean(user?.canCreateEvents)

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
  const isClosed = activeEvent?.status === 'closed'
  const hasUnsavedChanges = useMemo(
    () => phase === 'ready' && tab === 'profile' && hasUnsavedProfileChanges(savedBaseline, draft),
    [draft, phase, savedBaseline, tab],
  )

  useEffect(() => {
    if (!hasUnsavedChanges) return
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (endingSession.current) return
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
    if (user) { setLogoutError(''); setLogoutOpen(true) }
    else guardNavigation(onExitToDemo)
  }, [exitRequestSeq, guardNavigation, onExitToDemo, user])

  const userId = user?.id
  useEffect(() => { onAuthenticatedChange?.(Boolean(userId)) }, [onAuthenticatedChange, userId])
  useEffect(() => {
    if (!userId) return
    let active = true
    let revision = 0
    async function refresh() {
      const requested = ++revision
      try {
        const me = await api.getMe()
        if (!active || requested !== revision) return
        if (!me || me.id !== userId) {
          redirectToLogin()
          return
        }
        setUser(me)
        if (!me.canCreateEvents) setTab(current => current === 'organizer' ? 'me' : current)
      } catch { /* A temporary network failure leaves the server-enforced session intact. */ }
    }
    function refreshWhenVisible() {
      if (!document.hidden) void refresh()
    }
    const timer = window.setInterval(refreshWhenVisible, 30_000)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refreshWhenVisible)
    return () => {
      active = false
      window.clearInterval(timer)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [api, redirectToLogin, userId])


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

  const dialogCopy = accountDialogCopy[locale]
  const logoutDialog = user && logoutOpen && (
    <ConfirmDialog title={dialogCopy.logoutTitle} confirmLabel={t.logout} cancelLabel={dialogCopy.cancel}
      tone="neutral" busy={loggingOut} error={logoutError} onCancel={() => setLogoutOpen(false)}
      onConfirm={() => void handleLogout()}>
      <p>{dialogCopy.logoutBody}</p>
    </ConfirmDialog>
  )

  if (phase === 'checking' || phase === 'joining') {
    return (
      <main className="site-width account-main">
        {logoutDialog}
        <div className="surface status-panel" role="status" aria-live="polite" aria-busy="true">
          <p>{phase === 'joining' ? t.joiningInvite : t.loadingSession}</p>
        </div>
      </main>
    )
  }

  if (needsInviteLink) {
    return <main className="site-width account-main">{logoutDialog}
      <section className="surface auth-card"><h1>{t.joinWithLink}</h1>
        <InviteEntry locale={locale} />
        <a className="text-button" href="/login">{user ? t.openMyEvents : t.signInTitle}</a>
      </section>
    </main>
  }

  if (phase === 'expired' || phase === 'inviteError') {
    return (
      <main className="site-width account-main">
        {logoutDialog}
        <section className="surface status-panel" aria-labelledby="expired-invite-title">
          <h1 id="expired-invite-title">{phase === 'expired' ? t[inviteFailure] : eventError}</h1>
          {phase === 'expired' && <p>{t.expiredBody}</p>}
          {phase === 'inviteError' && <button className="primary-button" onClick={() => void enterAuthenticated(pendingInvite)}>{t.inviteRetry}</button>}
          <div className="status-actions">
            <a className="secondary-button" href="/account" onClick={() => savePendingInvite(null)}>{t.openMyEvents}</a>
            <button type="button" className="secondary-button" onClick={onExitToDemo}>{t.backToDemo}</button>
          </div>
        </section>
      </main>
    )
  }

  if (phase === 'auth' || !user) {
    return (
      <main className="site-width account-main">
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
      </main>
    )
  }

  const eventToolbar = (
    <div className="event-toolbar surface">
      {events.length > 0 ? (
        <div className="event-picker">
          <span id={`${id}-event-picker`}>{t.eventSelectorLabel}</span>
          <CustomSelect
            name="activeEvent"
            aria-labelledby={`${id}-event-picker`}
            value={activeEventId}
            disabled={eventLoading || saving}
            options={events.map(item => ({
              value: item.id,
              label: item.name || item.id,
              badge: canOrganize && item.role === 'organizer' ? messages.organizer.navLabel : undefined,
            }))}
            onChange={nextId => {
              if (nextId === activeEventId) return
              // Stay in the organizer cabinet or profile screen; its settings and members reload for the new event.
              const nextTab = tab === 'organizer' || tab === 'me' ? tab : 'profile'
              guardNavigation(() => void loadEventWorkspace(nextId, false, nextTab))
            }}
          />
        </div>
      ) : (
        <span className="event-picker-empty">{t.noEventsTitle}</span>
      )}

    </div>
  )

  return (
    <div className="site-width workspace">
      {logoutDialog}
      <nav className="workspace-nav" aria-label={messages.nav.label}>
        <button
          type="button"
          aria-current={tab === 'profile' ? 'page' : undefined}
          onClick={event => guardNavigation(() => setTab('profile'), event.currentTarget)}
        >{accountLabels[locale].event}</button>
        <button
          type="button"
          aria-current={tab === 'results' ? 'page' : undefined}
          onClick={event => guardNavigation(() => {
            if (activeEventId && hasSavedProfile) {
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
          onClick={event => guardNavigation(() => {
            setTab('meetings')
            if (activeEventId) void refreshSocialState(activeEventId, true)
          }, event.currentTarget)}
        >
          {messages.social.navMeetings} <span className="nav-count">{activeMeetingsCount}</span>
        </button>
        {canOrganize && (
          <button
            type="button"
            className="nav-organizer-btn"
            aria-current={tab === 'organizer' ? 'page' : undefined}
            onClick={event => guardNavigation(() => setTab('organizer'), event.currentTarget)}
          >
            {messages.organizer.navLabel}
          </button>
        )}
        <button
          type="button"
          className="nav-profile-btn"
          aria-current={tab === 'me' ? 'page' : undefined}
          onClick={event => guardNavigation(() => {
            setTab('me')
            if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
              window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
            }
          }, event.currentTarget)}
        >{profileCopy[locale].navLabel}</button>
      </nav>

      <main className="main-content">
        <NotificationBanner
          notifications={notifications}
          locale={locale}
          onDismiss={() => setNotifications([])}
        />
        {tab !== 'me' && eventToolbar}

        {eventError && <div className="error-banner" role="alert">{eventError}</div>}

        {eventLoading && tab !== 'me' ? (
          <div className="surface status-panel" role="status" aria-live="polite" aria-busy="true">
            <p>{t.loadingEvent}</p>
          </div>
        ) : tab === 'organizer' && canOrganize ? (
          <Suspense fallback={<div className="surface status-panel" role="status" aria-live="polite" aria-busy="true"><p>{t.loadingEvent}</p></div>}>
            <OrganizerCabinet key={activeEvent?.id ?? 'new-event'}
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
        ) : tab === 'me' ? (
          <AccountProfilePanel
            locale={locale}
            key={user.id}
            eventToolbar={events.length ? eventToolbar : null}
            readAccount={readAccount}
            saveAccount={async profile => {
              const previous = accountCache.current
              const saved = await api.saveAccountProfile(profile)
              if (accountCache.current === previous) accountCache.current = Promise.resolve(saved)
              return saved
            }}
            source={eventLoading || !hasSavedProfile ? null : savedBaseline}
            eventName={activeEvent?.name}
            eventDraft={eventLoading || !activeEventId || isClosed ? null : draft}
            saveEvent={persistQuestionnaire}
            contact={contactValue}
            contactState={contactState}
            retryContact={loadContact}
            onSaveContact={saveContact}
            username={user.username}
            isOrganizer={activeEventSummary?.role === 'organizer'}
            organizesAnyEvent={events.some(item => item.role === 'organizer')}
            hasEvent={Boolean(activeEventId)}
            handle={user.handle ?? null}
            onSaveHandle={saveHandle}
            onLogout={() => { setLogoutError(''); setLogoutOpen(true) }}
            onLeaveEvent={handleLeaveEvent}
            onDeleteAccount={handleDeleteAccount}
            loggingOut={loggingOut}
            leavingEvent={leavingEvent}
            deletingAccount={deletingAccount}
          />
        ) : !activeEventId ? (
          <section className="surface empty-state">
            <h1>{t.noEventsTitle}</h1>
            <p>{t.noEventsBody}</p>
            <InviteEntry locale={locale} />
          </section>
        ) : tab === 'results' && !hasSavedProfile ? (
          <section className="surface empty-state">
            <h1>{accountLabels[locale].needProfileTitle}</h1>
            <p>{accountLabels[locale].needProfileBody}</p>
            <button type="button" className="primary-button" onClick={() => setTab('profile')}>
              {accountLabels[locale].openQuestionnaire}
            </button>
          </section>
        ) : tab === 'introductions' ? (
          <IntroductionsPanel
            api={api}
            eventId={activeEventId}
            introductions={introductions}
            locale={locale}
            timeZone={eventTimeZone}
            busyIntroId={busyIntroId}
            slotsByIntroId={slotsByIntroId}
            loadingSlotsIntroId={loadingSlotsIntroId}
            proposingSlotKey={proposingSlotKey}
            contactValue={contactValue}
            ownProfile={!hasSavedProfile ? 'missing' : savedBaseline?.visible ? 'visible' : 'hidden'}
            socialError={socialError}
            socialNotice={socialNotice}
            onRequest={handleRequestFromSearch}
            onOpenQuestionnaire={() => guardNavigation(() => setTab('profile'))}
            onSaveContact={saveContact}
            onUpdateIntro={(introId, status) => void handleUpdateIntro(introId, status)}
            onToggleSlots={introId => void handleToggleSlots(introId)}
            onProposeMeeting={(introId, slotId) => void handleProposeMeeting(introId, slotId)}
            onRefresh={() => { if (activeEventId) void refreshSocialState(activeEventId, true) }}
            refreshing={socialRefreshing}
          />
        ) : tab === 'meetings' ? (
          <div className="meetings-bento-grid">
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
              {eventBooths.some(booth => booth.published) && (
                <PartnerBooths recommendations={matchedEventBooths} locale={locale} />
              )}
            </>
          )
        ) : (
          <form className="profile-form" aria-labelledby="event-profile-title" noValidate onSubmit={handleProfileSubmit}>
            <div className="page-heading">
              <div>
                <h1 id="event-profile-title" tabIndex={-1}>
                  {accountLabels[locale].event}
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
              <EventQuestionnaireFields locale={locale} draft={draft} errors={errors} disabled={saving || isClosed} updateField={updateField} />

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
      </main>
    </div>
  )
}
