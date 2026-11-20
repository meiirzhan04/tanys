import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { getMessages } from '../i18n/messages'
import type { Goal, Locale, ProfileInput } from '../matching/types'
import { CustomSelect } from './CustomSelect'
import { getGoalLabels } from './goalLabels'
import type { ProfileFormProps } from './props'

type Fields = { goal: Goal | ''; role: string; experience: string; skills: string; interests: string; about: string; lookingFor: string }
type RequiredField = Exclude<keyof Fields, 'lookingFor'>
type Errors = Partial<Record<RequiredField, string>>

function toFields(profile?: ProfileInput): Fields {
  return {
    goal: profile?.goal ?? '',
    role: profile?.role ?? '',
    experience: profile ? String(profile.experienceYears) : '',
    skills: profile?.skills.join(', ') ?? '',
    interests: profile?.interests.join(', ') ?? '',
    about: profile?.about ?? '',
    lookingFor: profile?.lookingFor?.join(', ') ?? '',
  }
}

function topics(value: string) {
  return value.split(/[,\n]/).map(topic => topic.trim()).filter(Boolean)
}

function validate(fields: Fields, locale: Locale): Errors {
  const t = getMessages(locale).form.errors
  const errors: Errors = {}
  const experience = Number(fields.experience)
  if (!fields.goal) errors.goal = t.goal
  if (!fields.role.trim()) errors.role = t.role
  if (!fields.experience || !Number.isInteger(experience) || experience < 0 || experience > 60) {
    errors.experience = t.experience
  }
  if (!topics(fields.skills).length) errors.skills = t.skills
  if (!topics(fields.interests).length) errors.interests = t.interests
  if (!fields.about.trim()) errors.about = t.about
  return errors
}

export function ProfileForm({
  initialProfile,
  onSubmit,
  locale = 'ru',
}: ProfileFormProps & { example?: ProfileInput; locale?: Locale }) {
  const id = useId()
  const [fields, setFields] = useState(() => toFields(initialProfile))
  const [showErrors, setShowErrors] = useState(false)
  const messages = getMessages(locale).form
  const goalLabels = getGoalLabels(locale)
  const errors = showErrors ? validate(fields, locale) : {}
  const showLookingFor = fields.goal === 'hire' || fields.goal === 'find_cofounder' || fields.goal === 'find_mentor'

  const change = (field: keyof Fields, value: string) => setFields(current => ({ ...current, [field]: value }))

  function control(name: RequiredField) {
    return {
      id: `${id}-${name}`,
      name,
      required: true,
      'aria-invalid': errors[name] ? true : undefined,
      'aria-describedby': errors[name] ? `${id}-${name}-error` : undefined,
      value: fields[name],
    }
  }

  function fieldError(name: RequiredField) {
    return errors[name] && <span id={`${id}-${name}-error`} className="field-error">{errors[name]}</span>
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const firstInvalid = Object.keys(validate(fields, locale))[0]
    if (firstInvalid) {
      setShowErrors(true)
      const field = event.currentTarget.elements.namedItem(firstInvalid)
      if (field instanceof HTMLElement) requestAnimationFrame(() => field.focus())
      return
    }
    if (!fields.goal) return

    setShowErrors(false)
    onSubmit({
      goal: fields.goal,
      role: fields.role.trim(),
      skills: topics(fields.skills),
      interests: topics(fields.interests),
      experienceYears: Number(fields.experience),
      about: fields.about.trim(),
      ...(showLookingFor && fields.lookingFor.trim() ? { lookingFor: topics(fields.lookingFor) } : {}),
    })
  }

  const goalOptions = Object.entries(goalLabels).map(([goal, label]) => ({
    value: goal,
    label,
  }))

  return (
    <form className="profile-form" aria-labelledby="profile-title" noValidate onSubmit={submit}>
      <div className="page-heading">
        <div>
          <h1 id="profile-title" tabIndex={-1}>{messages.title}</h1>
          <p>{messages.subtitle}</p>
        </div>
      </div>

      <div className="form-panel surface">
        <div className="form-fields">
          <div className="field field-full">
            <label htmlFor={`${id}-goal`}>{messages.goalLabel}</label>
            <CustomSelect
              {...control('goal')}
              options={goalOptions}
              placeholder={messages.goalPlaceholder}
              onChange={val => change('goal', val)}
            />
            <div className="goal-pills" aria-hidden="true">
              {goalOptions.map(opt => (
                <span
                  key={opt.value}
                  className={`goal-pill ${fields.goal === opt.value ? 'goal-pill--active' : ''}`}
                  onClick={() => change('goal', opt.value)}
                >
                  {opt.label}
                </span>
              ))}
            </div>
            {fieldError('goal')}
          </div>

          <div className="field">
            <label htmlFor={`${id}-role`}>{messages.roleLabel}</label>
            <input {...control('role')} maxLength={80} placeholder={messages.rolePlaceholder} onChange={event => change('role', event.target.value)} />
            {fieldError('role')}
          </div>
          <div className="field">
            <label htmlFor={`${id}-experience`}>{messages.experienceLabel}</label>
            <input {...control('experience')} type="number" min={0} max={60} placeholder="0" onChange={event => change('experience', event.target.value)} />
            {fieldError('experience')}
          </div>
          <div className="field">
            <label htmlFor={`${id}-skills`}>{messages.skillsLabel}</label>
            <input {...control('skills')} maxLength={160} placeholder={messages.skillsPlaceholder} onChange={event => change('skills', event.target.value)} />
            {fieldError('skills')}
          </div>
          <div className="field">
            <label htmlFor={`${id}-interests`}>{messages.interestsLabel}</label>
            <input {...control('interests')} maxLength={160} placeholder={messages.interestsPlaceholder} onChange={event => change('interests', event.target.value)} />
            {fieldError('interests')}
          </div>

          {showLookingFor && <label className="field field-full">
            <span>{messages.lookingForLabel} <small>{messages.optional}</small></span>
            <input maxLength={160} placeholder={messages.lookingForPlaceholder} value={fields.lookingFor} onChange={event => change('lookingFor', event.target.value)} />
          </label>}

          <div className="field field-full">
            <label htmlFor={`${id}-about`}>{messages.aboutLabel}</label>
            <textarea {...control('about')} rows={2} maxLength={400} placeholder={messages.aboutPlaceholder} onChange={event => change('about', event.target.value)} />
            {fieldError('about')}
          </div>
        </div>
        <div className="form-footer">
          <button type="submit" className="primary-button">{messages.submit}</button>
          <span>{messages.privacyNote}</span>
        </div>
      </div>
    </form>
  )
}
