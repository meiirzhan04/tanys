import type { Goal, Locale } from '../matching/types'

export const SUPPORTED_LOCALES: readonly { code: Locale; shortLabel: string; label: string }[] = [
  { code: 'kk', shortLabel: 'Қаз', label: 'Қазақша' },
  { code: 'ru', shortLabel: 'Рус', label: 'Русский' },
  { code: 'en', shortLabel: 'Eng', label: 'English' },
]

export interface Messages {
  languageSwitcherLabel: string
  header: {
    context: string
    demoStatus: string
  }
  nav: {
    label: string
    profile: string
    results: string
    schedule: string
  }
  goals: Record<Goal, string>
  form: {
    title: string
    subtitle: string
    fillExample: string
    goalLabel: string
    goalPlaceholder: string
    roleLabel: string
    rolePlaceholder: string
    experienceLabel: string
    skillsLabel: string
    skillsPlaceholder: string
    interestsLabel: string
    interestsPlaceholder: string
    lookingForLabel: string
    optional: string
    lookingForPlaceholder: string
    aboutLabel: string
    aboutPlaceholder: string
    submit: string
    privacyNote: string
    errors: {
      goal: string
      role: string
      experience: string
      skills: string
      interests: string
      about: string
    }
  }
  results: {
    title: string
    editProfile: string
    count: (count: number) => string
    feedbackSaved: (count: number) => string
    partialMatches: (count: number) => string
    directoryParticipant: string
    directoryWhy: string
    expand: string
    collapse: string
    skillsAriaLabel: string
    icebreakerTitle: string
    copy: string
    copied: string
    copyFallback: string
    emptyTitle: string
    emptyBody: string
  }
  feedback: {
    groupLabel: (name: string) => string
    met: string
    notAFit: string
  }
  meetings: {
    pageTitle: string
    pickerAriaLabel: (name: string) => string
    title: string
    noCommonSlots: string
    bookedSuffix: string
    cancel: string
    busyTitle: (name: string) => string
    selectTitle: (label: string) => string
    busyInline: (name: string) => string
    scheduleTitle: string
    scheduleEmpty: string
  }
}

