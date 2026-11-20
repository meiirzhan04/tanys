import type { Candidate, Goal, ProfileInput, Recommendation } from './types'

const reciprocalGoals: Record<Goal, Goal> = {
  find_job: 'hire',
  hire: 'find_job',
  find_mentor: 'be_mentor',
  be_mentor: 'find_mentor',
  find_cofounder: 'find_cofounder',
  exchange_experience: 'exchange_experience',
}

const goalReasons: Record<Goal, string> = {
  find_job: 'Вы ищете работу, а этот участник нанимает.',
  hire: 'Вы нанимаете, а этот участник ищет работу.',
  find_mentor: 'Вы ищете ментора, а этот участник готов делиться опытом.',
  be_mentor: 'Вы готовы быть ментором, а этот участник ищет наставника.',
  find_cofounder: 'Вы оба ищете кофаундера.',
  exchange_experience: 'Вы оба хотите обменяться опытом.',
}

const icebreakerQuestions: Record<Goal, string> = {
  find_job: 'Какие задачи сейчас есть в вашей команде?',
  hire: 'О каких проектах вам хотелось бы поговорить?',
  find_mentor: 'С чего вы посоветуете начать, чтобы развиваться в этом направлении?',
  be_mentor: 'Какая задача у вас сейчас вызывает больше всего вопросов?',
  find_cofounder: 'Какой проект вы хотели бы запустить и какую роль взять на себя?',
  exchange_experience: 'Каким опытом в этой области вам было бы интересно поделиться?',
}

function makeIcebreaker(goal: Goal, candidate: Candidate, topic?: string): string {
  const profileDetail = topic ?? candidate.skills.find(skill => skill.trim()) ?? candidate.role
  return `Привет, ${candidate.name}! В вашей анкете указано «${profileDetail.trim()}». ${icebreakerQuestions[goal]}`
}

function matchingTopics(values: readonly string[], targets: readonly string[]): string[] {
  const pending = new Set(targets.map(value => value.trim().toLowerCase()).filter(Boolean))

  return values.map(value => value.trim()).filter(value => pending.delete(value.toLowerCase()))
}

function scoreCandidate(input: ProfileInput, candidate: Candidate) {
  const candidateNeeds = matchingTopics(input.skills, candidate.lookingFor ?? [])
  const participantNeeds = matchingTopics(candidate.skills, input.lookingFor ?? [])
  const sharedSkills = matchingTopics(candidate.skills, input.skills)
  const sharedInterests = matchingTopics(candidate.interests, input.interests)
  const isMoreExperienced = input.goal === 'find_mentor' && candidate.experienceYears > input.experienceYears
  const isLessExperienced = input.goal === 'be_mentor' && candidate.experienceYears < input.experienceYears

  const score =
    8 * (candidateNeeds.length + participantNeeds.length) +
    4 * sharedSkills.length +
    2 * sharedInterests.length +
    Number(isMoreExperienced || isLessExperienced)

  const reasons: string[] = []
  if (candidateNeeds.length) reasons.push(`из ваших навыков участник ищет ${candidateNeeds.slice(0, 2).join(', ')}`)
  if (participantNeeds.length) reasons.push(`у участника есть нужные вам навыки: ${participantNeeds.slice(0, 2).join(', ')}`)
  if (sharedSkills.length) reasons.push(`общие навыки: ${sharedSkills.slice(0, 2).join(', ')}`)
  if (isMoreExperienced) reasons.push('у ментора больше лет опыта')
  if (isLessExperienced) reasons.push('у будущего менти меньше лет опыта')
  if (sharedInterests.length) reasons.push(`общие интересы: ${sharedInterests.slice(0, 2).join(', ')}`)

  const topic = candidateNeeds[0] ?? participantNeeds[0] ?? sharedSkills[0] ?? sharedInterests[0]
  return { candidate, score, reasons, topic }
}

export function recommend(input: ProfileInput, candidates: readonly Candidate[]): Recommendation[] {
  const seen = new Set<string>()
  const ranked = []

  for (const candidate of candidates) {
    if (candidate.goal !== reciprocalGoals[input.goal] || seen.has(candidate.id)) continue
    seen.add(candidate.id)
    ranked.push(scoreCandidate(input, candidate))
  }

  return ranked
    .sort((a, b) => b.score - a.score || (a.candidate.id < b.candidate.id ? -1 : Number(a.candidate.id > b.candidate.id)))
    .slice(0, 5)
    .map(({ candidate, reasons, topic }) => {
      const details = reasons.slice(0, 2).join(', ')
      const explanation = details ? `${goalReasons[input.goal]} Совпадения — ${details}.` : goalReasons[input.goal]
      return { candidate, explanation, icebreaker: makeIcebreaker(input.goal, candidate, topic) }
    })
}
