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
  applicantRole: (role: string) => string
  requestedRole: (role: string) => string
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
    applicantRole: role => `роль соискателя соответствует запросу: ${role}`,
    requestedRole: role => `работодатель ищет специалиста вашего профиля: ${role}`,
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
    applicantRole: role => `үміткердің рөлі сұранысыңызға сай: ${role}`,
    requestedRole: role => `жұмыс беруші сіздің бейініңізге сай маман іздейді: ${role}`,
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
    applicantRole: role => `the applicant's role matches your request: ${role}`,
    requestedRole: role => `the employer is looking for someone in your role: ${role}`,
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
  ['golang', 'go'],
  ['fast api', 'fastapi'],
  ['питон', 'python'],
  ['компьютерное зрение', 'computer vision'],
  ['a/b-тесты', 'a/b testing'],
  ['a/b-тестирование', 'a/b testing'],
  ['продажи', 'sales'],
  ['b2b-продажи', 'b2b sales'],
  ['маркетинг', 'marketing'],
  ['управление продуктом', 'product management'],
  ['продуктовая стратегия', 'product strategy'],
])

const broaderCofounderSkills = new Map([
  ['b2b sales', 'sales'],
  ['product strategy', 'product management'],
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
  return value.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ')
}

function normalizeInterest(value: string): string {
  const key = normalizeTopic(value)
  return skillAliases.get(key) ?? key
}

function isOneEditAway(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false
  let start = 0
  while (start < a.length && start < b.length && a[start] === b[start]) start++
  let aEnd = a.length
  let bEnd = b.length
  while (aEnd > start && bEnd > start && a[aEnd - 1] === b[bEnd - 1]) {
    aEnd--
    bEnd--
  }
  const aRest = aEnd - start
  const bRest = bEnd - start
  return Math.max(aRest, bRest) === 1 ||
    (aRest === 2 && bRest === 2 && a[start] === b[start + 1] && a[start + 1] === b[start])
}

export function normalizeSkill(value: string): string {
  const key = normalizeTopic(value)
  const compactRole = key.replace(/[\s_\u2010-\u2015-]+/g, '')
  const exact = skillAliases.get(key) ?? roleAliases.get(compactRole)
  if (exact) return exact

  // Only correct a single edit of a known, unambiguous role label.
  if (compactRole.length >= 6 && /^\p{L}+$/u.test(compactRole)) {
    let match: string | undefined
    for (const [alias, role] of roleAliases) {
      if (alias.length < 6 || !isOneEditAway(compactRole, alias)) continue
      if (match && match !== role) return key
      match = role
    }
    if (match) return match
  }
  return key
}

function makeIcebreaker(goal: Goal, candidate: Candidate, locale: Locale, topic?: string): string {
  const templates = templatesByLocale[locale]
  const profileDetail = topic ?? candidate.skills.find(skill => skill.trim()) ?? candidate.role
  return templates.formatIcebreaker(candidate.name, profileDetail.trim(), templates.icebreakerQuestions[goal])
}

function matchingRequestedRole(applicantRole: string, requested: readonly string[]): string | undefined {
  const role = normalizeSkill(applicantRole)
  if (!Object.hasOwn(roleGroups, role)) return undefined
  return requested.find(value => normalizeSkill(value) === role)?.trim()
}

function matchingTopics(
  values: readonly string[],
  targets: readonly string[],
  normalize: (value: string) => string = normalizeTopic,
  broaderSkills?: ReadonlyMap<string, string>,
): string[] {
  const pending = new Set(targets.map(normalize).filter(Boolean))
  const matched = new Set<string>()

  return values.map(value => value.trim()).filter(value => {
    const key = normalize(value)
    if (matched.has(key)) return false
    const broaderSkill = broaderSkills?.get(key)
    if (!pending.delete(key) && !(broaderSkill !== undefined && pending.delete(broaderSkill))) return false
    matched.add(key)
    return true
  })
}

function scoreCandidate(
  input: ProfileInput,
  candidate: Candidate,
  templates: RecommendationTemplates,
  skillKey: (value: string) => string,
) {
  const isCofounder = input.goal === 'find_cofounder'
  const broaderSkills = isCofounder ? broaderCofounderSkills : undefined
  const candidateNeeds = matchingTopics(input.skills, candidate.lookingFor ?? [], skillKey, broaderSkills)
  const participantNeeds = matchingTopics(candidate.skills, input.lookingFor ?? [], skillKey, broaderSkills)
  const sharedSkills = matchingTopics(candidate.skills, input.skills, skillKey)

  // Apply the employer's criteria in both directions before ranking job matches.
  let hiringMatch: string[] | undefined
  let roleMatch: string | undefined
  if (input.goal === 'hire') {
    hiringMatch = input.lookingFor?.some(skill => skill.trim()) ? participantNeeds : sharedSkills
    if (matchingRequestedRole(candidate.role, input.lookingFor ?? [])) roleMatch = candidate.role.trim()
  } else if (input.goal === 'find_job') {
    hiringMatch = candidate.lookingFor?.some(skill => skill.trim()) ? candidateNeeds : sharedSkills
    roleMatch = matchingRequestedRole(input.role, candidate.lookingFor ?? [])
  }
  if (hiringMatch?.length === 0 && !roleMatch) return null

  if (roleMatch) {
    const roleKey = normalizeSkill(roleMatch)
    if (hiringMatch?.some(skill => normalizeSkill(skill) === roleKey)) roleMatch = undefined
  }

  const sharedInterests = matchingTopics(candidate.interests, input.interests, normalizeInterest)
  const isMoreExperienced = input.goal === 'find_mentor' && candidate.experienceYears > input.experienceYears
  const isLessExperienced = input.goal === 'be_mentor' && candidate.experienceYears < input.experienceYears

  const score =
    8 * (candidateNeeds.length + participantNeeds.length + Number(Boolean(roleMatch))) +
    4 * sharedSkills.length +
    2 * sharedInterests.length +
    Number(isMoreExperienced || isLessExperienced)

  const reasons: string[] = []
  if (roleMatch) reasons.push(input.goal === 'hire' ? templates.applicantRole(roleMatch) : templates.requestedRole(roleMatch))
  if (candidateNeeds.length) reasons.push(templates.candidateNeeds(candidateNeeds.slice(0, 2).join(', ')))
  if (participantNeeds.length) reasons.push(templates.participantNeeds(participantNeeds.slice(0, 2).join(', ')))
  if (isCofounder) reasons.reverse()
  if (sharedSkills.length) reasons.push(templates.sharedSkills(sharedSkills.slice(0, 2).join(', ')))
  if (isMoreExperienced) reasons.push(templates.moreExperienced)
  if (isLessExperienced) reasons.push(templates.lessExperienced)
  if (sharedInterests.length) reasons.push(templates.sharedInterests(sharedInterests.slice(0, 2).join(', ')))

  const cofounderNeeds = isCofounder ? participantNeeds.length : 0
  const topic = (isCofounder ? participantNeeds[0] : hiringMatch?.[0] ?? roleMatch) ??
    candidateNeeds[0] ?? participantNeeds[0] ?? sharedSkills[0] ?? sharedInterests[0]
  return { candidate, score, cofounderNeeds, reasons, topic }
}

export function recommend(
  input: ProfileInput,
  candidates: readonly Candidate[],
  locale: Locale = 'ru',
  skillKey = normalizeSkill,
): Recommendation[] {
  const templates = templatesByLocale[locale]
  const seen = new Set<string>()
  const ranked = []

  for (const candidate of candidates) {
    if (candidate.goal !== reciprocalGoals[input.goal] || seen.has(candidate.id)) continue
    const scored = scoreCandidate(input, candidate, templates, skillKey)
    if (!scored) continue
    seen.add(candidate.id)
    ranked.push(scored)
  }

  return ranked
    .sort((a, b) => b.cofounderNeeds - a.cofounderNeeds || b.score - a.score ||
      (a.candidate.id < b.candidate.id ? -1 : Number(a.candidate.id > b.candidate.id)))
    .slice(0, 5)
    .map(({ candidate, reasons, topic }) => {
      const details = reasons.slice(0, 2).join(', ')
      const goalReason = templates.goalReasons[input.goal]
      const explanation = details ? templates.joinExplanation(goalReason, details) : goalReason
      return { candidate, explanation, icebreaker: makeIcebreaker(input.goal, candidate, locale, topic) }
    })
}
