import type { Locale } from '../../matching/types'

export interface AccountDialogCopy {
  cancel: string
  logoutTitle: string
  logoutBody: string
  logoutNote: string
  leaveTitle: (event: string) => string
  leaveBody: (event: string) => string
  leaveOrganizerNote: string
  deleteTitle: string
  deleteIntro: string
  deleteItems: readonly string[]
  deleteWarning: string
  deleteBlockedOrganizer: string
}

export const accountDialogCopy: Record<Locale, AccountDialogCopy> = {
  ru: {
    cancel: 'Отмена',
    logoutTitle: 'Выход из аккаунта',
    logoutBody: 'Вы уверены, что хотите выйти?',
    logoutNote: 'Анкета и мероприятия сохранятся — войти снова можно в любой момент.',
    leaveTitle: event => `Выйти из мероприятия «${event}»?`,
    leaveBody: event =>
      `Ваша анкета в «${event}» будет скрыта из рекомендаций, и вы перестанете быть участником этого мероприятия. Вернуться можно по новому приглашению. Аккаунт и другие мероприятия не затрагиваются.`,
    leaveOrganizerNote: 'Организатор не может выйти из своего мероприятия.',
    deleteTitle: 'Удалить аккаунт навсегда?',
    deleteIntro: 'Будут удалены:',
    deleteItems: [
      'анкеты во всех мероприятиях',
      'знакомства, встречи и свободное время',
      'контакт для обмена',
      'вход по логину и паролю',
    ],
    deleteWarning: 'Восстановить аккаунт и эти данные будет нельзя.',
    deleteBlockedOrganizer:
      'Аккаунт организатора пока нельзя удалить: передача мероприятий другому организатору ещё не реализована, и ваши мероприятия остались бы без владельца.',
  },
  kk: {
    cancel: 'Болдырмау',
    logoutTitle: 'Аккаунттан шығу',
    logoutBody: 'Шынымен шыққыңыз келе ме?',
    logoutNote: 'Анкета мен іс-шаралар сақталады — кез келген уақытта қайта кіре аласыз.',
    leaveTitle: event => `«${event}» іс-шарасынан шығу керек пе?`,
    leaveBody: event =>
      `«${event}» іс-шарасындағы анкетаңыз ұсыныстардан жасырылады және сіз бұл іс-шараның қатысушысы болмайсыз. Жаңа шақыру арқылы қайта қосыла аласыз. Аккаунт пен басқа іс-шаралар өзгермейді.`,
    leaveOrganizerNote: 'Ұйымдастырушы өз іс-шарасынан шыға алмайды.',
    deleteTitle: 'Аккаунтты біржола өшіру керек пе?',
    deleteIntro: 'Мыналар жойылады:',
    deleteItems: [
      'барлық іс-шаралардағы анкеталар',
      'танысулар, кездесулер және бос уақыт',
      'алмасуға арналған байланыс',
      'логин мен құпиясөз арқылы кіру',
    ],
    deleteWarning: 'Аккаунт пен бұл деректерді қалпына келтіру мүмкін болмайды.',
    deleteBlockedOrganizer:
      'Ұйымдастырушы аккаунтын әзірге өшіруге болмайды: іс-шараларды басқа ұйымдастырушыға беру әлі іске асырылмаған, сондықтан іс-шараларыңыз иесіз қалар еді.',
  },
  en: {
    cancel: 'Cancel',
    logoutTitle: 'Sign out',
    logoutBody: 'Are you sure you want to sign out?',
    logoutNote: 'Your profile and events stay as they are — you can sign in again any time.',
    leaveTitle: event => `Leave “${event}”?`,
    leaveBody: event =>
      `Your profile in “${event}” will be hidden from recommendations and you will no longer be a participant of this event. You can rejoin with a new invite. Your account and other events are not affected.`,
    leaveOrganizerNote: 'An organizer cannot leave their own event.',
    deleteTitle: 'Delete your account for good?',
    deleteIntro: 'This deletes:',
    deleteItems: [
      'your profiles in every event',
      'introductions, meetings and availability',
      'the contact you share',
      'sign-in with your username and password',
    ],
    deleteWarning: 'The account and this data cannot be restored.',
    deleteBlockedOrganizer:
      'An organizer account cannot be deleted yet: transferring events to another organizer is not implemented, so your events would be left without an owner.',
  },
}
