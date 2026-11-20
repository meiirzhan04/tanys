import type { IntroductionStatus } from '../../api/client'
import { getMessages } from '../../i18n/messages'
import type { Locale } from '../../matching/types'

export function introStatusText(status: IntroductionStatus, locale: Locale): string {
  const s = getMessages(locale).social
  switch (status) {
    case 'pending': return s.statusPending
    case 'accepted': return s.statusAccepted
    case 'declined': return s.statusDeclined
    case 'withdrawn': return s.statusWithdrawn
  }
}
