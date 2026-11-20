import type { Locale } from '../../matching/types'

export interface ConnectionsCopy {
  howTitle: string
  howSteps: readonly [string, string, string]
  howHints: readonly [string, string, string]
  searchTitle: string
  searchLabel: string
  searchPlaceholder: string
  searchHint: string
  searchMin: (count: number) => string
  searchLoading: string
  searchEmpty: (query: string) => string
  searchError: string
  retry: string
  manualNote: string
  contactHidden: string
  messageLabel: string
  messagePlaceholder: string
  connect: string
  sending: string
  sentPending: string
  sentHint: string
  incomingPending: string
  connected: string
  declined: string
  withdrawn: string
  sendError: string
  close: string
  requestsTitle: string
  ownContactMissing: string
  ownContactSet: (value: string) => string
  openProfile: string
  messageFrom: string
  copy: string
  copied: string
  openLink: string
  noContact: string
  myMeetings: string
}

export const connectionsCopy: Record<Locale, ConnectionsCopy> = {
  ru: {
    howTitle: 'Как это работает',
    howSteps: ['Найдите человека', 'Отправьте запрос', 'Договоритесь о встрече'],
    howHints: ['По @username или из рекомендаций', 'Контакты откроются после согласия обоих', 'Выберите общее свободное время'],
    searchTitle: 'Найти людей',
    searchLabel: 'Поиск по username',
    searchPlaceholder: 'Например, @parasat',
    searchHint: 'Ищите участников этого мероприятия',
    searchMin: count => `Введите минимум ${count} символа`,
    searchLoading: 'Ищем…',
    searchEmpty: query => `Никого не нашли по «${query}». Проверьте написание или поищите по имени.`,
    searchError: 'Не удалось выполнить поиск. Проверьте соединение.',
    retry: 'Повторить',
    manualNote: 'Найден вручную — это не рекомендация подбора',
    contactHidden: 'Контакт скрыт до взаимного согласия',
    messageLabel: 'Сообщение (необязательно)',
    messagePlaceholder: 'Например: хочу обсудить вакансию backend-разработчика',
    connect: 'Познакомиться',
    sending: 'Отправляем…',
    sentPending: 'Запрос отправлен · ждём ответа',
    sentHint: 'Участник увидит запрос во вкладке «Входящие».',
    incomingPending: 'Этот участник уже отправил вам запрос',
    connected: 'Вы знакомы',
    declined: 'Запрос отклонён',
    withdrawn: 'Запрос отменён',
    sendError: 'Запрос не отправлен. Попробуйте ещё раз.',
    close: 'Закрыть',
    requestsTitle: 'Запросы',
    ownContactMissing: 'Добавьте контакт в профиле — его увидят только после взаимного согласия.',
    ownContactSet: value => `Ваш контакт для знакомств: ${value}`,
    openProfile: 'Открыть профиль',
    messageFrom: 'Сообщение',
    copy: 'Скопировать',
    copied: 'Скопировано',
    openLink: 'Открыть',
    noContact: 'Участник пока не добавил контакт',
    myMeetings: 'Мои встречи',
  },
  kk: {
    howTitle: 'Бұл қалай жұмыс істейді',
    howSteps: ['Адамды табыңыз', 'Сұрау жіберіңіз', 'Кездесуді келісіңіз'],
    howHints: ['@username арқылы немесе ұсыныстардан', 'Байланыс екі жақ келіскенде ашылады', 'Ортақ бос уақытты таңдаңыз'],
    searchTitle: 'Адамдарды табу',
    searchLabel: 'Username бойынша іздеу',
    searchPlaceholder: 'Мысалы, @parasat',
    searchHint: 'Осы іс-шараның қатысушыларын іздеңіз',
    searchMin: count => `Кемінде ${count} таңба енгізіңіз`,
    searchLoading: 'Іздеп жатырмыз…',
    searchEmpty: query => `«${query}» бойынша ешкім табылмады. Жазылуын тексеріңіз немесе атымен іздеңіз.`,
    searchError: 'Іздеу орындалмады. Байланысты тексеріңіз.',
    retry: 'Қайталау',
    manualNote: 'Қолмен табылды — бұл іріктеу ұсынысы емес',
    contactHidden: 'Байланыс өзара келісімге дейін жасырын',
    messageLabel: 'Хабарлама (міндетті емес)',
    messagePlaceholder: 'Мысалы: backend әзірлеуші вакансиясын талқылағым келеді',
    connect: 'Танысу',
    sending: 'Жіберілуде…',
    sentPending: 'Сұрау жіберілді · жауап күтілуде',
    sentHint: 'Қатысушы сұрауды «Кіріс» қойындысынан көреді.',
    incomingPending: 'Бұл қатысушы сізге сұрау жіберіп қойған',
    connected: 'Сіздер таныссыздар',
    declined: 'Сұрау қабылданбады',
    withdrawn: 'Сұрау болдырылмады',
    sendError: 'Сұрау жіберілмеді. Қайталап көріңіз.',
    close: 'Жабу',
    requestsTitle: 'Сұраулар',
    ownContactMissing: 'Профильде байланыс қосыңыз — оны тек өзара келісімнен кейін көреді.',
    ownContactSet: value => `Танысуға арналған байланысыңыз: ${value}`,
    openProfile: 'Профильді ашу',
    messageFrom: 'Хабарлама',
    copy: 'Көшіру',
    copied: 'Көшірілді',
    openLink: 'Ашу',
    noContact: 'Қатысушы әлі байланыс қоспаған',
    myMeetings: 'Менің кездесулерім',
  },
  en: {
    howTitle: 'How it works',
    howSteps: ['Find a person', 'Send a request', 'Agree on a meeting'],
    howHints: ['By @username or from recommendations', 'Contacts unlock once you both agree', 'Pick a shared free time'],
    searchTitle: 'Find people',
    searchLabel: 'Search by username',
    searchPlaceholder: 'For example, @parasat',
    searchHint: 'Search participants of this event',
    searchMin: count => `Type at least ${count} characters`,
    searchLoading: 'Searching…',
    searchEmpty: query => `Nobody found for “${query}”. Check the spelling or search by name.`,
    searchError: 'Search failed. Check your connection.',
    retry: 'Retry',
    manualNote: 'Found manually — not a matching recommendation',
    contactHidden: 'Contact stays hidden until you both agree',
    messageLabel: 'Message (optional)',
    messagePlaceholder: 'For example: I would like to discuss the backend developer role',
    connect: 'Connect',
    sending: 'Sending…',
    sentPending: 'Request sent · waiting for a reply',
    sentHint: 'They will see it in their “Incoming” tab.',
    incomingPending: 'This participant has already sent you a request',
    connected: 'Connected',
    declined: 'Request declined',
    withdrawn: 'Request cancelled',
    sendError: 'The request was not sent. Please try again.',
    close: 'Close',
    requestsTitle: 'Requests',
    ownContactMissing: 'Add a contact in your profile — it is shown only after you both agree.',
    ownContactSet: value => `Your contact for introductions: ${value}`,
    openProfile: 'Open profile',
    messageFrom: 'Message',
    copy: 'Copy',
    copied: 'Copied',
    openLink: 'Open',
    noContact: 'This participant has not added a contact yet',
    myMeetings: 'My meetings',
  },
}

