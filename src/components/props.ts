import type { ProfileInput, Recommendation } from '../matching/types'

export interface ProfileFormProps {
  initialProfile?: ProfileInput
  onSubmit: (profile: ProfileInput) => void
}

export interface ResultsProps {
  recommendations: readonly Recommendation[]
  onEdit: () => void
}
