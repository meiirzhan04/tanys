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
    interests: string
  }
  interestMap: {
    title: string
    profileCount: string
    topic: string
    participants: string
    empty: string
  }
  booths: {
    title: string
    subtitle: string
    demoBadge: string
    topicsAriaLabel: string
    emptyTitle: string
    emptyBody: string
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
    purposeRegister: string
    usernameLabel: string
    passwordLabel: string
    passwordHint: string
    authSubmitting: string
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
    deleteAccount: string
    deletingAccount: string
    deleteAccountConfirm: string
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
      usernameInvalid: string
      passwordRequired: string
      passwordTooShort: string
      usernameUnavailable: string
      invalidCredentials: string
      nameRequired: string
      consentRequired: string
      networkSavePreserved: string
      networkGeneral: string
      sessionExpired: string
      rateLimited: string
      genericSave: string
      authUnavailable: string
      genericRequest: string
      deleteAccountFailed: string
    }
    unsaved: {
      title: string
      body: string
      stayButton: string
      discardButton: string
      badge: string
    }
  }
  social: {
    navIntroductions: string
    navMeetings: string
    refresh: string
    refreshing: string
    contactLabel: string
    contactPlaceholder: string
    contactNotice: string
    saveContact: string
    savingContact: string
    contactSaved: string
    requestIntro: string
    requestingIntro: string
    alreadyRequested: string
    introTitle: string
    incomingHeading: string
    outgoingHeading: string
    noIncoming: string
    noOutgoing: string
    accept: string
    decline: string
    withdraw: string
    sharedContactLabel: string
    contactNotShared: string
    proposeMeeting: string
    hideSlots: string
    loadingSlots: string
    noCommonSlots: string
    slotProposed: string
    slotConflict: string
    meetingsTitle: string
    noMeetings: string
    confirm: string
    cancel: string
    statusPending: string
    statusAccepted: string
    statusDeclined: string
    statusWithdrawn: string
    meetingPending: string
    meetingConfirmed: string
    meetingDeclined: string
    meetingCancelled: string
    dismissNotification: string
    notifications: {
      newIncomingIntro: (name?: string) => string
      introAccepted: (name?: string) => string
      newMeetingInvite: (name?: string) => string
      meetingConfirmed: (name?: string) => string
      meetingCancelled: (name?: string) => string
    }
  }
  organizer: {
    navLabel: string
    title: string
    subtitle: string
    createEventTitle: string
    editEventTitle: string
    eventNameLabel: string
    eventNamePlaceholder: string
    timeZoneLabel: string
    startsAtLabel: string
    endsAtLabel: string
    createEventButton: string
    creatingEvent: string
    saveEventButton: string
    closeEventButton: string
    eventSaved: string
    eventClosedBadge: string
    eventActiveBadge: string
    invitesTitle: string
    createInviteButton: string
    creatingInvite: string
    copyInvite: string
    inviteCopied: string
    revokeInvite: string
    inviteRevoked: string
    inviteExpired: string
    showQr: string
    qrDialogTitle: string
    qrDialogHint: string
    qrClose: string
    qrGenerating: string
    qrUnavailableNotice: string
    noInvites: string
    membersTitle: string
    memberNameCol: string
    memberRoleCol: string
    memberGoalCol: string
    memberVisibilityCol: string
    roleOrganizer: string
    roleParticipant: string
    profileVisible: string
    profileHidden: string
    profileIncomplete: string
    noMembers: string
    memberSearchLabel: string
    memberSearchPlaceholder: string
    clearMemberSearch: string
    noMemberMatches: string
    exportInterestsCsv: string
    boothsTitle: string
    boothNameLabel: string
    boothNamePlaceholder: string
    boothTopicsLabel: string
    boothTopicsPlaceholder: string
    boothDescLabel: string
    boothDescPlaceholder: string
    boothPublishedLabel: string
    addBoothButton: string
    saveBoothButton: string
    editBoothButton: string
    cancelEditButton: string
    publishButton: string
    unpublishButton: string
    statusPublished: string
    statusHidden: string
    noBooths: string
    forbiddenCreate: string
    invalidEventFields: string
    invalidBoothFields: string
  }
  moderation: {
    blockButton: string
    reportButton: string
    reportReasonLabel: string
    reportDetailsLabel: string
    reportDetailsPlaceholder: string
    submitReport: string
    cancelReport: string
    blockedNotice: string
    reportedNotice: string
    interactionBlockedError: string
    reasons: {
      spam: string
      harassment: string
      fake_profile: string
      other: string
    }
    queueTitle: string
    queueSubtitle: string
    queueEmpty: string
    statusOpen: string
    statusResolved: string
    actionRestrict: string
    actionWarn: string
    actionDismiss: string
    resolvedWithAction: (action: string) => string
    supportNotice: string
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
      interests: 'Организатору',
    },
    interestMap: {
      title: 'Карта интересов',
      profileCount: 'Учтено анкет',
      topic: 'Тема',
      participants: 'Участники',
      empty: 'В анкетах пока нет указанных интересов.',
    },
    booths: {
      title: 'Стенды партнёров',
      subtitle: 'Демонстрационная подборка стендов по вашим интересам и навыкам.',
      demoBadge: 'Демо-стенд',
      topicsAriaLabel: 'Совпавшие темы стенда',
      emptyTitle: 'Тематических совпадений по стендам пока нет',
      emptyBody: 'Добавьте больше навыков или интересов в анкете — рекомендации людей выше остаются доступны.',
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
      signInSubtitle: 'Войдите с логином и паролем или создайте аккаунт.',
      inviteNotice: 'После входа вы автоматически вернётесь в мероприятие по вашей ссылке-приглашению.',
      purposeLogin: 'Войти',
      purposeRegister: 'Создать аккаунт',
      usernameLabel: 'Логин',
      passwordLabel: 'Пароль',
      passwordHint: 'Минимум 15 символов. Сохраните пароль в менеджере паролей.',
      authSubmitting: 'Подождите…',
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
      deleteAccount: 'Удалить аккаунт',
      deletingAccount: 'Удаление аккаунта…',
      deleteAccountConfirm: 'Удалить аккаунт и все связанные данные? Это действие необратимо.',
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
        usernameInvalid: 'Логин должен содержать 3–32 латинские буквы, цифры, дефисы или подчёркивания.',
        passwordRequired: 'Введите пароль.',
        passwordTooShort: 'Пароль должен содержать минимум 15 символов.',
        usernameUnavailable: 'Этот логин уже занят.',
        invalidCredentials: 'Неверный логин или пароль.',
        nameRequired: 'Укажите ваше имя.',
        consentRequired: 'Подтвердите согласие на обработку данных анкеты.',
        networkSavePreserved: 'Не удалось сохранить анкету из-за ошибки сети. Введённые данные сохранены на экране — попробуйте снова.',
        networkGeneral: 'Ошибка сети. Проверьте подключение и попробуйте ещё раз.',
        sessionExpired: 'Сессия истекла. Войдите снова — введённые поля сохранены.',
        rateLimited: 'Слишком много запросов. Подождите немного и повторите попытку.',
        genericSave: 'Не удалось сохранить анкету. Введённые данные сохранены на экране.',
        authUnavailable: 'Сервер входа временно недоступен. Вы можете вернуться в демо и попробовать войти позже.',
        genericRequest: 'Произошла ошибка. Попробуйте повторить действие.',
        deleteAccountFailed: 'Не удалось удалить аккаунт. Попробуйте позже.',
      },
      unsaved: {
        title: 'Есть несохранённые изменения анкеты',
        body: 'Если перейти сейчас, изменения в анкете этой вкладки будут отброшены.',
        stayButton: 'Остаться',
        discardButton: 'Отбросить изменения',
        badge: 'Есть несохранённые изменения',
      },
    },
    social: {
      navIntroductions: 'Знакомства',
      navMeetings: 'Встречи',
      refresh: 'Обновить',
      refreshing: 'Обновляем…',
      contactLabel: 'Контакт для обмена',
      contactPlaceholder: '@username, email или телефон',
      contactNotice: 'Ваш контакт для связи и email для входа скрыты от других участников. Контакт откроется собеседнику только после того, как вы оба подтвердите запрос на знакомство.',
      saveContact: 'Сохранить контакт',
      savingContact: 'Сохраняем…',
      contactSaved: 'Контакт сохранён.',
      requestIntro: 'Предложить знакомство',
      requestingIntro: 'Отправляем…',
      alreadyRequested: 'Запрос уже отправлен',
      introTitle: 'Знакомства',
      incomingHeading: 'Входящие запросы',
      outgoingHeading: 'Исходящие запросы',
      noIncoming: 'Пока нет входящих запросов на знакомство.',
      noOutgoing: 'Вы ещё не отправляли запросы на знакомство.',
      accept: 'Принять',
      decline: 'Отклонить',
      withdraw: 'Отозвать',
      sharedContactLabel: 'Контакт собеседника',
      contactNotShared: 'Собеседник пока не указал контакт.',
      proposeMeeting: 'Выбрать время встречи',
      hideSlots: 'Скрыть слоты',
      loadingSlots: 'Загружаем общие слоты…',
      noCommonSlots: 'Нет общих свободных слотов.',
      slotProposed: 'Приглашение на встречу отправлено.',
      slotConflict: 'Этот слот уже занят. Список доступных слотов обновлён — выберите другое время.',
      meetingsTitle: 'Приглашения и встречи 1:1',
      noMeetings: 'Пока нет приглашений и подтверждённых встреч.',
      confirm: 'Подтвердить',
      cancel: 'Отменить',
      statusPending: 'Ожидает ответа',
      statusAccepted: 'Знакомство принято',
      statusDeclined: 'Отклонено',
      statusWithdrawn: 'Отозвано',
      meetingPending: 'Ожидает подтверждения',
      meetingConfirmed: 'Подтверждено',
      meetingDeclined: 'Отклонено',
      meetingCancelled: 'Отменено',
      dismissNotification: 'Скрыть',
      notifications: {
        newIncomingIntro: name => name ? `Новый запрос на знакомство от ${name}.` : 'Поступил новый запрос на знакомство.',
        introAccepted: name => name ? `${name} принял(а) запрос — контакт открыт.` : 'Запрос на знакомство принят — контакт открыт.',
        newMeetingInvite: name => name ? `Новое приглашение на встречу от ${name}.` : 'Поступило новое приглашение на встречу.',
        meetingConfirmed: name => name ? `Встреча с ${name} подтверждена.` : 'Встреча подтверждена.',
        meetingCancelled: name => name ? `Встреча с ${name} отменена.` : 'Встреча отменена.',
      },
    },
    organizer: {
      navLabel: 'Организатор',
      title: 'Кабинет организатора',
      subtitle: 'Управляйте мероприятием, приглашениями, списком участников, картой интересов и стендами.',
      createEventTitle: 'Новое мероприятие',
      editEventTitle: 'Настройки мероприятия',
      eventNameLabel: 'Название события',
      eventNamePlaceholder: 'Например, Qazaq IT Meetup',
      timeZoneLabel: 'Часовой пояс',
      startsAtLabel: 'Начало (UTC ISO)',
      endsAtLabel: 'Окончание (UTC ISO)',
      createEventButton: 'Создать событие',
      creatingEvent: 'Создаём…',
      saveEventButton: 'Сохранить изменения',
      closeEventButton: 'Завершить событие',
      eventSaved: 'Изменения события сохранены.',
      eventClosedBadge: 'Завершено',
      eventActiveBadge: 'Активно',
      invitesTitle: 'Приглашения участников',
      createInviteButton: 'Выпустить приглашение',
      creatingInvite: 'Создаём ссылку…',
      copyInvite: 'Скопировать ссылку',
      inviteCopied: 'Ссылка скопирована',
      revokeInvite: 'Отозвать',
      inviteRevoked: 'Отозвано',
      inviteExpired: 'Истекло',
      showQr: 'Показать QR',
      qrDialogTitle: 'QR-код приглашения',
      qrDialogHint: 'Покажите этот QR с телефона или на экране проектора. Код создан локально в браузере.',
      qrClose: 'Закрыть',
      qrGenerating: 'Формируем QR-код…',
      qrUnavailableNotice: 'Приглашение отозвано или истекло. Сервер отклонит вход даже по ранее сохранённому QR-коду.',
      noInvites: 'Выпустите ссылку-приглашение, чтобы пригласить участников в это событие.',
      membersTitle: 'Участники события',
      memberNameCol: 'Участник',
      memberRoleCol: 'Роль',
      memberGoalCol: 'Цель',
      memberVisibilityCol: 'Видимость',
      roleOrganizer: 'Организатор',
      roleParticipant: 'Участник',
      profileVisible: 'Виден',
      profileHidden: 'Скрыт',
      profileIncomplete: 'Анкета не заполнена',
      noMembers: 'В этом событии пока нет участников.',
      memberSearchLabel: 'Поиск участника по имени',
      memberSearchPlaceholder: 'Поиск по имени…',
      clearMemberSearch: 'Сбросить',
      noMemberMatches: 'По этому запросу участников не найдено.',
      exportInterestsCsv: 'Скачать CSV',
      boothsTitle: 'Стенды партнёров события',
      boothNameLabel: 'Название стенда',
      boothNamePlaceholder: 'Например, Сообщество Go',
      boothTopicsLabel: 'Темы (через запятую)',
      boothTopicsPlaceholder: 'Go, Backend, Cloud',
      boothDescLabel: 'Краткое описание',
      boothDescPlaceholder: 'О чём можно поговорить на стенде?',
      boothPublishedLabel: 'Опубликовать сразу',
      addBoothButton: 'Добавить стенд',
      saveBoothButton: 'Сохранить стенд',
      editBoothButton: 'Изменить',
      cancelEditButton: 'Отмена',
      publishButton: 'Опубликовать',
      unpublishButton: 'Снять с публикации',
      statusPublished: 'Опубликован',
      statusHidden: 'Снят с публикации',
      noBooths: 'В этом событии пока нет стендов.',
      forbiddenCreate: 'Создание мероприятий доступно аккаунтам с ролью организатора.',
      invalidEventFields: 'Укажите название события и корректный интервал времени.',
      invalidBoothFields: 'Укажите название стенда и хотя бы одну тему.',
    },
    moderation: {
      blockButton: 'Заблокировать',
      reportButton: 'Пожаловаться',
      reportReasonLabel: 'Причина обращения',
      reportDetailsLabel: 'Комментарий (необязательно)',
      reportDetailsPlaceholder: 'Опишите ситуацию для организатора',
      submitReport: 'Отправить жалобу',
      cancelReport: 'Отмена',
      blockedNotice: 'Участник заблокирован и скрыт из вашего подбора. Новые запросы и встречи между вами отключены.',
      reportedNotice: 'Жалоба отправлена организатору мероприятия. Ваше имя скрыто от второй стороны.',
      interactionBlockedError: 'Взаимодействие с этим участником недоступно из-за блокировки или ограничения организатора.',
      reasons: {
        spam: 'Спам или навязчивая реклама',
        harassment: 'Некорректное поведение',
        fake_profile: 'Ложная анкета',
        other: 'Другое',
      },
      queueTitle: 'Очередь жалоб и модерация',
      queueSubtitle: 'Закрытая очередь обращений этого события. Действия модератора фиксируются с временем и исполнителем.',
      queueEmpty: 'Открытых жалоб в этом событии нет.',
      statusOpen: 'На рассмотрении',
      statusResolved: 'Рассмотрено',
      actionRestrict: 'Ограничить в событии',
      actionWarn: 'Предупредить',
      actionDismiss: 'Отклонить жалобу',
      resolvedWithAction: action => `Решение: ${action}`,
      supportNotice: 'Поддержка и обращения по безопасности: напишите организатору события или на support@tanys.kz (ответ до 5 рабочих дней).',
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
      interests: 'Ұйымдастырушыға',
    },
    interestMap: {
      title: 'Қызығушылықтар картасы',
      profileCount: 'Есепке алынған анкеталар',
      topic: 'Тақырып',
      participants: 'Қатысушылар',
      empty: 'Анкеталарда қызығушылықтар әлі көрсетілмеген.',
    },
    booths: {
      title: 'Серіктес стендтері',
      subtitle: 'Қызығушылықтарыңыз бен дағдыларыңызға сәйкес демонстрациялық стендтер.',
      demoBadge: 'Демо-стенд',
      topicsAriaLabel: 'Стендтің сәйкес тақырыптары',
      emptyTitle: 'Стендтер бойынша тақырыптық сәйкестік табылмады',
      emptyBody: 'Анкетаға қосымша дағдылар немесе қызығушылықтар қосыңыз — жоғарыдағы адамдар ұсынымы сақталады.',
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
      signInSubtitle: 'Логин мен құпиясөзді енгізіңіз немесе аккаунт ашыңыз.',
      inviteNotice: 'Кіргеннен кейін сіз шақыру сілтемесіндегі іс-шараға автоматты түрде ораласыз.',
      purposeLogin: 'Кіру',
      purposeRegister: 'Аккаунт ашу',
      usernameLabel: 'Логин',
      passwordLabel: 'Құпиясөз',
      passwordHint: 'Кемінде 15 таңба. Құпиясөзді құпиясөздер менеджеріне сақтаңыз.',
      authSubmitting: 'Күте тұрыңыз…',
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
      deleteAccount: 'Аккаунтты өшіру',
      deletingAccount: 'Аккаунт өшірілуде…',
      deleteAccountConfirm: 'Аккаунтты және барлық байланысты деректерді өшіруді растайсыз ба? Бұл әрекетті қайтару мүмкін емес.',
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
        usernameInvalid: 'Логинге 3–32 латын әрпін, цифр, дефис немесе астыңғы сызық енгізіңіз.',
        passwordRequired: 'Құпиясөзді енгізіңіз.',
        passwordTooShort: 'Құпиясөз кемінде 15 таңбадан тұруы керек.',
        usernameUnavailable: 'Бұл логин бос емес.',
        invalidCredentials: 'Логин немесе құпиясөз қате.',
        nameRequired: 'Атыңызды көрсетіңіз.',
        consentRequired: 'Сауалнама деректерін өңдеуге келісімді растаңыз.',
        networkSavePreserved: 'Желі қатесіне байланысты анкетаны сақтау мүмкін болмады. Енгізілген деректер экранда сақталды — қайта көріңіз.',
        networkGeneral: 'Желі қатесі. Қосылымды тексеріп, қайта көріңіз.',
        sessionExpired: 'Сессия мерзімі аяқталды. Қайта кіріңіз — енгізілген өрістер сақталды.',
        rateLimited: 'Сұраулар тым көп. Сәл күтіп, қайта көріңіз.',
        genericSave: 'Анкетаны сақтау мүмкін болмады. Енгізілген деректер экранда сақталды.',
        authUnavailable: 'Кіру сервері уақытша қолжетімсіз. Демоға оралып, кейінірек қайта кіріп көріңіз.',
        genericRequest: 'Қате орын алды. Әрекетті қайталап көріңіз.',
        deleteAccountFailed: 'Аккаунтты өшіру мүмкін болмады. Кейінірек қайталап көріңіз.',
      },
      unsaved: {
        title: 'Анкетада сақталмаған өзгерістер бар',
        body: 'Қазір басқа бөлімге өтсеңіз, осы қойындыдағы өзгерістер сақталмайды.',
        stayButton: 'Қалу',
        discardButton: 'Өзгерістерден бас тарту',
        badge: 'Сақталмаған өзгерістер бар',
      },
    },
    social: {
      navIntroductions: 'Танысулар',
      navMeetings: 'Кездесулер',
      refresh: 'Жаңарту',
      refreshing: 'Жаңартылуда…',
      contactLabel: 'Алмасуға арналған байланыс',
      contactPlaceholder: '@username, email немесе телефон',
      contactNotice: 'Байланыс дерегіңіз бен кіруге арналған email басқа қатысушылардан жасырылады. Байланыс екі тарап та танысу сұрауын растағаннан кейін ғана ашылады.',
      saveContact: 'Байланысты сақтау',
      savingContact: 'Сақталуда…',
      contactSaved: 'Байланыс сақталды.',
      requestIntro: 'Танысуды ұсыну',
      requestingIntro: 'Жіберілуде…',
      alreadyRequested: 'Сұрау жіберілген',
      introTitle: 'Танысулар',
      incomingHeading: 'Кіріс сұраулар',
      outgoingHeading: 'Шығыс сұраулар',
      noIncoming: 'Әзірге кіріс танысу сұраулары жоқ.',
      noOutgoing: 'Сіз әлі танысу сұрауын жіберген жоқсыз.',
      accept: 'Қабылдау',
      decline: 'Бас тарту',
      withdraw: 'Қайтарып алу',
      sharedContactLabel: 'Қатысушы байланысы',
      contactNotShared: 'Қатысушы әлі байланыс дерегін көрсетпеген.',
      proposeMeeting: 'Кездесу уақытын таңдау',
      hideSlots: 'Слоттарды жасыру',
      loadingSlots: 'Ортақ слоттар жүктелуде…',
      noCommonSlots: 'Ортақ бос слоттар жоқ.',
      slotProposed: 'Кездесуге шақыру жіберілді.',
      slotConflict: 'Бұл уақыт бос емес. Қолжетімді слоттар жаңартылды — басқа уақытты таңдаңыз.',
      meetingsTitle: '1:1 шақырулар және кездесулер',
      noMeetings: 'Әзірге шақырулар мен расталған кездесулер жоқ.',
      confirm: 'Растау',
      cancel: 'Болдырмау',
      statusPending: 'Жауап күтілуде',
      statusAccepted: 'Танысу қабылданды',
      statusDeclined: 'Қабылданбады',
      statusWithdrawn: 'Қайтарып алынды',
      meetingPending: 'Растауды күтуде',
      meetingConfirmed: 'Расталды',
      meetingDeclined: 'Бас тартылды',
      meetingCancelled: 'Болдырылмады',
      dismissNotification: 'Жасыру',
      notifications: {
        newIncomingIntro: name => name ? `${name} қатысушысынан жаңа танысу сұрауы келді.` : 'Жаңа танысу сұрауы келді.',
        introAccepted: name => name ? `${name} сұрауды қабылдады — байланыс ашылды.` : 'Танысу сұрауы қабылданды — байланыс ашылды.',
        newMeetingInvite: name => name ? `${name} кездесуге шақырды.` : 'Жаңа кездесу шақыруы келді.',
        meetingConfirmed: name => name ? `${name} қатысушысымен кездесу расталды.` : 'Кездесу расталды.',
        meetingCancelled: name => name ? `${name} қатысушысымен кездесу болдырылмады.` : 'Кездесу болдырылмады.',
      },
    },
    organizer: {
      navLabel: 'Ұйымдастырушы',
      title: 'Ұйымдастырушы кабинеті',
      subtitle: 'Іс-шараны, шақыруларды, қатысушылар тізімін, қызығушылықтар картасын және стендтерді басқарыңыз.',
      createEventTitle: 'Жаңа іс-шара',
      editEventTitle: 'Іс-шара баптаулары',
      eventNameLabel: 'Іс-шара атауы',
      eventNamePlaceholder: 'Мысалы, Qazaq IT Meetup',
      timeZoneLabel: 'Уақыт белдеуі',
      startsAtLabel: 'Басталуы (UTC ISO)',
      endsAtLabel: 'Аяқталуы (UTC ISO)',
      createEventButton: 'Іс-шара құру',
      creatingEvent: 'Құрылуда…',
      saveEventButton: 'Өзгерістерді сақтау',
      closeEventButton: 'Іс-шараны аяқтау',
      eventSaved: 'Іс-шара өзгерістері сақталды.',
      eventClosedBadge: 'Аяқталды',
      eventActiveBadge: 'Белсенді',
      invitesTitle: 'Қатысушыларға шақырулар',
      createInviteButton: 'Шақыру шығару',
      creatingInvite: 'Сілтеме жасалуда…',
      copyInvite: 'Сілтемені көшіру',
      inviteCopied: 'Сілтеме көшірілді',
      revokeInvite: 'Қайтарып алу',
      inviteRevoked: 'Қайтарып алынды',
      inviteExpired: 'Мерзімі өтті',
      showQr: 'QR көрсету',
      qrDialogTitle: 'Шақыру QR-коды',
      qrDialogHint: 'Бұл QR-кодты телефоннан немесе проектордан көрсетіңіз. Код браузерде жергілікті жасалды.',
      qrClose: 'Жабу',
      qrGenerating: 'QR-код жасалуда…',
      qrUnavailableNotice: 'Шақыру қайтарып алынған немесе мерзімі өткен. Ескі QR-кодпен де кіруді сервер қабылдамайды.',
      noInvites: 'Қатысушыларды шақыру үшін шақыру сілтемесін шығарыңыз.',
      membersTitle: 'Іс-шара қатысушылары',
      memberNameCol: 'Қатысушы',
      memberRoleCol: 'Рөл',
      memberGoalCol: 'Мақсат',
      memberVisibilityCol: 'Көрінуі',
      roleOrganizer: 'Ұйымдастырушы',
      roleParticipant: 'Қатысушы',
      profileVisible: 'Көрінеді',
      profileHidden: 'Жасырын',
      profileIncomplete: 'Анкета толтырылмаған',
      noMembers: 'Бұл іс-шарада әлі қатысушылар жоқ.',
      memberSearchLabel: 'Қатысушыны аты бойынша іздеу',
      memberSearchPlaceholder: 'Аты бойынша іздеу…',
      clearMemberSearch: 'Тазарту',
      noMemberMatches: 'Бұл сұрау бойынша қатысушылар табылмады.',
      exportInterestsCsv: 'CSV жүктеу',
      boothsTitle: 'Іс-шара серіктес стендтері',
      boothNameLabel: 'Стенд атауы',
      boothNamePlaceholder: 'Мысалы, Go қауымдастығы',
      boothTopicsLabel: 'Тақырыптар (үтір арқылы)',
      boothTopicsPlaceholder: 'Go, Backend, Cloud',
      boothDescLabel: 'Қысқаша сипаттама',
      boothDescPlaceholder: 'Стендте не туралы сөйлесуге болады?',
      boothPublishedLabel: 'Бірден жариялау',
      addBoothButton: 'Стенд қосу',
      saveBoothButton: 'Стендті сақтау',
      editBoothButton: 'Өзгерту',
      cancelEditButton: 'Болдырмау',
      publishButton: 'Жариялау',
      unpublishButton: 'Жарияланымнан алу',
      statusPublished: 'Жарияланған',
      statusHidden: 'Жарияланбаған',
      noBooths: 'Бұл іс-шарада әлі стендтер жоқ.',
      forbiddenCreate: 'Іс-шара құру тек ұйымдастырушы рөлі бар аккаунттарға қолжетімді.',
      invalidEventFields: 'Іс-шара атауын және дұрыс уақыт аралығын көрсетіңіз.',
      invalidBoothFields: 'Стенд атауын және кемінде бір тақырыпты көрсетіңіз.',
    },
    moderation: {
      blockButton: 'Бұғаттау',
      reportButton: 'Шағымдану',
      reportReasonLabel: 'Шағым себебі',
      reportDetailsLabel: 'Түсініктеме (міндетті емес)',
      reportDetailsPlaceholder: 'Ұйымдастырушыға жағдайды қысқаша сипаттаңыз',
      submitReport: 'Шағым жіберу',
      cancelReport: 'Болдырмау',
      blockedNotice: 'Қатысушы бұғатталды және ұсыныстардан жасырылды. Жаңа сұраулар мен кездесулер өшірілді.',
      reportedNotice: 'Шағым іс-шара ұйымдастырушысына жіберілді. Сіздің атыңыз екінші тараптан жасырылады.',
      interactionBlockedError: 'Бұғаттау немесе ұйымдастырушы шектеуіне байланысты бұл қатысушымен байланыс қолжетімсіз.',
      reasons: {
        spam: 'Спам немесе жарнама',
        harassment: 'Орынсыз мінез-құлық',
        fake_profile: 'Жалған анкета',
        other: 'Басқа',
      },
      queueTitle: 'Шағымдар кезегі және модерация',
      queueSubtitle: 'Осы іс-шараның жабық шағымдар кезегі. Модератор әрекеттері уақытымен тіркеледі.',
      queueEmpty: 'Бұл іс-шарада ашық шағымдар жоқ.',
      statusOpen: 'Қаралуда',
      statusResolved: 'Қаралды',
      actionRestrict: 'Іс-шарада шектеу',
      actionWarn: 'Ескерту',
      actionDismiss: 'Шағымды қабылдамау',
      resolvedWithAction: action => `Шешім: ${action}`,
      supportNotice: 'Қолдау және қауіпсіздік бойынша: іс-шара ұйымдастырушысына немесе support@tanys.kz поштасына жазыңыз.',
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
      interests: 'Organizer',
    },
    interestMap: {
      title: 'Interest map',
      profileCount: 'Profiles counted',
      topic: 'Topic',
      participants: 'Participants',
      empty: 'The profiles do not list any interests yet.',
    },
    booths: {
      title: 'Partner booths',
      subtitle: 'Demonstration booths matched to your skills and interests.',
      demoBadge: 'Demo booth',
      topicsAriaLabel: 'Matched booth topics',
      emptyTitle: 'No thematic booth matches yet',
      emptyBody: 'Add more skills or interests to your profile — your people matches above stay unchanged.',
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
      signInSubtitle: 'Sign in with your username and password or create an account.',
      inviteNotice: 'After signing in, you will return directly to the event from your invite link.',
      purposeLogin: 'Sign in',
      purposeRegister: 'Create account',
      usernameLabel: 'Username',
      passwordLabel: 'Password',
      passwordHint: 'Use at least 15 characters and save your password in a password manager.',
      authSubmitting: 'Please wait…',
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
      deleteAccount: 'Delete account',
      deletingAccount: 'Deleting account…',
      deleteAccountConfirm: 'Delete account and all associated data? This action cannot be undone.',
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
        usernameInvalid: 'Use 3–32 Latin letters, digits, hyphens, or underscores for the username.',
        passwordRequired: 'Enter your password.',
        passwordTooShort: 'Use a password with at least 15 characters.',
        usernameUnavailable: 'This username is already taken.',
        invalidCredentials: 'Incorrect username or password.',
        nameRequired: 'Enter your name.',
        consentRequired: 'Please accept the profile data processing notice.',
        networkSavePreserved: 'Could not save your profile due to a network error. Your input is preserved on screen — please retry.',
        networkGeneral: 'Network error. Check your connection and try again.',
        sessionExpired: 'Your session expired. Sign in again — your entered fields are preserved.',
        rateLimited: 'Too many requests. Please wait a moment and try again.',
        genericSave: 'Could not save your profile. Your entered fields are preserved on screen.',
        authUnavailable: 'Sign-in is temporarily unavailable. Return to the demo or try signing in later.',
        genericRequest: 'Something went wrong. Please try again.',
        deleteAccountFailed: 'Failed to delete account. Please try again later.',
      },
      unsaved: {
        title: 'You have unsaved profile changes',
        body: 'If you leave now, your edits in this tab will be discarded.',
        stayButton: 'Stay',
        discardButton: 'Discard changes',
        badge: 'Unsaved changes',
      },
    },
    social: {
      navIntroductions: 'Introductions',
      navMeetings: 'Meetings',
      refresh: 'Refresh',
      refreshing: 'Refreshing…',
      contactLabel: 'Contact to share',
      contactPlaceholder: '@username, email, or phone',
      contactNotice: 'Your contact details and sign-in email stay hidden from other participants. Your contact is shared with a match only after both of you accept the introduction request.',
      saveContact: 'Save contact',
      savingContact: 'Saving…',
      contactSaved: 'Contact saved.',
      requestIntro: 'Request introduction',
      requestingIntro: 'Sending…',
      alreadyRequested: 'Request already sent',
      introTitle: 'Introductions',
      incomingHeading: 'Incoming requests',
      outgoingHeading: 'Outgoing requests',
      noIncoming: 'No incoming introduction requests yet.',
      noOutgoing: 'You have not sent any introduction requests yet.',
      accept: 'Accept',
      decline: 'Decline',
      withdraw: 'Withdraw',
      sharedContactLabel: 'Shared contact',
      contactNotShared: 'Participant has not added a contact yet.',
      proposeMeeting: 'Choose meeting time',
      hideSlots: 'Hide slots',
      loadingSlots: 'Loading common slots…',
      noCommonSlots: 'No common free slots available.',
      slotProposed: 'Meeting invite sent.',
      slotConflict: 'This slot is already taken. Available slots were refreshed — pick another time.',
      meetingsTitle: '1:1 invites & meetings',
      noMeetings: 'No meeting invites or confirmed meetings yet.',
      confirm: 'Confirm',
      cancel: 'Cancel',
      statusPending: 'Pending',
      statusAccepted: 'Accepted',
      statusDeclined: 'Declined',
      statusWithdrawn: 'Withdrawn',
      meetingPending: 'Awaiting confirmation',
      meetingConfirmed: 'Confirmed',
      meetingDeclined: 'Declined',
      meetingCancelled: 'Cancelled',
      dismissNotification: 'Dismiss',
      notifications: {
        newIncomingIntro: name => name ? `New introduction request from ${name}.` : 'You have a new introduction request.',
        introAccepted: name => name ? `${name} accepted your request — contact is now visible.` : 'Introduction accepted — contact is now visible.',
        newMeetingInvite: name => name ? `New 1:1 meeting invite from ${name}.` : 'You received a new 1:1 meeting invite.',
        meetingConfirmed: name => name ? `Meeting with ${name} is confirmed.` : 'Meeting confirmed.',
        meetingCancelled: name => name ? `Meeting with ${name} was cancelled.` : 'Meeting cancelled.',
      },
    },
    organizer: {
      navLabel: 'Organizer',
      title: 'Organizer cabinet',
      subtitle: 'Manage event settings, invites, participants, real interest aggregates, and booths.',
      createEventTitle: 'New event',
      editEventTitle: 'Event settings',
      eventNameLabel: 'Event name',
      eventNamePlaceholder: 'e.g. Qazaq IT Meetup',
      timeZoneLabel: 'Time zone',
      startsAtLabel: 'Starts at (UTC ISO)',
      endsAtLabel: 'Ends at (UTC ISO)',
      createEventButton: 'Create event',
      creatingEvent: 'Creating…',
      saveEventButton: 'Save changes',
      closeEventButton: 'Close event',
      eventSaved: 'Event changes saved.',
      eventClosedBadge: 'Closed',
      eventActiveBadge: 'Active',
      invitesTitle: 'Participant invites',
      createInviteButton: 'Issue invite link',
      creatingInvite: 'Issuing…',
      copyInvite: 'Copy link',
      inviteCopied: 'Link copied',
      revokeInvite: 'Revoke',
      inviteRevoked: 'Revoked',
      inviteExpired: 'Expired',
      showQr: 'Show QR',
      qrDialogTitle: 'Invite QR code',
      qrDialogHint: 'Display this QR on a phone or projector. Generated locally in your browser.',
      qrClose: 'Close',
      qrGenerating: 'Generating QR code…',
      qrUnavailableNotice: 'This invite was revoked or expired. Even a previously saved QR screenshot will be rejected by the server.',
      noInvites: 'Issue an invite link to invite participants into this event.',
      membersTitle: 'Event participants',
      memberNameCol: 'Participant',
      memberRoleCol: 'Role',
      memberGoalCol: 'Goal',
      memberVisibilityCol: 'Visibility',
      roleOrganizer: 'Organizer',
      roleParticipant: 'Participant',
      profileVisible: 'Visible',
      profileHidden: 'Hidden',
      profileIncomplete: 'Profile not filled',
      noMembers: 'No participants in this event yet.',
      memberSearchLabel: 'Search participant by name',
      memberSearchPlaceholder: 'Search by name…',
      clearMemberSearch: 'Clear',
      noMemberMatches: 'No participants match this search.',
      exportInterestsCsv: 'Export CSV',
      boothsTitle: 'Partner booths',
      boothNameLabel: 'Booth name',
      boothNamePlaceholder: 'e.g. Go Community',
      boothTopicsLabel: 'Topics (comma-separated)',
      boothTopicsPlaceholder: 'Go, Backend, Cloud',
      boothDescLabel: 'Short description',
      boothDescPlaceholder: 'What can participants discuss at this booth?',
      boothPublishedLabel: 'Publish immediately',
      addBoothButton: 'Add booth',
      saveBoothButton: 'Save booth',
      editBoothButton: 'Edit',
      cancelEditButton: 'Cancel',
      publishButton: 'Publish',
      unpublishButton: 'Unpublish',
      statusPublished: 'Published',
      statusHidden: 'Unpublished',
      noBooths: 'No booths in this event yet.',
      forbiddenCreate: 'Only accounts with the organizer role can create events.',
      invalidEventFields: 'Enter an event name and a valid start/end interval.',
      invalidBoothFields: 'Enter a booth name and at least one topic.',
    },
    moderation: {
      blockButton: 'Block',
      reportButton: 'Report',
      reportReasonLabel: 'Reason',
      reportDetailsLabel: 'Details (optional)',
      reportDetailsPlaceholder: 'Briefly describe the issue for the organizer',
      submitReport: 'Submit report',
      cancelReport: 'Cancel',
      blockedNotice: 'Participant blocked and removed from your matches. Future requests and meetings are disabled.',
      reportedNotice: 'Report sent to the event organizer. Your identity stays hidden from the reported participant.',
      interactionBlockedError: 'Interaction with this participant is unavailable due to a block or organizer restriction.',
      reasons: {
        spam: 'Spam or unsolicited promotion',
        harassment: 'Harassment or misconduct',
        fake_profile: 'Fake profile',
        other: 'Other',
      },
      queueTitle: 'Moderation & reports queue',
      queueSubtitle: 'Private queue for this event. Moderator decisions are recorded with actor and timestamp.',
      queueEmpty: 'No reports in this event.',
      statusOpen: 'Open',
      statusResolved: 'Resolved',
      actionRestrict: 'Restrict in event',
      actionWarn: 'Warn',
      actionDismiss: 'Dismiss',
      resolvedWithAction: action => `Action: ${action}`,
      supportNotice: 'Safety & support channel: contact the event organizer or email support@tanys.kz (response within 5 business days).',
    },
  },
}

export function getMessages(locale: Locale = 'ru'): Messages {
  return messagesByLocale[locale]
}
