import type { Locale } from '../matching/types'

export interface TimeCopy {
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  timePlaceholder: string
  step: string
  legacyOption: (time: string) => string
  legacyEventTime: (time: string) => string
  invalidStep: string
  /** Times are entered and shown on the event's clock, not the device's. */
  zoneHint: (zone: string) => string
}

export const timeCopy: Record<Locale, TimeCopy> = {
  ru: {
    startDate: 'Дата начала',
    startTime: 'Время начала',
    endDate: 'Дата окончания',
    endTime: 'Время окончания',
    timePlaceholder: 'Выберите время',
    step: 'Время выбирается с шагом 15 минут: :00, :15, :30 или :45.',
    legacyOption: time => `${time} — недопустимо`,
    legacyEventTime: time => `Сохранённое время ${time} не на шаге 15 минут. Чтобы изменить его, выберите :00, :15, :30 или :45.`,
    invalidStep: 'Выберите время с шагом 15 минут: :00, :15, :30 или :45.',
    zoneHint: zone => `Время мероприятия · ${zone}`,
  },
  kk: {
    startDate: 'Басталу күні',
    startTime: 'Басталу уақыты',
    endDate: 'Аяқталу күні',
    endTime: 'Аяқталу уақыты',
    timePlaceholder: 'Уақытты таңдаңыз',
    step: 'Уақыт 15 минут қадаммен таңдалады: :00, :15, :30 немесе :45.',
    legacyOption: time => `${time} — жарамсыз`,
    legacyEventTime: time => `Сақталған ${time} уақыты 15 минут қадамына сай емес. Өзгерту үшін :00, :15, :30 немесе :45 таңдаңыз.`,
    invalidStep: 'Уақытты 15 минут қадаммен таңдаңыз: :00, :15, :30 немесе :45.',
    zoneHint: zone => `Іс-шара уақыты · ${zone}`,
  },
  en: {
    startDate: 'Start date',
    startTime: 'Start time',
    endDate: 'End date',
    endTime: 'End time',
    timePlaceholder: 'Choose a time',
    step: 'Times use 15-minute steps: :00, :15, :30 or :45.',
    legacyOption: time => `${time} — not allowed`,
    legacyEventTime: time => `The saved time ${time} is outside the 15-minute steps. To change it, pick :00, :15, :30 or :45.`,
    invalidStep: 'Choose a time in 15-minute steps: :00, :15, :30 or :45.',
    zoneHint: zone => `Event time · ${zone}`,
  },
}
