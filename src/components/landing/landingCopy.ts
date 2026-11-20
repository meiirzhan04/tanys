import type { Goal, Locale } from '../../matching/types'

export interface LandingCopy {
  pill: string
  titleLead: string
  titleAccent: string
  subtitle: string
  ctaPrimary: string
  ctaSecondary: string
  trust: readonly string[]
  circuit: {
    you: string
    youRole: string
    chipCaption: string
    matchTitle: string
    matchReason: string
    matchPhrase: string
    people: readonly { initial: string; name: string; role: string }[]
  }
  stats: readonly { value: string; label: string }[]
  howEyebrow: string
  howTitle: string
  howSubtitle: string
  steps: readonly { title: string; text: string }[]
  goalsEyebrow: string
  goalsTitle: string
  goalsSubtitle: string
  goalHint: string
  goalPairs: Record<Goal, { text: string; pairWith: Goal }>
  pairPrefix: string
  orgEyebrow: string
  orgTitle: string
  orgSubtitle: string
  orgFeatures: readonly string[]
  orgCta: string
  orgMapTitle: string
  orgMapCaption: (profiles: number) => string
  formEyebrow: string
}

const people = [
  { initial: 'А', name: 'Айгерим', role: 'Backend · Go' },
  { initial: 'Д', name: 'Данияр', role: 'Tech Lead' },
  { initial: 'М', name: 'Мадина', role: 'Data · ML' },
  { initial: 'Т', name: 'Тимур', role: 'Founder' },
  { initial: 'Ж', name: 'Жанар', role: 'QA Lead' },
  { initial: 'Е', name: 'Ерлан', role: 'DevOps' },
] as const

