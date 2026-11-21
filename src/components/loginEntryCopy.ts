import type { Locale } from '../matching/types'

export const loginEntryCopy: Record<Locale, {
  paths: string
  participant: string
  participantHint: string
  organizer: string
  organizerHint: string
  accessTitle: string
  accessHint: string
  requestAccess: string
  checkAccess: string
}> = {
  ru: {
    paths: 'Как вы хотите использовать Tanys?',
    participant: 'Вступить в мероприятие',
    participantHint: 'По ссылке из приглашения',
    organizer: 'Организовать мероприятие',
    organizerHint: 'Войти в кабинет или запросить доступ',
    accessTitle: 'Нужен доступ организатора',
    accessHint: 'Напишите команде Tanys и укажите свой логин. После выдачи прав проверьте доступ снова.',
    requestAccess: 'Запросить доступ по почте',
    checkAccess: 'Проверить доступ',
  },
  kk: {
    paths: 'Tanys-ты қалай қолданғыңыз келеді?',
    participant: 'Іс-шараға қосылу',
    participantHint: 'Шақыру сілтемесі арқылы',
    organizer: 'Іс-шара ұйымдастыру',
    organizerHint: 'Кабинетке кіру немесе рұқсат сұрау',
    accessTitle: 'Ұйымдастырушы рұқсаты қажет',
    accessHint: 'Tanys командасына логиніңізді жазыңыз. Рұқсат берілгеннен кейін оны қайта тексеріңіз.',
    requestAccess: 'Пошта арқылы рұқсат сұрау',
    checkAccess: 'Рұқсатты тексеру',
  },
  en: {
    paths: 'How would you like to use Tanys?',
    participant: 'Join an event',
    participantHint: 'Use an invitation link',
    organizer: 'Organize an event',
    organizerHint: 'Open the organizer workspace or request access',
    accessTitle: 'Organizer access required',
    accessHint: 'Email the Tanys team with your username. Check access again once it has been granted.',
    requestAccess: 'Request access by email',
    checkAccess: 'Check access',
  },
}
