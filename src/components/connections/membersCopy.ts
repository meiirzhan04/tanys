import type { Locale } from '../../matching/types'

export interface MembersCopy {
  title: string
  count: (total: number, filtered: boolean) => string
  loading: string
  searchPlaceholder: string
  goalFilter: string
  statusFilter: string
  anyGoal: string
  anyStatus: string
  error: string
  retry: string
  emptyHint: string
  showMore: string
}

const ru = (n: number, forms: readonly [string, string, string]) => {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return forms[0]
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1]
  return forms[2]
}

export const membersCopy: Record<Locale, MembersCopy> = {
  ru: {
    title: 'Участники',
    count: (total, filtered) => `${filtered ? 'Найдено' : 'Всего'} ${total} ${ru(total, ['участник', 'участника', 'участников'])}`,
    loading: 'Загружаем…',
    searchPlaceholder: 'Имя или @username',
    goalFilter: 'Фильтр по цели',
    statusFilter: 'Фильтр по статусу анкеты',
    anyGoal: 'Все цели',
    anyStatus: 'Любой статус',
    error: 'Не удалось загрузить участников.',
    retry: 'Повторить',
    emptyHint: 'Поделитесь приглашением — новые участники появятся здесь автоматически.',
    showMore: 'Показать ещё',
  },
  kk: {
    title: 'Қатысушылар',
    count: (total, filtered) => `${filtered ? 'Табылды' : 'Барлығы'}: ${total} қатысушы`,
    loading: 'Жүктелуде…',
    searchPlaceholder: 'Аты немесе @username',
    goalFilter: 'Мақсат бойынша сүзгі',
    statusFilter: 'Анкета мәртебесі бойынша сүзгі',
    anyGoal: 'Барлық мақсат',
    anyStatus: 'Кез келген мәртебе',
    error: 'Қатысушыларды жүктеу мүмкін болмады.',
    retry: 'Қайталау',
    emptyHint: 'Шақыруды бөлісіңіз — жаңа қатысушылар осында автоматты түрде шығады.',
    showMore: 'Тағы көрсету',
  },
  en: {
    title: 'Participants',
    count: (total, filtered) => `${filtered ? 'Found' : 'Total'} ${total} ${total === 1 ? 'participant' : 'participants'}`,
    loading: 'Loading…',
    searchPlaceholder: 'Name or @username',
    goalFilter: 'Filter by goal',
    statusFilter: 'Filter by profile status',
    anyGoal: 'All goals',
    anyStatus: 'Any status',
    error: 'Could not load participants.',
    retry: 'Retry',
    emptyHint: 'Share an invite — new participants show up here automatically.',
    showMore: 'Show more',
  },
}
