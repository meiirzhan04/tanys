import type { Locale } from '../../matching/types'

export interface IdentityCopy {
  handleTitle: string
  handleNone: string
  handleHint: string
  handleLabel: string
  handleRules: string
  handleErrors: Record<'invalid_handle' | 'handle_reserved' | 'handle_unavailable', string>
  contactTitle: string
  contactNone: string
  contactLock: string
  contactLabel: string
  contactPlaceholder: string
  contactHelpSummary: string
  contactHelp: string
  contactError: string
  edit: string
  editHandle: string
  editContact: string
  save: string
  cancel: string
  remove: string
  genericError: string
}

export const identityCopy: Record<Locale, IdentityCopy> = {
  ru: {
    handleTitle: 'Публичный username',
    handleNone: 'Не задан — вас нельзя найти поиском',
    handleHint: 'По нему вас находят участники мероприятий',
    handleLabel: 'Username',
    handleRules: '3–32 символа: латиница, цифры, «_» и «-». Логин для входа не меняется.',
    handleErrors: {
      invalid_handle: 'Используйте 3–32 символа: латиница, цифры, «_» или «-».',
      handle_reserved: 'Это имя зарезервировано. Выберите другое.',
      handle_unavailable: 'Этот username уже занят.',
    },
    contactTitle: 'Контакт для связи',
    contactNone: 'Не добавлен',
    contactLock: 'Увидят только после взаимного подтверждения',
    contactLabel: 'Контакт',
    contactPlaceholder: '@telegram, email или ссылка',
    contactHelpSummary: 'Кто видит контакт?',
    contactHelp: 'Контакт видите только вы, пока вы и собеседник оба не подтвердите знакомство. Email для входа другим участникам никогда не показывается, если вы не укажете его здесь сами.',
    contactError: 'Контакт не сохранён: уберите угловые скобки и ссылки вида javascript:.',
    edit: 'Изменить',
    editHandle: 'Изменить username',
    editContact: 'Изменить контакт',
    save: 'Сохранить',
    cancel: 'Отмена',
    remove: 'Удалить контакт',
    genericError: 'Не удалось сохранить. Попробуйте ещё раз.',
  },
  kk: {
    handleTitle: 'Жария username',
    handleNone: 'Көрсетілмеген — сізді іздеу арқылы таба алмайды',
    handleHint: 'Іс-шара қатысушылары сізді осы арқылы табады',
    handleLabel: 'Username',
    handleRules: '3–32 таңба: латын әріптері, сандар, «_» және «-». Кіру логині өзгермейді.',
    handleErrors: {
      invalid_handle: '3–32 таңба қолданыңыз: латын әріптері, сандар, «_» немесе «-».',
      handle_reserved: 'Бұл атау резервте. Басқасын таңдаңыз.',
      handle_unavailable: 'Бұл username бос емес.',
    },
    contactTitle: 'Байланыс',
    contactNone: 'Қосылмаған',
    contactLock: 'Тек өзара растаудан кейін көреді',
    contactLabel: 'Байланыс',
    contactPlaceholder: '@telegram, email немесе сілтеме',
    contactHelpSummary: 'Байланысты кім көреді?',
    contactHelp: 'Сіз де, әңгімелесуші де танысуды растамайынша, байланысты тек сіз көресіз. Кіруге арналған email-ді осында өзіңіз көрсетпесеңіз, басқа қатысушыларға ешқашан көрінбейді.',
    contactError: 'Байланыс сақталмады: бұрыштық жақшаларды және javascript: сілтемелерін алып тастаңыз.',
    edit: 'Өзгерту',
    editHandle: 'Username өзгерту',
    editContact: 'Байланысты өзгерту',
    save: 'Сақтау',
    cancel: 'Болдырмау',
    remove: 'Байланысты жою',
    genericError: 'Сақтау мүмкін болмады. Қайталап көріңіз.',
  },
  en: {
    handleTitle: 'Public username',
    handleNone: 'Not set — people cannot find you in search',
    handleHint: 'Event participants find you by it',
    handleLabel: 'Username',
    handleRules: '3–32 characters: Latin letters, digits, “_” and “-”. Your sign-in login stays the same.',
    handleErrors: {
      invalid_handle: 'Use 3–32 characters: Latin letters, digits, “_” or “-”.',
      handle_reserved: 'This name is reserved. Choose another one.',
      handle_unavailable: 'This username is already taken.',
    },
    contactTitle: 'Contact',
    contactNone: 'Not added',
    contactLock: 'Shown only after you both agree',
    contactLabel: 'Contact',
    contactPlaceholder: '@telegram, email or link',
    contactHelpSummary: 'Who sees my contact?',
    contactHelp: 'Only you see the contact until you and the other person both accept the introduction. Your sign-in email is never shown to other participants unless you add it here yourself.',
    contactError: 'Contact not saved: remove angle brackets and javascript: links.',
    edit: 'Edit',
    editHandle: 'Edit username',
    editContact: 'Edit contact',
    save: 'Save',
    cancel: 'Cancel',
    remove: 'Remove contact',
    genericError: 'Could not save. Please try again.',
  },
}
