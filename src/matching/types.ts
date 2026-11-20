export type Locale = 'ru' | 'kk' | 'en'

export type Goal =
  | 'find_job'
  | 'hire'
  | 'find_mentor'
  | 'be_mentor'
  | 'find_cofounder'
  | 'exchange_experience'

export interface ProfileInput {
  role: string
  skills: string[]
  experienceYears: number
  interests: string[]
  about: string
  goal: Goal
  lookingFor?: string[]
}

export interface Candidate extends ProfileInput {
  id: string
  name: string
}

export interface Recommendation {
  candidate: Candidate
  explanation: string
  icebreaker?: string
}
