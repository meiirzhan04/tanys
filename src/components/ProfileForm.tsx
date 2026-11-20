import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import type { Goal, ProfileInput } from '../matching/types'
import { goalLabels } from './goalLabels'
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

function validate(fields: Fields): Errors {
  const errors: Errors = {}
  const experience = Number(fields.experience)
  if (!fields.goal) errors.goal = 'Выберите цель знакомства.'
  if (!fields.role.trim()) errors.role = 'Укажите вашу роль.'
  if (!fields.experience || !Number.isInteger(experience) || experience < 0 || experience > 60) {
    errors.experience = 'Введите целое число от 0 до 60.'
  }
  if (!topics(fields.skills).length) errors.skills = 'Введите хотя бы один навык.'
  if (!topics(fields.interests).length) errors.interests = 'Введите хотя бы один интерес.'
  if (!fields.about.trim()) errors.about = 'Кратко расскажите о себе.'
  return errors
}

export function ProfileForm({ initialProfile, onSubmit, example }: ProfileFormProps & { example: ProfileInput }) {
  const id = useId()
  const [fields, setFields] = useState(() => toFields(initialProfile))
  const [showErrors, setShowErrors] = useState(false)
  const errors = showErrors ? validate(fields) : {}
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
    const firstInvalid = Object.keys(validate(fields))[0]
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

  return (
    <form className="profile-form" aria-labelledby="profile-title" noValidate onSubmit={submit}>
      <div className="page-heading">
        <div>
          <h1 id="profile-title">Анкета участника</h1>
          <p>Укажите цель знакомства, навыки и интересы для подбора.</p>
        </div>
        <button className="secondary-button" type="button" onClick={() => {
          setFields(toFields(example))
          setShowErrors(false)
        }}>Заполнить пример</button>
      </div>

      <div className="form-panel surface">
        <div className="form-fields">
          <div className="field field-full">
            <label htmlFor={`${id}-goal`}>Цель знакомства</label>
            <select {...control('goal')} onChange={event => change('goal', event.target.value)}>
              <option disabled value="">Выберите цель</option>
              {Object.entries(goalLabels).map(([goal, label]) => <option key={goal} value={goal}>{label}</option>)}
            </select>
            {fieldError('goal')}
          </div>

          <div className="field">
            <label htmlFor={`${id}-role`}>Роль</label>
            <input {...control('role')} maxLength={80} placeholder="Например, Backend-разработчик" onChange={event => change('role', event.target.value)} />
            {fieldError('role')}
          </div>
          <div className="field">
            <label htmlFor={`${id}-experience`}>Опыт в годах</label>
            <input {...control('experience')} type="number" min={0} max={60} placeholder="0" onChange={event => change('experience', event.target.value)} />
            {fieldError('experience')}
          </div>
          <div className="field">
            <label htmlFor={`${id}-skills`}>Стек и навыки</label>
            <input {...control('skills')} maxLength={160} placeholder="Python, FastAPI, PostgreSQL" onChange={event => change('skills', event.target.value)} />
            {fieldError('skills')}
          </div>
          <div className="field">
            <label htmlFor={`${id}-interests`}>Интересы</label>
            <input {...control('interests')} maxLength={160} placeholder="Стартапы, API, DevOps" onChange={event => change('interests', event.target.value)} />
            {fieldError('interests')}
          </div>

          {showLookingFor && <label className="field field-full">
            <span>Какие навыки ищете <small>необязательно</small></span>
            <input maxLength={160} placeholder="Например, React, продажи" value={fields.lookingFor} onChange={event => change('lookingFor', event.target.value)} />
          </label>}

          <div className="field field-full">
            <label htmlFor={`${id}-about`}>О себе</label>
            <textarea {...control('about')} rows={2} maxLength={400} placeholder="Что вы делаете и о чём хотите поговорить?" onChange={event => change('about', event.target.value)} />
            {fieldError('about')}
          </div>
        </div>
        <div className="form-footer">
          <button type="submit" className="primary-button">Найти участников</button>
          <span>Анкета остаётся в этой вкладке.</span>
        </div>
      </div>
    </form>
  )
}
