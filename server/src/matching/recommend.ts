import type { Candidate, Goal, Locale, ProfileInput, Recommendation } from './types.js'
import { deduplicateExplanationSkills, formatIcebreakerName } from './explanation-skills.ts'

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
  /** Employer requirements the applicant has not listed (shown to the employer). */
  applicantMissing: (items: string) => string
  /** Employer requirements the job seeker has not listed (shown to the job seeker). */
  requirementMissing: (items: string) => string
  /** Technologies the job seeker wants that the employer does not list. */
  wishMissing: (items: string) => string
  joinExplanation: (goalReason: string, details: string) => string
  formatIcebreaker: (greetingName: string, detail: string, question: string) => string
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
    applicantMissing: items => `в анкете не указано: ${items}`,
    requirementMissing: items => `из требований работодателя у вас не указано: ${items}`,
    wishMissing: items => `в стеке работодателя не указано: ${items}`,
    joinExplanation: (goalReason, details) => `${goalReason} Совпадения — ${details}.`,
    formatIcebreaker: (greetingName, detail, question) => `Привет, ${greetingName} В вашей анкете указано «${detail}». ${question}`,
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
    applicantMissing: items => `сауалнамада көрсетілмеген: ${items}`,
    requirementMissing: items => `жұмыс берушінің талаптарынан сізде көрсетілмеген: ${items}`,
    wishMissing: items => `жұмыс берушінің стегінде көрсетілмеген: ${items}`,
    joinExplanation: (goalReason, details) => `${goalReason} Сәйкестіктер — ${details}.`,
    formatIcebreaker: (greetingName, detail, question) => `Сәлем, ${greetingName} Сауалнамаңызда «${detail}» көрсетілген екен. ${question}`,
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
    applicantMissing: items => `not listed in the profile: ${items}`,
    requirementMissing: items => `of the employer's requirements you have not listed: ${items}`,
    wishMissing: items => `not in the employer's stack: ${items}`,
    joinExplanation: (goalReason, details) => `${goalReason} Matches — ${details}.`,
    formatIcebreaker: (greetingName, detail, question) => `Hi ${greetingName} I saw "${detail}" in your profile. ${question}`,
  },
}