export interface ShellCopy {
  backToTop: string
  about: string
  support: string
  demoBadge: string
  demoNote: string
  demoShort: string
  footerTagline: string
  aboutTitle: string
  aboutBody: readonly string[]
  supportTitle: string
  supportEvent: string
  supportPlatform: string
  supportEmailLabel: string
  close: string
}

export const shellCopy: Record<Locale, ShellCopy> = {
  ru: {
    backToTop: 'Наверх',
    about: 'О проекте',
    support: 'Поддержка',
    demoBadge: 'Демо',
    demoNote: 'Все анкеты в демо вымышленные',
    demoShort: 'анкеты вымышленные',
    footerTagline: 'Полезные знакомства на IT-событиях',
    aboutTitle: 'О проекте Tanys',
    aboutBody: [
      'Tanys помогает участникам IT-мероприятий находить нужных людей: подбирает собеседников по цели и стеку, открывает контакты только после взаимного согласия и помогает договориться о встрече.',
      'Прототип создан для кейса Qazaq IT Community «AI for Smart Campus».',
      'В демо-режиме все анкеты вымышленные.',
    ],
    supportTitle: 'Поддержка',
    supportEvent: 'По вопросам мероприятия обратитесь к его организатору.',
    supportPlatform: 'Если что-то не работает в Tanys или нужно сообщить о нарушении, напишите в поддержку:',
    supportEmailLabel: 'Почта поддержки',
    close: 'Закрыть',
  },
  kk: {
    backToTop: 'Жоғарыға',
    about: 'Жоба туралы',
    support: 'Қолдау',
    demoBadge: 'Демо',
    demoNote: 'Демодағы барлық анкета ойдан құрастырылған',
    demoShort: 'анкеталар ойдан құрастырылған',
    footerTagline: 'IT-іс-шаралардағы пайдалы таныстықтар',
    aboutTitle: 'Tanys жобасы туралы',
    aboutBody: [
      'Tanys IT-іс-шара қатысушыларына керек адамдарды табуға көмектеседі: мақсат пен стек бойынша әңгімелесушілерді іріктейді, байланысты тек өзара келісімнен кейін ашады және кездесуді келісуге көмектеседі.',
      'Прототип Qazaq IT Community «AI for Smart Campus» кейсі үшін жасалған.',
      'Демо режимде барлық анкета ойдан құрастырылған.',
    ],
    supportTitle: 'Қолдау',
    supportEvent: 'Іс-шара бойынша сұрақтарды оның ұйымдастырушысына қойыңыз.',
    supportPlatform: 'Tanys-та бірдеңе жұмыс істемесе немесе бұзушылық туралы хабарлау керек болса, қолдауға жазыңыз:',
    supportEmailLabel: 'Қолдау поштасы',
    close: 'Жабу',
  },
  en: {
    backToTop: 'Back to top',
    about: 'About',
    support: 'Support',
    demoBadge: 'Demo',
    demoNote: 'All demo profiles are fictional',
    demoShort: 'fictional profiles',
    footerTagline: 'Useful connections at tech events',
    aboutTitle: 'About Tanys',
    aboutBody: [
      'Tanys helps people at tech events find the right people: it matches by goal and stack, unlocks contacts only after both agree, and helps you agree on a meeting.',
      'The prototype was built for the Qazaq IT Community “AI for Smart Campus” case.',
      'In demo mode all profiles are fictional.',
    ],
    supportTitle: 'Support',
    supportEvent: 'For questions about an event, contact its organizer.',
    supportPlatform: 'If something does not work in Tanys or you need to report abuse, write to support:',
    supportEmailLabel: 'Support email',
    close: 'Close',
  },
}
