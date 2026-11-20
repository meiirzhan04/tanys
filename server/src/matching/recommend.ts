import type { Candidate, Goal, Locale, ProfileInput, Recommendation } from './types.js'

const reciprocalGoals: Record<Goal, Goal> = {
  find_job: 'hire',
  hire: 'find_job',
  find_mentor: 'be_mentor',
  be_mentor: 'find_mentor',
  find_cofounder: 'find_cofounder',
  exchange_experience: 'exchange_experience',
}

interface RecommendationTemplates {
  goalReasons: Record<Goal, string>
  icebreakerQuestions: Record<Goal, string>
  candidateNeeds: (items: string) => string
  participantNeeds: (items: string) => string
  sharedSkills: (items: string) => string
  moreExperienced: string
  lessExperienced: string
  sharedInterests: (items: string) => string
  joinExplanation: (goalReason: string, details: string) => string
  formatIcebreaker: (name: string, detail: string, question: string) => string
}

const templatesByLocale: Record<Locale, RecommendationTemplates> = {
  ru: {
    goalReasons: {
      find_job: 'Вы ищете работу, а этот участник нанимает.',
      hire: 'Вы нанимаете, а этот участник ищет работу.',
      find_mentor: 'Вы ищете ментора, а этот участник готов делиться опытом.',
      be_mentor: 'Вы готовы быть ментором, а этот участник ищет наставника.',
      find_cofounder: 'Вы оба ищете кофаундера.',
      exchange_experience: 'Вы оба хотите обменяться опытом.',
    },
    icebreakerQuestions: {
      find_job: 'Какие задачи сейчас есть в вашей команде?',
      hire: 'О каких проектах вам хотелось бы поговорить?',
      find_mentor: 'С чего вы посоветуете начать, чтобы развиваться в этом направлении?',
      be_mentor: 'Какая задача у вас сейчас вызывает больше всего вопросов?',
      find_cofounder: 'Какой проект вы хотели бы запустить и какую роль взять на себя?',
      exchange_experience: 'Каким опытом в этой области вам было бы интересно поделиться?',
    },
    candidateNeeds: items => `из ваших навыков участник ищет ${items}`,
    participantNeeds: items => `у участника есть нужные вам навыки: ${items}`,
    sharedSkills: items => `общие навыки: ${items}`,
    moreExperienced: 'у ментора больше лет опыта',
    lessExperienced: 'у будущего менти меньше лет опыта',
    sharedInterests: items => `общие интересы: ${items}`,
    joinExplanation: (goalReason, details) => `${goalReason} Совпадения — ${details}.`,
    formatIcebreaker: (name, detail, question) => `Привет, ${name}! В вашей анкете указано «${detail}». ${question}`,
  },
  kk: {
    goalReasons: {
      find_job: 'Сіз жұмыс іздеп жүрсіз, ал бұл қатысушы маман іздейді.',
      hire: 'Сіз маман іздеп жүрсіз, ал бұл қатысушы жұмыс іздейді.',
      find_mentor: 'Сіз ментор іздеп жүрсіз, ал бұл қатысушы тәжірибесімен бөлісуге дайын.',
      be_mentor: 'Сіз ментор болуға дайынсыз, ал бұл қатысушы тәлімгер іздейді.',
      find_cofounder: 'Екеуіңіз де кофаундер іздеп жүрсіздер.',
      exchange_experience: 'Екеуіңіз де тәжірибе алмасқыңыз келеді.',
    },
    icebreakerQuestions: {
      find_job: 'Қазір командаңызда қандай міндеттер бар?',
      hire: 'Қандай жобалар туралы сөйлескіңіз келеді?',
      find_mentor: 'Осы бағытта даму үшін неден бастауға кеңес бересіз?',
      be_mentor: 'Қазір қай міндет сізде ең көп сұрақ туғызып тұр?',
      find_cofounder: 'Қандай жобаны іске қосқыңыз келеді және қандай рөл алғыңыз келеді?',
      exchange_experience: 'Осы саладағы қандай тәжірибеңізбен бөлісу қызық болар еді?',
    },
    candidateNeeds: items => `сіздің дағдыларыңыздан қатысушы ${items} іздейді`,
    participantNeeds: items => `қатысушыда сізге қажет дағдылар бар: ${items}`,
    sharedSkills: items => `ортақ дағдылар: ${items}`,
    moreExperienced: 'ментордың тәжірибесі көбірек',
    lessExperienced: 'болашақ ментидің тәжірибесі азырақ',
    sharedInterests: items => `ортақ қызығушылықтар: ${items}`,
    joinExplanation: (goalReason, details) => `${goalReason} Сәйкестіктер — ${details}.`,
    formatIcebreaker: (name, detail, question) => `Сәлем, ${name}! Сауалнамаңызда «${detail}» көрсетілген екен. ${question}`,
  },
  en: {
    goalReasons: {
      find_job: 'You are looking for a job, and this participant is hiring.',
      hire: 'You are hiring, and this participant is looking for a job.',
      find_mentor: 'You are looking for a mentor, and this participant is ready to share experience.',
      be_mentor: 'You are ready to mentor, and this participant is looking for a mentor.',
      find_cofounder: 'You are both looking for a cofounder.',
      exchange_experience: 'You both want to exchange experience.',
    },
    icebreakerQuestions: {
      find_job: 'What challenges is your team working on right now?',
      hire: 'Which projects would you like to talk about?',
      find_mentor: 'Where would you recommend starting to grow in this area?',
      be_mentor: 'Which task is raising the most questions for you right now?',
      find_cofounder: 'What project would you like to launch and what role would you take?',
      exchange_experience: 'What experience in this area would you be excited to share?',
    },
    candidateNeeds: items => `this participant is looking for your skills: ${items}`,
    participantNeeds: items => `this participant has skills you need: ${items}`,
    sharedSkills: items => `shared skills: ${items}`,
    moreExperienced: 'the mentor has more years of experience',
    lessExperienced: 'the mentee has fewer years of experience',
    sharedInterests: items => `shared interests: ${items}`,
    joinExplanation: (goalReason, details) => `${goalReason} Matches — ${details}.`,
    formatIcebreaker: (name, detail, question) => `Hi ${name}! I saw "${detail}" in your profile. ${question}`,
  },
}

