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
  whyTitle: string
  whyItems: readonly [string, string, string]
  ownHidden: string
  ownMissing: string
  openQuestionnaire: string
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
  contactTitle: string
  contactExplain: string
  contactNotSet: string
  contactAdd: string
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
    whyTitle: 'Человека можно найти, если он:',
    whyItems: ['присоединился к этому мероприятию по приглашению', 'сохранил анкету мероприятия', 'включил «Показывать мою анкету»'],
    ownHidden: 'Ваша анкета скрыта: другие участники не найдут вас и не смогут ответить на запрос.',
    ownMissing: 'Сначала заполните анкету мероприятия — без неё нельзя отправлять запросы.',
    openQuestionnaire: 'Открыть анкету',
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
    contactTitle: 'Контакт для обмена',
    contactExplain: 'Его увидят только люди, с которыми вы взаимно согласились познакомиться. Без контакта собеседник не сможет с вами связаться.',
    contactNotSet: 'Контакт не указан',
    contactAdd: 'Добавить контакт',
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
    whyTitle: 'Адамды табуға болады, егер ол:',
    whyItems: ['осы іс-шараға шақыру арқылы қосылса', 'іс-шара сауалнамасын сақтаса', '«Сауалнамамды көрсету» дегенді қосса'],
    ownHidden: 'Сауалнамаңыз жасырын: басқа қатысушылар сізді таба алмайды және сұрауға жауап бере алмайды.',
    ownMissing: 'Алдымен іс-шара сауалнамасын толтырыңыз — онсыз сұрау жіберуге болмайды.',
    openQuestionnaire: 'Сауалнаманы ашу',
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
    contactTitle: 'Алмасуға арналған байланыс',
    contactExplain: 'Оны тек өзара танысуға келіскен адамдар ғана көреді. Байланыс болмаса, әңгімелесуші сізбен хабарласа алмайды.',
    contactNotSet: 'Байланыс көрсетілмеген',
    contactAdd: 'Байланыс қосу',
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
    whyTitle: 'You can find a person if they:',
    whyItems: ['joined this event with an invite', 'saved their event questionnaire', 'turned on “Show my questionnaire”'],
    ownHidden: 'Your questionnaire is hidden: other participants cannot find you or reply to a request.',
    ownMissing: 'Fill in the event questionnaire first — you need it to send requests.',
    openQuestionnaire: 'Open questionnaire',
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
    contactTitle: 'Contact to share',
    contactExplain: 'Only people you have both agreed to meet will see it. Without a contact, they cannot reach you.',
    contactNotSet: 'No contact yet',
    contactAdd: 'Add contact',
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
    footerTagline: 'Полезные знакомства на IT-событиях',
    aboutTitle: 'О проекте Tanys',
    aboutBody: [
      'Tanys помогает участникам IT-мероприятий находить нужных людей: подбирает собеседников по цели и стеку, открывает контакты только после взаимного согласия и помогает договориться о встрече.',
      'Прототип создан для кейса Qazaq IT Community «AI for Smart Campus».',
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
    footerTagline: 'IT-іс-шаралардағы пайдалы таныстықтар',
    aboutTitle: 'Tanys жобасы туралы',
    aboutBody: [
      'Tanys IT-іс-шара қатысушыларына керек адамдарды табуға көмектеседі: мақсат пен стек бойынша әңгімелесушілерді іріктейді, байланысты тек өзара келісімнен кейін ашады және кездесуді келісуге көмектеседі.',
      'Прототип Qazaq IT Community «AI for Smart Campus» кейсі үшін жасалған.',
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
    footerTagline: 'Useful connections at tech events',
    aboutTitle: 'About Tanys',
    aboutBody: [
      'Tanys helps people at tech events find the right people: it matches by goal and stack, unlocks contacts only after both agree, and helps you agree on a meeting.',
      'The prototype was built for the Qazaq IT Community “AI for Smart Campus” case.',
    ],
    supportTitle: 'Support',
    supportEvent: 'For questions about an event, contact its organizer.',
    supportPlatform: 'If something does not work in Tanys or you need to report abuse, write to support:',
    supportEmailLabel: 'Support email',
    close: 'Close',
  },
}