const skillAliases = new Map([
  ['js', 'javascript'],
  ['ts', 'typescript'],
  ['postgres', 'postgresql'],
  ['node', 'nodejs'],
  ['node.js', 'nodejs'],
  ['node js', 'nodejs'],
  ['react.js', 'react'],
  ['reactjs', 'react'],
  ['vue.js', 'vue'],
  ['vuejs', 'vue'],
  ['golang', 'go'],
  ['k8s', 'kubernetes'],
  ['fast api', 'fastapi'],
  ['питон', 'python'],
  ['компьютерное зрение', 'computer vision'],
  ['a/b', 'a/b testing'],
  ['a/b-тест', 'a/b testing'],
  ['a/b-тесты', 'a/b testing'],
  ['a/b-тестирование', 'a/b testing'],
  ['продажи', 'sales'],
  ['сату', 'sales'],
  ['b2b-продажи', 'b2b sales'],
  ['маркетинг', 'marketing'],
  ['product', 'product management'],
  ['продукт', 'product management'],
  ['управление продуктом', 'product management'],
  ['өнімді басқару', 'product management'],
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
    'backendразработчик', 'backendәзірлеуші',
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

// Seniority words do not change the specialization: "Junior backend-разработчик" is still backend.
const seniorityWords = new Set([
  'junior', 'middle', 'senior', 'jr', 'sr', 'intern', 'trainee',
  'джуниор', 'джун', 'мидл', 'сеньор', 'сениор', 'младший', 'старший', 'стажёр', 'стажер',
])
// Generic job words: "Python Developer" asks for Python, the trailing word only says it is a job title.
const jobTitleWords = new Set([
  'developer', 'dev', 'engineer', 'programmer', 'разработчик', 'программист', 'инженер', 'әзірлеуші', 'инженері', 'бағдарламашы',
])
const minTypoSkillLength = 6
const hiringTitleModifiers = new Set(['lead', 'staff', 'аға', 'ведущий'])

function titleWords(value: string): string[] {
  return normalizeTopic(value).split(/[\s\u2010-\u2015-]+/).filter(word => word && !seniorityWords.has(word))
}

/** Returns the known role group of a free-text role, ignoring seniority, or undefined. */
function roleGroupOf(value: string, skillKey?: (value: string) => string): string | undefined {
  const words = titleWords(value)
  if (!words.length) return undefined
  const specialization = skillKey ? words.filter(word => !hiringTitleModifiers.has(word)) : words
  const key = normalizeSkill(specialization.join(' '))
  if (Object.hasOwn(roleGroups, key)) return key
  const approved = skillKey?.(value)
  return approved && Object.hasOwn(roleGroups, approved) ? approved : undefined
}

interface ParsedRequest {
  /** Labels to look for in the counterpart's skills; role labels stay as typed, job titles are reduced to their technology. */
  targets: string[]
  /** Technologies the request explicitly requires, e.g. "python" from "Python Developer". */
  technologies: string[]
  roles: Set<string>
}

/** Splits "looking for" entries into roles ("Backend Developer") and required technologies ("Python Developer" -> python). */
function parseRequest(values: readonly string[] = [], skillKey?: (value: string) => string): ParsedRequest {
  const parsed: ParsedRequest = { targets: [], technologies: [], roles: new Set() }
  for (const raw of values) {
    const value = raw.trim()
    if (!value) continue
    const role = roleGroupOf(value, skillKey)
    if (role) {
      parsed.roles.add(role)
      parsed.targets.push(value)
      continue
    }
    const words = titleWords(value)
    const technology = words.length > 1 && jobTitleWords.has(words[words.length - 1])
      ? words.slice(0, -1).join(' ')
      : words.join(' ') || value
    const technologyRole = roleGroupOf(technology)
    if (technologyRole) parsed.roles.add(technologyRole)
    else parsed.technologies.push(technology)
    parsed.targets.push(technology)
  }
  return parsed
}

/**
 * Hiring compatibility of one applicant with one employer request, applied identically in both directions.
 * A named technology is required; a named role must match unless a technology already confirms the fit,
 * and an applicant from a different known role is never matched.
 */
function hiringMatchFor(
  applicantSkills: readonly string[],
  applicantRole: string,
  request: ParsedRequest,
  skillKey: (value: string) => string,
  broaderSkills?: ReadonlyMap<string, string>,
) {
  const needs = matchingTopics(applicantSkills, request.targets, skillKey, broaderSkills, true)
  const applicantGroup = roleGroupOf(applicantRole, skillKey)
  const roleMatch = applicantGroup !== undefined && request.roles.has(applicantGroup)
  const coversRequestedRole = applicantGroup === 'fullstack' && (request.roles.has('backend') || request.roles.has('frontend'))
  const roleConflict = request.roles.size > 0 && applicantGroup !== undefined && !roleMatch && !coversRequestedRole
  let compatible: boolean
  if (!request.targets.length) compatible = true
  else if (request.technologies.length) {
    compatible = !roleConflict && matchingTopics(applicantSkills, request.technologies, skillKey, broaderSkills, true).length > 0
  } else compatible = roleMatch || (!roleConflict && needs.length > 0)
  return { needs, roleMatch, compatible }
}

function makeIcebreaker(goal: Goal, candidate: Candidate, locale: Locale, topic: string): string {
  const templates = templatesByLocale[locale]
  return templates.formatIcebreaker(formatIcebreakerName(candidate.name), topic, templates.icebreakerQuestions[goal])
}

function matchingRequestedRole(applicantRole: string, requested: readonly string[], skillKey: (value: string) => string): string | undefined {
  const role = roleGroupOf(applicantRole, skillKey)
  if (!role) return undefined
  return requested.find(value => roleGroupOf(value, skillKey) === role)?.trim()
}

function isTypoCandidate(key: string): boolean {
  return key.length >= minTypoSkillLength && /^\p{L}+$/u.test(key)
}

function matchingTopics(
  values: readonly string[],
  targets: readonly string[],
  normalize: (value: string) => string = normalizeTopic,
  broaderSkills?: ReadonlyMap<string, string>,
  correctTypos = false,
): string[] {
  const pending = new Set(targets.map(normalize).filter(Boolean))
  const matched = new Set<string>()
  const trimmed = values.map(value => value.trim())

  const exact = trimmed.filter(value => {
    const key = normalize(value)
    if (matched.has(key)) return false
    const broaderSkill = broaderSkills?.get(key)
    if (!pending.delete(key) && !(broaderSkill !== undefined && pending.delete(broaderSkill))) return false
    matched.add(key)
    return true
  })
  if (!correctTypos) return exact

  // One edit (including a swapped pair) on a long single-word skill, only when exactly one skill is that close.
  for (const target of pending) {
    if (!isTypoCandidate(target)) continue
    const near = new Map<string, string>()
    for (const value of trimmed) {
      const key = normalize(value)
      if (!matched.has(key) && isTypoCandidate(key) && isOneEditAway(key, target)) near.set(key, value)
    }
    if (near.size !== 1) continue
    const [[key, value]] = near
    matched.add(key)
    exact.push(value)
  }
  return exact
}

function scoreCandidate(
  input: ProfileInput,
  candidate: Candidate,
  templates: RecommendationTemplates,
  skillKey: (value: string) => string,
) {
  const isCofounder = input.goal === 'find_cofounder'
  const broaderSkills = isCofounder ? broaderCofounderSkills : undefined
  const isHiring = input.goal === 'hire' || input.goal === 'find_job'
  const hiringKey = isHiring ? skillKey : undefined
  const candidateRequest = parseRequest(candidate.lookingFor, hiringKey)
  const inputRequest = parseRequest(input.lookingFor, hiringKey)
  let candidateNeeds = matchingTopics(input.skills, candidateRequest.targets, skillKey, broaderSkills, isHiring)
  let participantNeeds = matchingTopics(candidate.skills, inputRequest.targets, skillKey, broaderSkills, isHiring)
  const sharedSkills = matchingTopics(candidate.skills, input.skills, skillKey)

  // Apply the employer's criteria in both directions before ranking job matches.
  let hiringMatch: string[] | undefined
  let roleMatch: string | undefined
  if (isHiring) {
    const employerSide = input.goal === 'hire'
    const request = employerSide ? inputRequest : candidateRequest
    const verdict = employerSide
      ? hiringMatchFor(candidate.skills, candidate.role, request, skillKey)
      : hiringMatchFor(input.skills, input.role, request, skillKey)
    if (!verdict.compatible) return null
    if (employerSide) participantNeeds = verdict.needs
    else candidateNeeds = verdict.needs
    hiringMatch = request.targets.length ? verdict.needs : sharedSkills
    if (verdict.roleMatch) {
      roleMatch = employerSide ? candidate.role.trim() : matchingRequestedRole(input.role, candidate.lookingFor ?? [], skillKey)
    }
    if (!request.targets.length && !hiringMatch.length) return null
  }

  if (roleMatch) {
    const roleKey = normalizeSkill(roleMatch)
    if (hiringMatch?.some(skill => normalizeSkill(skill) === roleKey)) roleMatch = undefined
  }

  // Mentorship: the mentor is not less experienced, and when the mentee names what to learn, the mentor's
  // skills must cover it. A shared interest alone is not enough. Years are total experience, not in this topic.
  // Topics are compared as written (like skills), so "UX-исследования" matches the same skill label.
  const coversTopics = (skills: readonly string[], wanted: readonly string[] = []) =>
    !wanted.some(value => value.trim()) || matchingTopics(skills, wanted, skillKey).length > 0
  if (input.goal === 'find_mentor') {
    if (candidate.experienceYears < input.experienceYears) return null
    if (!coversTopics(candidate.skills, input.lookingFor)) return null
  }
  if (input.goal === 'be_mentor') {
    if (candidate.experienceYears > input.experienceYears) return null
    if (!coversTopics(input.skills, candidate.lookingFor)) return null
  }

  // Hiring: every requested technology is a requirement. Full matches rank first; partial ones stay visible
  // (a small event may have few people) but come after them, with the gap named in the explanation.
  const gaps: string[] = []
  let requirementGap = 0
  if (isHiring) {
    const employerSide = input.goal === 'hire'
    const employerRequest = employerSide ? inputRequest : candidateRequest
    const seekerRequest = employerSide ? candidateRequest : inputRequest
    const applicantSkills = employerSide ? candidate.skills : input.skills
    const employerSkills = employerSide ? input.skills : candidate.skills
    const lacks = (have: readonly string[]) => (wanted: string) => !matchingTopics(have, [wanted], skillKey, undefined, true).length
    // Parsed technologies are lower-cased; show them as the person wrote them.
    const asWritten = (raw: readonly string[] = []) => (technology: string) =>
      raw.map(value => value.trim()).find(value => value.toLowerCase().includes(technology)) ?? technology
    const employerRaw = (employerSide ? input : candidate).lookingFor
    const seekerRaw = (employerSide ? candidate : input).lookingFor
    const missingRequired = employerRequest.technologies.filter(lacks(applicantSkills)).map(asWritten(employerRaw))
    const missingWish = seekerRequest.technologies.filter(lacks([...employerSkills, ...employerRequest.technologies])).map(asWritten(seekerRaw))
    requirementGap = missingRequired.length + missingWish.length
    if (missingRequired.length) {
      gaps.push((employerSide ? templates.applicantMissing : templates.requirementMissing)(missingRequired.slice(0, 3).join(', ')))
    }
    if (missingWish.length) gaps.push(templates.wishMissing(missingWish.slice(0, 3).join(', ')))
  }

  const sharedInterests = matchingTopics(candidate.interests, input.interests, normalizeInterest)
  const topic = (isCofounder ? participantNeeds[0] : hiringMatch?.[0] ?? roleMatch) ??
    candidateNeeds[0] ?? participantNeeds[0] ?? sharedSkills[0] ?? sharedInterests[0]
  if (!topic) return null

  const isMoreExperienced = input.goal === 'find_mentor' && candidate.experienceYears > input.experienceYears
  const isLessExperienced = input.goal === 'be_mentor' && candidate.experienceYears < input.experienceYears

  const score =
    8 * (candidateNeeds.length + participantNeeds.length + Number(Boolean(roleMatch))) +
    4 * sharedSkills.length +
    2 * sharedInterests.length +
    Number(isMoreExperienced || isLessExperienced)

  const reasons: string[] = []
  if (roleMatch) reasons.push(input.goal === 'hire' ? templates.applicantRole(roleMatch) : templates.requestedRole(roleMatch))
  const skillReasons = [
    { labels: candidateNeeds, format: templates.candidateNeeds },
    { labels: participantNeeds, format: templates.participantNeeds },
  ]
  if (isCofounder) skillReasons.reverse()
  skillReasons.push({ labels: sharedSkills, format: templates.sharedSkills })

  const uniqueLabels = deduplicateExplanationSkills(
    skillReasons.map(({ labels }) => labels.map(label => ({ key: skillKey(label), label }))),
  )
  for (const [index, labels] of uniqueLabels.entries()) {
    if (labels.length) reasons.push(skillReasons[index].format(labels.slice(0, 2).join(', ')))
  }
  if (isMoreExperienced) reasons.push(templates.moreExperienced)
  if (isLessExperienced) reasons.push(templates.lessExperienced)
  if (sharedInterests.length) reasons.push(templates.sharedInterests(sharedInterests.slice(0, 2).join(', ')))

  const cofounderNeeds = isCofounder ? participantNeeds.length : 0
  return { candidate, score, cofounderNeeds, requirementGap, gaps, reasons, topic }
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
    .sort((a, b) => a.requirementGap - b.requirementGap || b.cofounderNeeds - a.cofounderNeeds || b.score - a.score ||
      (a.candidate.id < b.candidate.id ? -1 : Number(a.candidate.id > b.candidate.id)))
    .slice(0, 5)
    .map(({ candidate, reasons, gaps, topic }) => {
      // Gaps join the "matches" sentence, so the explanation stays within two sentences.
      const details = [reasons.slice(0, 2).join(', '), gaps.join('; ')].filter(Boolean).join('; ')
      const goalReason = templates.goalReasons[input.goal]
      const explanation = details ? templates.joinExplanation(goalReason, details) : goalReason
      return { candidate, explanation, icebreaker: makeIcebreaker(input.goal, candidate, locale, topic) }
    })
}
