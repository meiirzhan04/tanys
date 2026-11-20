import { messagesByLocale } from '../i18n/messages'
import type { Goal, Locale } from '../matching/types'

export function getGoalLabels(locale: Locale = 'ru'): Record<Goal, string> {
  return messagesByLocale[locale].goals
}

export const goalLabels: Record<Goal, string> = messagesByLocale.ru.goals
