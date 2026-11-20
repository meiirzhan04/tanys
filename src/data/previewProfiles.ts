import type { Candidate, ProfileInput } from '../matching/types'

export const sampleProfile: ProfileInput = {
  role: 'Backend-разработчик',
  skills: ['Python', 'FastAPI', 'PostgreSQL'],
  experienceYears: 0,
  interests: ['API', 'Стартапы'],
  about: 'Делаю учебные проекты на Python и ищу первую стажировку в backend.',
  goal: 'find_job',
}

type PreviewProfile = [id: string, name: string, role: string, goal: Candidate['goal'], experience: number, skills: string[], interests: string[], lookingFor?: string[]]

const examples: PreviewProfile[] = [
  ['preview-01', 'Айгерим Садыкова', 'Технический рекрутер', 'hire', 5, ['Подбор'], ['API'], ['Python', 'PostgreSQL']],
  ['preview-02', 'Арман Нурланов', 'Backend Lead', 'hire', 8, ['Python', 'FastAPI'], ['Стартапы'], ['Python', 'FastAPI']],
  ['preview-03', 'Мадина Турсунова', 'Инженерный менеджер', 'hire', 6, ['Python', 'SQL'], ['API'], ['Python', 'SQL']],
  ['preview-04', 'Тимур Абдиев', 'Руководитель платформы', 'hire', 7, ['Go', 'PostgreSQL'], ['DevOps'], ['PostgreSQL', 'Go']],
  ['preview-05', 'Жанна Омарова', 'Data Engineer', 'hire', 4, ['Python', 'Airflow'], ['Data'], ['Python', 'Airflow']],
  ['preview-06', 'Аскар Ибраев', 'Тимлид мобильной команды', 'hire', 9, ['Kotlin', 'Android'], ['Mobile'], ['Kotlin']],
  ['preview-07', 'Адина Муратова', 'Frontend-разработчик', 'be_mentor', 6, ['React', 'TypeScript'], ['Дизайн-системы']],
  ['preview-08', 'Алишер Ниязов', 'Студент', 'find_mentor', 0, ['React', 'CSS'], ['Дизайн-системы']],
  ['preview-09', 'Сабина Ким', 'Продуктовый дизайнер', 'find_cofounder', 4, ['Figma', 'Исследования'], ['Стартапы'], ['React', 'Python']],
  ['preview-10', 'Нурали Сейдахмет', 'Backend-разработчик', 'exchange_experience', 3, ['Python', 'Docker'], ['API', 'DevOps']],
]

export const previewProfiles: Candidate[] = examples.map(([id, name, role, goal, experienceYears, skills, interests, lookingFor]) => ({
  id, name, role, goal, experienceYears, skills, interests, lookingFor, about: '',
}))