export const messagesByLocale: Record<Locale, Messages> = {
  ru: {
    languageSwitcherLabel: 'Выбор языка',
    header: {
      context: 'Нетворкинг на митапе',
      demoStatus: 'Вымышленные анкеты',
    },
    nav: {
      label: 'Разделы Tanys',
      profile: 'Анкета',
      results: 'Рекомендации',
      schedule: 'Встречи',
    },
    goals: {
      find_job: 'Найти работу',
      hire: 'Нанять',
      find_mentor: 'Найти ментора',
      be_mentor: 'Стать ментором',
      find_cofounder: 'Найти кофаундера',
      exchange_experience: 'Обменяться опытом',
    },
    form: {
      title: 'Анкета участника',
      subtitle: 'Укажите цель знакомства, навыки и интересы для подбора.',
      fillExample: 'Заполнить пример',
      goalLabel: 'Цель знакомства',
      goalPlaceholder: 'Выберите цель',
      roleLabel: 'Роль',
      rolePlaceholder: 'Например, Backend-разработчик',
      experienceLabel: 'Опыт в годах',
      skillsLabel: 'Стек и навыки',
      skillsPlaceholder: 'Python, FastAPI, PostgreSQL',
      interestsLabel: 'Интересы',
      interestsPlaceholder: 'Стартапы, API, DevOps',
      lookingForLabel: 'Какие навыки ищете',
      optional: 'необязательно',
      lookingForPlaceholder: 'Например, React, продажи',
      aboutLabel: 'О себе',
      aboutPlaceholder: 'Что вы делаете и о чём хотите поговорить?',
      submit: 'Найти участников',
      privacyNote: 'Анкета остаётся в этой вкладке.',
      errors: {
        goal: 'Выберите цель знакомства.',
        role: 'Укажите вашу роль.',
        experience: 'Введите целое число от 0 до 60.',
        skills: 'Введите хотя бы один навык.',
        interests: 'Введите хотя бы один интерес.',
        about: 'Кратко расскажите о себе.',
      },
    },
    results: {
      title: 'Рекомендации',
      editProfile: 'Изменить анкету',
      count: count => `Рекомендаций · ${count}`,
      feedbackSaved: count => `Отметка сохранена. Рекомендаций · ${count}`,
      partialMatches: count => `Показаны все доступные совпадения · ${count} из 5`,
      directoryParticipant: 'Участник',
      directoryWhy: 'Почему подходит',
      expand: 'Подробнее',
      collapse: 'Свернуть',
      skillsAriaLabel: 'Навыки',
      icebreakerTitle: 'Первая фраза',
      copy: 'Скопировать',
      copied: 'Скопировано',
      copyFallback: 'Выделите и скопируйте текст вручную.',
      emptyTitle: 'Список рекомендаций пуст',
      emptyBody: 'Измените цель знакомства, чтобы найти других участников.',
    },
    feedback: {
      groupLabel: name => `Отзыв о рекомендации — ${name}`,
      met: 'Познакомились',
      notAFit: 'Не подошло',
    },
    meetings: {
      pageTitle: 'Встречи',
      pickerAriaLabel: name => `Слоты 1:1 с ${name}`,
      title: 'Встреча 1:1',
      noCommonSlots: 'Нет общих свободных слотов с этим участником.',
      bookedSuffix: 'назначено',
      cancel: 'Отменить',
      busyTitle: name => `Время занято: ${name}`,
      selectTitle: label => `Выбрать ${label}`,
      busyInline: name => ` (занято: ${name})`,
      scheduleTitle: 'Моё расписание 1:1',
      scheduleEmpty: 'Пока нет запланированных встреч — выберите слот в карточке собеседника.',
    },
  },
  kk: {
    languageSwitcherLabel: 'Тілді таңдау',
    header: {
      context: 'Митаптағы нетворкинг',
      demoStatus: 'Ойдан құралған анкеталар',
    },
    nav: {
      label: 'Tanys бөлімдері',
      profile: 'Анкета',
      results: 'Ұсыныстар',
      schedule: 'Кездесулер',
    },
    goals: {
      find_job: 'Жұмыс табу',
      hire: 'Маман жалдау',
      find_mentor: 'Ментор табу',
      be_mentor: 'Ментор болу',
      find_cofounder: 'Кофаундер табу',
      exchange_experience: 'Тәжірибе алмасу',
    },
    form: {
      title: 'Қатысушы анкетасы',
      subtitle: 'Іріктеу үшін танысу мақсатын, дағдыларыңыз бен қызығушылықтарыңызды көрсетіңіз.',
      fillExample: 'Үлгіні толтыру',
      goalLabel: 'Танысу мақсаты',
      goalPlaceholder: 'Мақсатты таңдаңыз',
      roleLabel: 'Рөл',
      rolePlaceholder: 'Мысалы, Backend-разработчик',
      experienceLabel: 'Тәжірибе (жыл)',
      skillsLabel: 'Стек және дағдылар',
      skillsPlaceholder: 'Python, FastAPI, PostgreSQL',
      interestsLabel: 'Қызығушылықтар',
      interestsPlaceholder: 'Стартаптар, API, DevOps',
      lookingForLabel: 'Қандай дағдылар іздейсіз',
      optional: 'міндетті емес',
      lookingForPlaceholder: 'Мысалы, React, сатылым',
      aboutLabel: 'Өзіңіз туралы',
      aboutPlaceholder: 'Не істейсіз және не туралы сөйлескіңіз келеді?',
      submit: 'Қатысушыларды табу',
      privacyNote: 'Анкета тек осы қойындыда сақталады.',
      errors: {
        goal: 'Танысу мақсатын таңдаңыз.',
        role: 'Рөліңізді көрсетіңіз.',
        experience: '0 мен 60 арасындағы бүтін сан енгізіңіз.',
        skills: 'Кемінде бір дағды енгізіңіз.',
        interests: 'Кемінде бір қызығушылық енгізіңіз.',
        about: 'Өзіңіз туралы қысқаша жазыңыз.',
      },
    },
    results: {
      title: 'Ұсыныстар',
      editProfile: 'Анкетаны өзгерту',
      count: count => `Ұсыныстар · ${count}`,
      feedbackSaved: count => `Белгі сақталды. Ұсыныстар · ${count}`,
      partialMatches: count => `Барлық қолжетімді сәйкестіктер көрсетілді · 5-тен ${count}`,
      directoryParticipant: 'Қатысушы',
      directoryWhy: 'Неге сәйкес келеді',
      expand: 'Толығырақ',
      collapse: 'Жасыру',
      skillsAriaLabel: 'Дағдылар',
      icebreakerTitle: 'Алғашқы сөйлем',
      copy: 'Көшіру',
      copied: 'Көшірілді',
      copyFallback: 'Мәтінді қолмен белгілеп көшіріңіз.',
      emptyTitle: 'Ұсыныстар тізімі бос',
      emptyBody: 'Басқа қатысушыларды табу үшін танысу мақсатын өзгертіп көріңіз.',
    },
    feedback: {
      groupLabel: name => `Ұсыныс бойынша пікір — ${name}`,
      met: 'Таныстық',
      notAFit: 'Сәйкес келмеді',
    },
    meetings: {
      pageTitle: 'Кездесулер',
      pickerAriaLabel: name => `${name} қатысушысымен 1:1 слоттар`,
      title: '1:1 кездесу',
      noCommonSlots: 'Бұл қатысушымен ортақ бос уақыт жоқ.',
      bookedSuffix: 'белгіленді',
      cancel: 'Болдырмау',
      busyTitle: name => `Уақыт бос емес: ${name}`,
      selectTitle: label => `${label} таңдау`,
      busyInline: name => ` (бос емес: ${name})`,
      scheduleTitle: 'Менің 1:1 кестем',
      scheduleEmpty: 'Әзірге жоспарланған кездесулер жоқ — қатысушы карточкасынан слот таңдаңыз.',
    },
  },
  en: {
    languageSwitcherLabel: 'Language selector',
    header: {
      context: 'Meetup networking',
      demoStatus: 'Synthetic profiles',
    },
    nav: {
      label: 'Tanys navigation',
      profile: 'Profile',
      results: 'Matches',
      schedule: 'Meetings',
    },
    goals: {
      find_job: 'Find a job',
      hire: 'Hire',
      find_mentor: 'Find a mentor',
      be_mentor: 'Become a mentor',
      find_cofounder: 'Find a cofounder',
      exchange_experience: 'Exchange experience',
    },
    form: {
      title: 'Participant profile',
      subtitle: 'Share your networking goal, skills, and interests to get matched.',
      fillExample: 'Fill example',
      goalLabel: 'Networking goal',
      goalPlaceholder: 'Choose a goal',
      roleLabel: 'Role',
      rolePlaceholder: 'e.g. Backend developer',
      experienceLabel: 'Years of experience',
      skillsLabel: 'Stack & skills',
      skillsPlaceholder: 'Python, FastAPI, PostgreSQL',
      interestsLabel: 'Interests',
      interestsPlaceholder: 'Startups, API, DevOps',
      lookingForLabel: 'Skills you are looking for',
      optional: 'optional',
      lookingForPlaceholder: 'e.g. React, sales',
      aboutLabel: 'About',
      aboutPlaceholder: 'What do you work on and what would you like to discuss?',
      submit: 'Find people',
      privacyNote: 'Your profile stays in this browser tab.',
      errors: {
        goal: 'Choose a networking goal.',
        role: 'Enter your role.',
        experience: 'Enter a whole number from 0 to 60.',
        skills: 'Enter at least one skill.',
        interests: 'Enter at least one interest.',
        about: 'Write a short note about yourself.',
      },
    },
    results: {
      title: 'Matches',
      editProfile: 'Edit profile',
      count: count => `Matches · ${count}`,
      feedbackSaved: count => `Feedback saved. Matches · ${count}`,
      partialMatches: count => `Showing all available matches · ${count} of 5`,
      directoryParticipant: 'Participant',
      directoryWhy: 'Why it fits',
      expand: 'Details',
      collapse: 'Hide',
      skillsAriaLabel: 'Skills',
      icebreakerTitle: 'Conversation starter',
      copy: 'Copy',
      copied: 'Copied',
      copyFallback: 'Select and copy the text manually.',
      emptyTitle: 'No matches found',
      emptyBody: 'Try changing your networking goal to discover other participants.',
    },
    feedback: {
      groupLabel: name => `Match feedback — ${name}`,
      met: 'Met',
      notAFit: 'Not a fit',
    },
    meetings: {
      pageTitle: 'Meetings',
      pickerAriaLabel: name => `1:1 slots with ${name}`,
      title: '1:1 meeting',
      noCommonSlots: 'No common free slots with this participant.',
      bookedSuffix: 'scheduled',
      cancel: 'Cancel',
      busyTitle: name => `Slot busy: ${name}`,
      selectTitle: label => `Select ${label}`,
      busyInline: name => ` (busy: ${name})`,
      scheduleTitle: 'My 1:1 schedule',
      scheduleEmpty: 'No meetings scheduled yet — choose a slot on a match card.',
    },
  },
}

export function getMessages(locale: Locale = 'ru'): Messages {
  return messagesByLocale[locale]
}
