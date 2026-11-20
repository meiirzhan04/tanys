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
  account: {
    openAccount: string
    backToDemo: string
    loadingSession: string
    loadingEvent: string
    joiningInvite: string
    signInTitle: string
    signInSubtitle: string
    inviteNotice: string
    purposeLogin: string
    purposeRecover: string
    emailLabel: string
    emailPlaceholder: string
    sendCode: string
    sendingCode: string
    codeSentHint: (email: string) => string
    codeLabel: string
    codePlaceholder: string
    verifyCode: string
    verifyingCode: string
    changeEmail: string
    resendCode: string
    expiredTitle: string
    expiredBody: string
    openMyEvents: string
    eventSelectorLabel: string
    noEventsTitle: string
    noEventsBody: string
    logout: string
    loggingOut: string
    leaveEvent: string
    leavingEvent: string
    eventClosedNotice: string
    profileTitle: string
    profileEditTitle: string
    profileSubtitle: string
    nameLabel: string
    namePlaceholder: string
    visibilityHeading: string
    visibilityToggleLabel: string
    visibilityNotice: string
    visibilityStatusVisible: string
    visibilityStatusHidden: string
    consentLabel: string
    saveProfile: string
    savingProfile: string
    retrySave: string
    savedNotice: string
    loadingRecommendations: string
    errors: {
      emailInvalid: string
      codeInvalid: string
      nameRequired: string
      consentRequired: string
      networkSavePreserved: string
      networkGeneral: string
      sessionExpired: string
      rateLimited: string
      invalidCode: string
      genericSave: string
      genericRequest: string
    }
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
    account: {
      openAccount: 'Войти',
      backToDemo: 'К демо',
      loadingSession: 'Проверяем сессию…',
      loadingEvent: 'Загружаем данные мероприятия…',
      joiningInvite: 'Присоединяемся к мероприятию по приглашению…',
      signInTitle: 'Вход в Tanys',
      signInSubtitle: 'Введите email, чтобы получить одноразовый код для входа или восстановления доступа.',
      inviteNotice: 'После входа вы автоматически вернётесь в мероприятие по вашей ссылке-приглашению.',
      purposeLogin: 'Вход',
      purposeRecover: 'Восстановить доступ',
      emailLabel: 'Email',
      emailPlaceholder: 'name@example.org',
      sendCode: 'Получить код',
      sendingCode: 'Отправляем код…',
      codeSentHint: email => `Код отправлен на ${email}. Введите его ниже.`,
      codeLabel: 'Одноразовый код',
      codePlaceholder: '123456',
      verifyCode: 'Войти',
      verifyingCode: 'Проверяем код…',
      changeEmail: 'Изменить email',
      resendCode: 'Отправить снова',
      expiredTitle: 'Ссылка-приглашение недействительна или истекла',
      expiredBody: 'Попросите организатора прислать новое приглашение или откройте одно из ваших мероприятий.',
      openMyEvents: 'Мои мероприятия',
      eventSelectorLabel: 'Мероприятие',
      noEventsTitle: 'Пока нет активных мероприятий',
      noEventsBody: 'Чтобы присоединиться, откройте ссылку-приглашение от организатора.',
      logout: 'Выйти',
      loggingOut: 'Выход…',
      leaveEvent: 'Выйти из мероприятия',
      leavingEvent: 'Выходим…',
      eventClosedNotice: 'Мероприятие завершено. Редактирование анкеты недоступно.',
      profileTitle: 'Анкета в мероприятии',
      profileEditTitle: 'Редактировать анкету',
      profileSubtitle: 'Заполните профиль и выберите, показывать ли его другим участникам этого мероприятия.',
      nameLabel: 'Имя',
      namePlaceholder: 'Например, Алия',
      visibilityHeading: 'Кому доступна анкета',
      visibilityToggleLabel: 'Показывать мою анкету участникам этого мероприятия',
      visibilityNotice: 'Вашу анкету (имя, роль, навыки, интересы, цель и «О себе») видят только участники этого мероприятия после того, как вы включите показ профиля. Вы можете скрыть анкету или выйти из мероприятия в любой момент.',
      visibilityStatusVisible: 'Видно только участникам этого мероприятия',
      visibilityStatusHidden: 'Скрыто — вы не отображаетесь в выдаче',
      consentLabel: 'Продолжая, я соглашаюсь на обработку данных моей анкеты для подбора собеседников и встреч 1:1 в рамках этого мероприятия (версия правил v1). Анкета и аккаунт удаляются в настройках профиля или по обращению к оператору; данные закрытого мероприятия очищаются через 30 дней.',
      saveProfile: 'Сохранить и перейти к подбору',
      savingProfile: 'Сохраняем анкету…',
      retrySave: 'Повторить сохранение',
      savedNotice: 'Анкета сохранена.',
      loadingRecommendations: 'Загружаем рекомендации…',
      errors: {
        emailInvalid: 'Введите корректный email.',
        codeInvalid: 'Введите код из письма.',
        nameRequired: 'Укажите ваше имя.',
        consentRequired: 'Подтвердите согласие на обработку данных анкеты.',
        networkSavePreserved: 'Не удалось сохранить анкету из-за ошибки сети. Введённые данные сохранены на экране — попробуйте снова.',
        networkGeneral: 'Ошибка сети. Проверьте подключение и попробуйте ещё раз.',
        sessionExpired: 'Сессия истекла. Войдите снова — введённые поля сохранены.',
        rateLimited: 'Слишком много запросов. Подождите немного и повторите попытку.',
        invalidCode: 'Неверный или истёкший код. Проверьте код или запросите новый.',
        genericSave: 'Не удалось сохранить анкету. Введённые данные сохранены на экране.',
        genericRequest: 'Произошла ошибка. Попробуйте повторить действие.',
      },
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
    account: {
      openAccount: 'Кіру',
      backToDemo: 'Демоға оралу',
      loadingSession: 'Сессия тексерілуде…',
      loadingEvent: 'Іс-шара деректері жүктелуде…',
      joiningInvite: 'Шақыру сілтемесі арқылы іс-шараға қосылуда…',
      signInTitle: 'Tanys жүйесіне кіру',
      signInSubtitle: 'Кіру немесе қолжетімділікті қалпына келтіру үшін бір реттік код алуға email енгізіңіз.',
      inviteNotice: 'Кіргеннен кейін сіз шақыру сілтемесіндегі іс-шараға автоматты түрде ораласыз.',
      purposeLogin: 'Кіру',
      purposeRecover: 'Қолжетімділікті қалпына келтіру',
      emailLabel: 'Email',
      emailPlaceholder: 'name@example.org',
      sendCode: 'Код алу',
      sendingCode: 'Код жіберілуде…',
      codeSentHint: email => `Код ${email} поштасына жіберілді. Төменге енгізіңіз.`,
      codeLabel: 'Бір реттік код',
      codePlaceholder: '123456',
      verifyCode: 'Кіру',
      verifyingCode: 'Код тексерілуде…',
      changeEmail: 'Email өзгерту',
      resendCode: 'Қайта жіберу',
      expiredTitle: 'Шақыру сілтемесі жарамсыз немесе мерзімі өткен',
      expiredBody: 'Ұйымдастырушыдан жаңа сілтеме сұраңыз немесе өз іс-шараларыңыздың бірін ашыңыз.',
      openMyEvents: 'Менің іс-шараларым',
      eventSelectorLabel: 'Іс-шара',
      noEventsTitle: 'Белсенді іс-шаралар әлі жоқ',
      noEventsBody: 'Қосылу үшін ұйымдастырушы жіберген шақыру сілтемесін ашыңыз.',
      logout: 'Шығу',
      loggingOut: 'Шығуда…',
      leaveEvent: 'Іс-шарадан шығу',
      leavingEvent: 'Шығуда…',
      eventClosedNotice: 'Іс-шара аяқталды. Сауалнаманы өзгерту қолжетімсіз.',
      profileTitle: 'Іс-шарадағы анкета',
      profileEditTitle: 'Анкетаны өңдеу',
      profileSubtitle: 'Профильді толтырып, оны осы іс-шараның басқа қатысушыларына көрсетуді таңдаңыз.',
      nameLabel: 'Атыңыз',
      namePlaceholder: 'Мысалы, Әлия',
      visibilityHeading: 'Анкета кімге көрінеді',
      visibilityToggleLabel: 'Менің анкетамды осы іс-шара қатысушыларына көрсету',
      visibilityNotice: 'Сауалнамаңызды (атыңыз, рөліңіз, дағдыларыңыз, қызығушылықтарыңыз, мақсатыңыз және «Өзім туралы») профильді көрсетуді қосқаннан кейін тек осы іс-шараның қатысушылары ғана көреді. Профильді кез келген уақытта жасыруға немесе іс-шарадан шығуға болады.',
      visibilityStatusVisible: 'Тек осы іс-шара қатысушыларына көрінеді',
      visibilityStatusHidden: 'Жасырын — іріктеуде көрсетілмейсіз',
      consentLabel: 'Жалғастыра отырып, осы іс-шара аясында сұхбаттасушыларды іріктеу және 1:1 кездесулерді жоспарлау үшін сауалнама деректерімді өңдеуге келісемін (ереже нұсқасы v1). Профиль мен аккаунтты баптауларда немесе операторға жүгініп өшіруге болады; аяқталған іс-шара деректері 30 күннен кейін тазаланады.',
      saveProfile: 'Сақтау және ұсыныстарға өту',
      savingProfile: 'Анкета сақталуда…',
      retrySave: 'Сақтауды қайталау',
      savedNotice: 'Анкета сақталды.',
      loadingRecommendations: 'Ұсыныстар жүктелуде…',
      errors: {
        emailInvalid: 'Дұрыс email енгізіңіз.',
        codeInvalid: 'Хаттағы кодты енгізіңіз.',
        nameRequired: 'Атыңызды көрсетіңіз.',
        consentRequired: 'Сауалнама деректерін өңдеуге келісімді растаңыз.',
        networkSavePreserved: 'Желі қатесіне байланысты анкетаны сақтау мүмкін болмады. Енгізілген деректер экранда сақталды — қайта көріңіз.',
        networkGeneral: 'Желі қатесі. Қосылымды тексеріп, қайта көріңіз.',
        sessionExpired: 'Сессия мерзімі аяқталды. Қайта кіріңіз — енгізілген өрістер сақталды.',
        rateLimited: 'Сұраулар тым көп. Сәл күтіп, қайта көріңіз.',
        invalidCode: 'Код қате немесе мерзімі өткен. Кодты тексеріңіз немесе жаңасын сұраңыз.',
        genericSave: 'Анкетаны сақтау мүмкін болмады. Енгізілген деректер экранда сақталды.',
        genericRequest: 'Қате орын алды. Әрекетті қайталап көріңіз.',
      },
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
    account: {
      openAccount: 'Sign in',
      backToDemo: 'Demo mode',
      loadingSession: 'Checking session…',
      loadingEvent: 'Loading event…',
      joiningInvite: 'Joining event via invite…',
      signInTitle: 'Sign in to Tanys',
      signInSubtitle: 'Enter your email to receive a one-time code to sign in or recover access.',
      inviteNotice: 'After signing in, you will return directly to the event from your invite link.',
      purposeLogin: 'Sign in',
      purposeRecover: 'Recover access',
      emailLabel: 'Email',
      emailPlaceholder: 'name@example.org',
      sendCode: 'Send code',
      sendingCode: 'Sending code…',
      codeSentHint: email => `Code sent to ${email}. Enter it below.`,
      codeLabel: 'One-time code',
      codePlaceholder: '123456',
      verifyCode: 'Sign in',
      verifyingCode: 'Verifying code…',
      changeEmail: 'Change email',
      resendCode: 'Resend code',
      expiredTitle: 'Invite link is invalid or expired',
      expiredBody: 'Ask the organizer for a fresh invite link or open one of your events.',
      openMyEvents: 'My events',
      eventSelectorLabel: 'Event',
      noEventsTitle: 'No active events yet',
      noEventsBody: 'Open an invite link from your event organizer to join.',
      logout: 'Sign out',
      loggingOut: 'Signing out…',
      leaveEvent: 'Leave event',
      leavingEvent: 'Leaving…',
      eventClosedNotice: 'This event is closed. Profile editing is disabled.',
      profileTitle: 'Event profile',
      profileEditTitle: 'Edit profile',
      profileSubtitle: 'Complete your profile and choose whether other participants of this event can see it.',
      nameLabel: 'Name',
      namePlaceholder: 'e.g. Aliya',
      visibilityHeading: 'Who can see your profile',
      visibilityToggleLabel: 'Show my profile to participants of this event',
      visibilityNotice: "Your profile (name, role, skills, interests, goal, and 'About') is shown only to participants of this event once you turn profile visibility on. You can hide your profile or leave the event at any time.",
      visibilityStatusVisible: 'Visible only to participants of this event',
      visibilityStatusHidden: 'Hidden — not shown in matches',
      consentLabel: 'By continuing, I agree to the processing of my profile data for matchmaking and 1:1 meeting scheduling within this event (policy v1). You can delete your profile and account in settings or via the operator contact; closed event data is purged after 30 days.',
      saveProfile: 'Save & view matches',
      savingProfile: 'Saving profile…',
      retrySave: 'Retry save',
      savedNotice: 'Profile saved.',
      loadingRecommendations: 'Loading matches…',
      errors: {
        emailInvalid: 'Enter a valid email address.',
        codeInvalid: 'Enter the code from your email.',
        nameRequired: 'Enter your name.',
        consentRequired: 'Please accept the profile data processing notice.',
        networkSavePreserved: 'Could not save your profile due to a network error. Your input is preserved on screen — please retry.',
        networkGeneral: 'Network error. Check your connection and try again.',
        sessionExpired: 'Your session expired. Sign in again — your entered fields are preserved.',
        rateLimited: 'Too many requests. Please wait a moment and try again.',
        invalidCode: 'Invalid or expired code. Check the code or request a new one.',
        genericSave: 'Could not save your profile. Your entered fields are preserved on screen.',
        genericRequest: 'Something went wrong. Please try again.',
      },
    },
  },
}

export function getMessages(locale: Locale = 'ru'): Messages {
  return messagesByLocale[locale]
}
