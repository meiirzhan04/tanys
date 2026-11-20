import type { Locale } from '../../matching/types'

export type ProfileCheckKey = 'goal' | 'role' | 'experience' | 'skills' | 'interests' | 'about' | 'lookingFor'

export interface ProfileCopy {
  navLabel: string
  title: string
  subtitle: string
  emptyTitle: string
  emptyText: string
  emptyCta: string
  completeness: string
  complete: string
  tipsTitle: string
  tips: Record<ProfileCheckKey, string>
  previewTitle: string
  previewHint: string
  experience: (years: number) => string
  skills: string
  interests: string
  lookingFor: string
  about: string
  noValue: string
  statsTitle: string
  statRecommendations: string
  statMet: string
  statBookings: string
  statIntroductions: string
  statMeetings: string
  editProfile: string
  showMatches: string
  visible: string
  hidden: string
  hiddenHint: string
  accountTitle: string
  signedInAs: string
  eventLabel: string
  roleOrganizer: string
  roleParticipant: string
  noEvent: string
  contactTitle: string
  contactCurrent: string
  contactNone: string
  contactSave: string
  dangerTitle: string
  dangerHint: string
  demoNote: string
}

export const profileCopy: Record<Locale, ProfileCopy> = {
  ru: {
    navLabel: 'Мой профиль',
    title: 'Мой профиль',
    subtitle: 'Ваша карточка, полнота анкеты и активность на событии.',
    emptyTitle: 'Профиль появится после анкеты',
    emptyText: 'Заполните анкету — здесь будет ваша карточка, подсказки для точного подбора и статистика знакомств.',
    emptyCta: 'Заполнить анкету',
    completeness: 'Полнота профиля',
    complete: 'Профиль заполнен полностью — подбор работает с максимальной точностью.',
    tipsTitle: 'Как повысить точность подбора',
    tips: {
      goal: 'Выберите цель знакомства',
      role: 'Укажите свою роль',
      experience: 'Добавьте опыт в годах',
      skills: 'Укажите хотя бы 3 навыка стека',
      interests: 'Добавьте хотя бы 2 интереса',
      about: 'Расскажите о себе подробнее — от 60 символов',
      lookingFor: 'Уточните, кого вы ищете',
    },
    previewTitle: 'Как вас видят другие',
    previewHint: 'Так ваша карточка выглядит в рекомендациях собеседников.',
    experience: years => `${years} ${plural(years, ['год', 'года', 'лет'])} опыта`,
    skills: 'Стек и навыки',
    interests: 'Интересы',
    lookingFor: 'Ищу',
    about: 'О себе',
    noValue: 'Не указано',
    statsTitle: 'Активность',
    statRecommendations: 'рекомендаций',
    statMet: 'отмечено «Познакомились»',
    statBookings: 'встреч в расписании',
    statIntroductions: 'знакомств',
    statMeetings: 'встреч',
    editProfile: 'Изменить анкету',
    showMatches: 'Смотреть рекомендации',
    visible: 'Виден в подборе',
    hidden: 'Скрыт из подбора',
    hiddenHint: 'Включите видимость в анкете, чтобы другие участники могли вас найти.',
    accountTitle: 'Аккаунт',
    signedInAs: 'Вы вошли как',
    eventLabel: 'Событие',
    roleOrganizer: 'Организатор',
    roleParticipant: 'Участник',
    noEvent: 'Вы пока не присоединились к событию.',
    contactTitle: 'Контакт для знакомств',
    contactCurrent: 'Сейчас указан:',
    contactNone: 'Контакт пока не указан.',
    contactSave: 'Сохранить контакт',
    dangerTitle: 'Управление аккаунтом',
    dangerHint: 'Выход из события скрывает вашу анкету. Удаление аккаунта необратимо.',
    demoNote: 'Демо-режим: анкета и встречи хранятся только в этой вкладке браузера.',
  },
  kk: {
    navLabel: 'Менің профилім',
    title: 'Менің профилім',
    subtitle: 'Карточкаңыз, анкетаның толықтығы және іс-шарадағы белсенділік.',
    emptyTitle: 'Профиль анкетадан кейін пайда болады',
    emptyText: 'Анкетаны толтырыңыз — мұнда карточкаңыз, дәл іріктеуге кеңестер және танысу статистикасы болады.',
    emptyCta: 'Анкетаны толтыру',
    completeness: 'Профиль толықтығы',
    complete: 'Профиль толық толтырылған — іріктеу барынша дәл жұмыс істейді.',
    tipsTitle: 'Іріктеу дәлдігін қалай арттыруға болады',
    tips: {
      goal: 'Танысу мақсатын таңдаңыз',
      role: 'Рөліңізді көрсетіңіз',
      experience: 'Жылмен тәжірибені қосыңыз',
      skills: 'Кемінде 3 стек дағдысын көрсетіңіз',
      interests: 'Кемінде 2 қызығушылық қосыңыз',
      about: 'Өзіңіз туралы толығырақ жазыңыз — 60 таңбадан бастап',
      lookingFor: 'Кімді іздейтініңізді нақтылаңыз',
    },
    previewTitle: 'Басқалар сізді қалай көреді',
    previewHint: 'Әңгімелесушілердің ұсыныстарында карточкаңыз осылай көрінеді.',
    experience: years => `${years} жыл тәжірибе`,
    skills: 'Стек және дағдылар',
    interests: 'Қызығушылықтар',
    lookingFor: 'Іздеймін',
    about: 'Өзім туралы',
    noValue: 'Көрсетілмеген',
    statsTitle: 'Белсенділік',
    statRecommendations: 'ұсыныс',
    statMet: '«Таныстық» белгісі',
    statBookings: 'кестедегі кездесу',
    statIntroductions: 'танысу',
    statMeetings: 'кездесу',
    editProfile: 'Анкетаны өзгерту',
    showMatches: 'Ұсыныстарды көру',
    visible: 'Іріктеуде көрінеді',
    hidden: 'Іріктеуден жасырылған',
    hiddenHint: 'Басқа қатысушылар сізді таба алуы үшін анкетада көрінуді қосыңыз.',
    accountTitle: 'Аккаунт',
    signedInAs: 'Сіз кірдіңіз:',
    eventLabel: 'Іс-шара',
    roleOrganizer: 'Ұйымдастырушы',
    roleParticipant: 'Қатысушы',
    noEvent: 'Сіз әлі іс-шараға қосылмадыңыз.',
    contactTitle: 'Танысуға арналған байланыс',
    contactCurrent: 'Қазір көрсетілген:',
    contactNone: 'Байланыс әлі көрсетілмеген.',
    contactSave: 'Байланысты сақтау',
    dangerTitle: 'Аккаунтты басқару',
    dangerHint: 'Іс-шарадан шығу анкетаңызды жасырады. Аккаунтты жою қайтарылмайды.',
    demoNote: 'Демо режим: анкета мен кездесулер тек осы браузер қойындысында сақталады.',
  },
  en: {
    navLabel: 'My profile',
    title: 'My profile',
    subtitle: 'Your card, profile completeness and activity at the event.',
    emptyTitle: 'Your profile appears after the form',
    emptyText: 'Fill in the profile — your card, tips for sharper matching and intro stats will show up here.',
    emptyCta: 'Fill in the profile',
    completeness: 'Profile completeness',
    complete: 'Your profile is complete — matching works at full precision.',
    tipsTitle: 'How to sharpen your matches',
    tips: {
      goal: 'Choose a networking goal',
      role: 'Add your role',
      experience: 'Add your years of experience',
      skills: 'List at least 3 stack skills',
      interests: 'Add at least 2 interests',
      about: 'Tell a bit more about yourself — 60+ characters',
      lookingFor: 'Specify who you are looking for',
    },
    previewTitle: 'How others see you',
    previewHint: 'This is how your card looks in other people’s recommendations.',
    experience: years => `${years} ${years === 1 ? 'year' : 'years'} of experience`,
    skills: 'Stack and skills',
    interests: 'Interests',
    lookingFor: 'Looking for',
    about: 'About',
    noValue: 'Not set',
    statsTitle: 'Activity',
    statRecommendations: 'recommendations',
    statMet: 'marked “We met”',
    statBookings: 'meetings scheduled',
    statIntroductions: 'introductions',
    statMeetings: 'meetings',
    editProfile: 'Edit profile',
    showMatches: 'View recommendations',
    visible: 'Visible in matching',
    hidden: 'Hidden from matching',
    hiddenHint: 'Turn on visibility in the profile so other participants can find you.',
    accountTitle: 'Account',
    signedInAs: 'Signed in as',
    eventLabel: 'Event',
    roleOrganizer: 'Organizer',
    roleParticipant: 'Participant',
    noEvent: 'You have not joined an event yet.',
    contactTitle: 'Contact for introductions',
    contactCurrent: 'Currently set:',
    contactNone: 'No contact added yet.',
    contactSave: 'Save contact',
    dangerTitle: 'Account management',
    dangerHint: 'Leaving the event hides your profile. Deleting the account cannot be undone.',
    demoNote: 'Demo mode: your profile and meetings stay only in this browser tab.',
  },
}

function plural(count: number, forms: readonly [string, string, string]): string {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return forms[0]
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1]
  return forms[2]
}
