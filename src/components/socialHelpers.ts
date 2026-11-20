import type { IntroductionItem, ServerMeeting } from '../api/client'
import type { Locale } from '../matching/types'

export type SocialNotificationKind =
  | 'new_incoming_intro'
  | 'intro_accepted'
  | 'new_meeting_invite'
  | 'meeting_confirmed'
  | 'meeting_cancelled'

export interface SocialNotification {
  id: string
  kind: SocialNotificationKind
  actorName?: string
}

const LOCALE_TAGS: Record<Locale, string> = {
  ru: 'ru-RU',
  kk: 'kk-KZ',
  en: 'en-US',
}

export function formatMeetingInterval(
  startIso?: string,
  endIso?: string,
  timeZone = 'Asia/Almaty',
  locale: Locale = 'ru',
): string {
  if (!startIso) return ''
  const startDate = new Date(startIso)
  if (Number.isNaN(startDate.getTime())) return startIso
  const tag = LOCALE_TAGS[locale]

  try {
    const timeFmt = new Intl.DateTimeFormat(tag, {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    const dateFmt = new Intl.DateTimeFormat(tag, { timeZone, dateStyle: 'medium' })
    const startText = dateFmt.format(startDate) + ' · ' + timeFmt.format(startDate)
    if (!endIso) return startText
    const endDate = new Date(endIso)
    if (Number.isNaN(endDate.getTime())) return startText
    return `${startText}–${dateFmt.format(startDate) === dateFmt.format(endDate) ? '' : dateFmt.format(endDate) + ' · '}${timeFmt.format(endDate)} (${timeZone})`
  } catch {
    return endIso ? `${startIso} – ${endIso}` : startIso
  }
}

export function diffSocialEvents(
  prevIntros: readonly IntroductionItem[],
  nextIntros: readonly IntroductionItem[],
  prevMeetings: readonly ServerMeeting[],
  nextMeetings: readonly ServerMeeting[],
): SocialNotification[] {
  const notifications: SocialNotification[] = []
  const prevIntroMap = new Map(prevIntros.map(item => [item.id, item]))
  const prevMeetingMap = new Map(prevMeetings.map(item => [item.id, item]))

  for (const item of nextIntros) {
    const prev = prevIntroMap.get(item.id)
    if (!prev && item.direction === 'incoming' && item.status === 'pending') {
      notifications.push({
        id: `intro-in-${item.id}`,
        kind: 'new_incoming_intro',
        actorName: item.participantName,
      })
    } else if (prev && prev.status !== 'accepted' && item.status === 'accepted') {
      notifications.push({
        id: `intro-acc-${item.id}`,
        kind: 'intro_accepted',
        actorName: item.participantName,
      })
    }
  }

  for (const meeting of nextMeetings) {
    const prev = prevMeetingMap.get(meeting.id)
    if (!prev && meeting.status === 'pending' && meeting.direction !== 'outgoing') {
      notifications.push({
        id: `meeting-in-${meeting.id}`,
        kind: 'new_meeting_invite',
        actorName: meeting.participantName,
      })
    } else if (prev && prev.status !== 'confirmed' && meeting.status === 'confirmed') {
      notifications.push({
        id: `meeting-ok-${meeting.id}`,
        kind: 'meeting_confirmed',
        actorName: meeting.participantName,
      })
    } else if (prev && prev.status !== 'cancelled' && meeting.status === 'cancelled') {
      notifications.push({
        id: `meeting-cancel-${meeting.id}`,
        kind: 'meeting_cancelled',
        actorName: meeting.participantName,
      })
    }
  }

  return notifications
}

export function countPendingIncomingIntros(intros: readonly IntroductionItem[]): number {
  return intros.filter(item => item.direction === 'incoming' && item.status === 'pending').length
}

export function countActionableMeetings(meetings: readonly ServerMeeting[]): number {
  return meetings.filter(item => item.status === 'pending' || item.status === 'confirmed').length
}