const skillAliases = new Map([
  ['js', 'javascript'],
  ['ts', 'typescript'],
  ['postgres', 'postgresql'],
  ['node.js', 'nodejs'],
  ['node js', 'nodejs'],
  ['react.js', 'react'],
  ['reactjs', 'react'],
  ['vue.js', 'vue'],
  ['vuejs', 'vue'],
])

const roleAliases = new Map<string, string>()
const roleGroups = {
  backend: [
    'backend', 'backdev', 'backenddev', 'backenddeveloper', 'backendengineer',
    'бэкендразработчик', 'бекендразработчик', 'бэкендәзірлеуші', 'бекендәзірлеуші',
  ],
  frontend: [
    'frontend', 'frontdev', 'frontenddev', 'frontenddeveloper', 'frontendengineer',
    'фронтендразработчик', 'фронтендәзірлеуші',
  ],
  fullstack: [
    'fullstack', 'fullstackdev', 'fullstackdeveloper', 'fullstackengineer',
    'фулстекразработчик', 'фулстекәзірлеуші',
  ],
  ios: ['ios', 'iosdev', 'iosdeveloper', 'iosengineer', 'iosразработчик', 'iosәзірлеуші'],
  android: ['android', 'androiddev', 'androiddeveloper', 'androidengineer', 'androidразработчик', 'androidәзірлеуші'],
}
for (const [role, aliases] of Object.entries(roleGroups)) {
  for (const alias of aliases) roleAliases.set(alias, role)
}

function normalizeTopic(value: string): string {
  return value.trim().toLowerCase()
}

function normalizeSkill(value: string): string {
  const key = normalizeTopic(value.normalize('NFKC')).replace(/\s+/g, ' ')
  const compactRole = key.replace(/[\s_\u2010-\u2015-]+/g, '')
  return skillAliases.get(key) ?? roleAliases.get(compactRole) ?? key
}