export const landingCopy: Record<Locale, LandingCopy> = {
  ru: {
    pill: 'Нетворкинг 1:1 для IT-событий',
    titleLead: 'Нужные люди на митапе — ',
    titleAccent: 'за одну минуту',
    subtitle:
      'Tanys подбирает пять взаимно полезных собеседников по цели, стеку и интересам, объясняет, почему вы подходите друг другу, и помогает договориться о 20-минутной встрече.',
    ctaPrimary: 'Заполнить анкету',
    ctaSecondary: 'Войти по приглашению',
    trust: ['Демо без регистрации', 'Казахский, русский, английский', 'Контакты открываются только взаимно'],
    circuit: {
      you: 'Вы',
      youRole: 'Ищу работу · Python',
      chipCaption: 'взаимный подбор',
      matchTitle: 'Данияр — Tech Lead',
      matchReason: 'Вы ищете работу, он нанимает. Общий стек: Python, FastAPI.',
      matchPhrase: '«Слышал, вы собираете backend-команду — расскажете про стек?»',
      people: [...people],
    },
    stats: [
      { value: '5', label: 'собеседников с объяснением' },
      { value: '< 1 с', label: 'на подбор после анкеты' },
      { value: '20 мин', label: 'слот встречи без пересечений' },
      { value: '3', label: 'языка интерфейса' },
    ],
    howEyebrow: 'Как это работает',
    howTitle: 'От анкеты до встречи — четыре шага',
    howSubtitle: 'Никаких случайных знакомств: только люди, которым вы тоже нужны.',
    steps: [
      { title: 'Анкета за минуту', text: 'Цель знакомства, роль, опыт, стек и интересы — всё, что нужно для точного подбора.' },
      { title: 'Пять взаимных совпадений', text: 'Учитываем, что нужно вам и что нужно собеседнику, и объясняем каждое совпадение.' },
      { title: 'Первая фраза и знакомство', text: 'Готовая фраза для начала разговора. Контакт открывается, только когда согласны оба.' },
      { title: 'Встреча на 20 минут', text: 'Выбираете общий свободный слот — расписание само защищает от пересечений.' },
    ],
    goalsEyebrow: 'Для кого',
    goalsTitle: 'Выберите цель — мы найдём встречную',
    goalsSubtitle: 'Подбор строится на взаимности: соискатель встречает того, кто нанимает, ментор — того, кто ищет ментора.',
    goalHint: 'Нажмите, чтобы начать анкету с этой целью',
    goalPairs: {
      find_job: { text: 'Познакомьтесь с тимлидами и HR, которые нанимают под ваш стек.', pairWith: 'hire' },
      hire: { text: 'Найдите кандидатов, чьи навыки совпадают с вашей вакансией.', pairWith: 'find_job' },
      find_mentor: { text: 'Опытные инженеры, готовые поделиться опытом в вашей области.', pairWith: 'be_mentor' },
      be_mentor: { text: 'Помогите тем, кто растёт в вашем стеке, и расширьте круг.', pairWith: 'find_mentor' },
      find_cofounder: { text: 'Люди с дополняющими навыками, которые тоже ищут партнёра.', pairWith: 'find_cofounder' },
      exchange_experience: { text: 'Коллеги по стеку для обмена практиками и разбора задач.', pairWith: 'exchange_experience' },
    },
    pairPrefix: 'Встречная цель:',
    orgEyebrow: 'Организаторам',
    orgTitle: 'Кабинет события — от приглашения до аналитики',
    orgSubtitle: 'Создайте событие, пригласите участников по ссылке или QR и смотрите, чем живёт ваша аудитория.',
    orgFeatures: [
      'Событие и приглашения по ссылке или QR-коду',
      'Карта интересов участников с выгрузкой в CSV',
      'Стенды партнёров с подбором по интересам',
      'Модерация: жалобы, блокировки, поиск участников',
    ],
    orgCta: 'Открыть кабинет организатора',
    orgMapTitle: 'Карта интересов',
    orgMapCaption: count => `Топ тем в демо-базе из ${count} анкет`,
    formEyebrow: 'Попробуйте прямо сейчас',
  },
  kk: {
    pill: 'IT-іс-шараларға арналған 1:1 нетворкинг',
    titleLead: 'Митаптағы керек адамдар — ',
    titleAccent: 'бір минутта',
    subtitle:
      'Tanys мақсатыңыз, стегіңіз және қызығушылықтарыңыз бойынша өзара пайдалы бес адамды іріктейді, неге сәйкес келетініңізді түсіндіреді және 20 минуттық кездесуді белгілеуге көмектеседі.',
    ctaPrimary: 'Анкетаны толтыру',
    ctaSecondary: 'Шақыру арқылы кіру',
    trust: ['Демо тіркеусіз', 'Қазақша, орысша, ағылшынша', 'Контакт тек өзара келісіммен ашылады'],
    circuit: {
      you: 'Сіз',
      youRole: 'Жұмыс іздеймін · Python',
      chipCaption: 'өзара іріктеу',
      matchTitle: 'Данияр — Tech Lead',
      matchReason: 'Сіз жұмыс іздейсіз, ол маман жалдайды. Ортақ стек: Python, FastAPI.',
      matchPhrase: '«Backend командасын жинап жатқаныңызды естідім — стек туралы айтып бересіз бе?»',
      people: [...people],
    },
    stats: [
      { value: '5', label: 'түсіндірмесі бар адам' },
      { value: '< 1 с', label: 'анкетадан кейінгі іріктеу' },
      { value: '20 мин', label: 'қақтығыссыз кездесу слоты' },
      { value: '3', label: 'интерфейс тілі' },
    ],
    howEyebrow: 'Қалай жұмыс істейді',
    howTitle: 'Анкетадан кездесуге дейін — төрт қадам',
    howSubtitle: 'Кездейсоқ таныстық жоқ: тек сізге де мұқтаж адамдар.',
    steps: [
      { title: 'Бір минуттық анкета', text: 'Танысу мақсаты, рөл, тәжірибе, стек және қызығушылықтар — дәл іріктеуге керегінің бәрі.' },
      { title: 'Бес өзара сәйкестік', text: 'Сізге не керегін де, әңгімелесушіге не керегін де ескеріп, әр сәйкестікті түсіндіреміз.' },
      { title: 'Алғашқы сөз және танысу', text: 'Әңгімені бастауға дайын сөйлем. Контакт екі жақ келіскенде ғана ашылады.' },
      { title: '20 минуттық кездесу', text: 'Ортақ бос слотты таңдайсыз — кесте қақтығыстардан өзі қорғайды.' },
    ],
    goalsEyebrow: 'Кімге арналған',
    goalsTitle: 'Мақсатты таңдаңыз — қарсы мақсатты табамыз',
    goalsSubtitle: 'Іріктеу өзаралыққа негізделген: жұмыс іздеуші жалдаушымен, ментор — ментор іздеушімен кездеседі.',
    goalHint: 'Осы мақсатпен анкетаны бастау үшін басыңыз',
    goalPairs: {
      find_job: { text: 'Сіздің стекке маман жалдайтын тимлидтер мен HR-мен танысыңыз.', pairWith: 'hire' },
      hire: { text: 'Дағдылары вакансияңызға сәйкес келетін үміткерлерді табыңыз.', pairWith: 'find_job' },
      find_mentor: { text: 'Сіздің салада тәжірибесімен бөлісуге дайын инженерлер.', pairWith: 'be_mentor' },
      be_mentor: { text: 'Сіздің стекте өсіп келе жатқандарға көмектесіп, ортаңызды кеңейтіңіз.', pairWith: 'find_mentor' },
      find_cofounder: { text: 'Серіктес іздейтін, дағдылары сізді толықтыратын адамдар.', pairWith: 'find_cofounder' },
      exchange_experience: { text: 'Тәжірибе алмасуға және міндеттерді талдауға стектес әріптестер.', pairWith: 'exchange_experience' },
    },
    pairPrefix: 'Қарсы мақсат:',
    orgEyebrow: 'Ұйымдастырушыларға',
    orgTitle: 'Іс-шара кабинеті — шақырудан аналитикаға дейін',
    orgSubtitle: 'Іс-шара құрып, қатысушыларды сілтеме немесе QR арқылы шақырыңыз және аудиторияңыздың қызығушылықтарын көріңіз.',
    orgFeatures: [
      'Іс-шара және сілтеме немесе QR-код арқылы шақыру',
      'Қатысушылар қызығушылықтарының картасы, CSV экспорты',
      'Қызығушылықтар бойынша серіктес стендтері',
      'Модерация: шағымдар, бұғаттау, қатысушыларды іздеу',
    ],
    orgCta: 'Ұйымдастырушы кабинетін ашу',
    orgMapTitle: 'Қызығушылықтар картасы',
    orgMapCaption: count => `${count} анкеталық демо-базадағы үздік тақырыптар`,
    formEyebrow: 'Қазір байқап көріңіз',
  },
  en: {
    pill: '1:1 networking for tech events',
    titleLead: 'The right people at the meetup — ',
    titleAccent: 'in one minute',
    subtitle:
      'Tanys picks five mutually useful people by goal, stack and interests, explains why you fit each other, and helps you book a 20-minute meeting.',
    ctaPrimary: 'Fill in the profile',
    ctaSecondary: 'Sign in with an invite',
    trust: ['Demo without sign-up', 'Kazakh, Russian, English', 'Contacts unlock only mutually'],
    circuit: {
      you: 'You',
      youRole: 'Looking for a job · Python',
      chipCaption: 'mutual matching',
      matchTitle: 'Daniyar — Tech Lead',
      matchReason: 'You are looking for a job, he is hiring. Shared stack: Python, FastAPI.',
      matchPhrase: '“I heard you are building a backend team — could you tell me about the stack?”',
      people: [...people],
    },
    stats: [
      { value: '5', label: 'matches with a reason' },
      { value: '< 1 s', label: 'to match after the profile' },
      { value: '20 min', label: 'conflict-free meeting slot' },
      { value: '3', label: 'interface languages' },
    ],
    howEyebrow: 'How it works',
    howTitle: 'From profile to meeting in four steps',
    howSubtitle: 'No random intros: only people who need you too.',
    steps: [
      { title: 'One-minute profile', text: 'Goal, role, experience, stack and interests — everything precise matching needs.' },
      { title: 'Five mutual matches', text: 'We weigh what you need and what the other person needs, and explain every match.' },
      { title: 'First line and intro', text: 'A ready opening line. Contacts unlock only when both sides agree.' },
      { title: 'A 20-minute meeting', text: 'Pick a shared free slot — the schedule prevents conflicts for you.' },
    ],
    goalsEyebrow: 'Who it is for',
    goalsTitle: 'Pick a goal — we find the matching one',
    goalsSubtitle: 'Matching is reciprocal: a job seeker meets someone hiring, a mentor meets someone looking for a mentor.',
    goalHint: 'Click to start the profile with this goal',
    goalPairs: {
      find_job: { text: 'Meet tech leads and recruiters hiring for your stack.', pairWith: 'hire' },
      hire: { text: 'Find candidates whose skills match your opening.', pairWith: 'find_job' },
      find_mentor: { text: 'Experienced engineers ready to share know-how in your field.', pairWith: 'be_mentor' },
      be_mentor: { text: 'Help people growing in your stack and widen your circle.', pairWith: 'find_mentor' },
      find_cofounder: { text: 'People with complementary skills who are also looking for a partner.', pairWith: 'find_cofounder' },
      exchange_experience: { text: 'Peers on your stack to swap practices and talk through problems.', pairWith: 'exchange_experience' },
    },
    pairPrefix: 'Matching goal:',
    orgEyebrow: 'For organizers',
    orgTitle: 'An event cabinet — from invites to analytics',
    orgSubtitle: 'Create an event, invite people by link or QR, and see what your audience cares about.',
    orgFeatures: [
      'Events and invites by link or QR code',
      'Attendee interest map with CSV export',
      'Partner booths matched by interests',
      'Moderation: reports, blocks, member search',
    ],
    orgCta: 'Open the organizer cabinet',
    orgMapTitle: 'Interest map',
    orgMapCaption: count => `Top topics in the demo base of ${count} profiles`,
    formEyebrow: 'Try it right now',
  },
}