function makeIcebreaker(goal: Goal, candidate: Candidate, locale: Locale, topic?: string): string {
  const templates = templatesByLocale[locale]
  const profileDetail = topic ?? candidate.skills.find(skill => skill.trim()) ?? candidate.role
  return templates.formatIcebreaker(candidate.name, profileDetail.trim(), templates.icebreakerQuestions[goal])
}

function matchingTopics(
  values: readonly string[],
  targets: readonly string[],
  normalize: (value: string) => string = normalizeTopic,
): string[] {
  const pending = new Set(targets.map(normalize).filter(Boolean))

  return values.map(value => value.trim()).filter(value => pending.delete(normalize(value)))
}

function scoreCandidate(input: ProfileInput, candidate: Candidate, templates: RecommendationTemplates) {
  const candidateNeeds = matchingTopics(input.skills, candidate.lookingFor ?? [], normalizeSkill)
  const participantNeeds = matchingTopics(candidate.skills, input.lookingFor ?? [], normalizeSkill)
  const sharedSkills = matchingTopics(candidate.skills, input.skills, normalizeSkill)

  // Apply the employer's skill criteria in both directions before ranking job matches.
  let hiringMatch: string[] | undefined
  if (input.goal === 'hire') {
    hiringMatch = input.lookingFor?.some(skill => skill.trim()) ? participantNeeds : sharedSkills
  } else if (input.goal === 'find_job') {
    hiringMatch = candidate.lookingFor?.some(skill => skill.trim()) ? candidateNeeds : sharedSkills
  }
  if (hiringMatch?.length === 0) return null

  const sharedInterests = matchingTopics(candidate.interests, input.interests)
  const isMoreExperienced = input.goal === 'find_mentor' && candidate.experienceYears > input.experienceYears
  const isLessExperienced = input.goal === 'be_mentor' && candidate.experienceYears < input.experienceYears

  const score =
    8 * (candidateNeeds.length + participantNeeds.length) +
    4 * sharedSkills.length +
    2 * sharedInterests.length +
    Number(isMoreExperienced || isLessExperienced)

  const reasons: string[] = []
  if (candidateNeeds.length) reasons.push(templates.candidateNeeds(candidateNeeds.slice(0, 2).join(', ')))
  if (participantNeeds.length) reasons.push(templates.participantNeeds(participantNeeds.slice(0, 2).join(', ')))
  if (sharedSkills.length) reasons.push(templates.sharedSkills(sharedSkills.slice(0, 2).join(', ')))
  if (isMoreExperienced) reasons.push(templates.moreExperienced)
  if (isLessExperienced) reasons.push(templates.lessExperienced)
  if (sharedInterests.length) reasons.push(templates.sharedInterests(sharedInterests.slice(0, 2).join(', ')))

  const topic = hiringMatch?.[0] ?? candidateNeeds[0] ?? participantNeeds[0] ?? sharedSkills[0] ?? sharedInterests[0]
  return { candidate, score, reasons, topic }
}

export function recommend(
  input: ProfileInput,
  candidates: readonly Candidate[],
  locale: Locale = 'ru',
): Recommendation[] {
  const templates = templatesByLocale[locale]
  const seen = new Set<string>()
  const ranked = []

  for (const candidate of candidates) {
    if (candidate.goal !== reciprocalGoals[input.goal] || seen.has(candidate.id)) continue
    const scored = scoreCandidate(input, candidate, templates)
    if (!scored) continue
    seen.add(candidate.id)
    ranked.push(scored)
  }

  return ranked
    .sort((a, b) => b.score - a.score || (a.candidate.id < b.candidate.id ? -1 : Number(a.candidate.id > b.candidate.id)))
    .slice(0, 5)
    .map(({ candidate, reasons, topic }) => {
      const details = reasons.slice(0, 2).join(', ')
      const goalReason = templates.goalReasons[input.goal]
      const explanation = details ? templates.joinExplanation(goalReason, details) : goalReason
      return { candidate, explanation, icebreaker: makeIcebreaker(input.goal, candidate, locale, topic) }
    })
}
