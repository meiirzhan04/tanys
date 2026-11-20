import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Goal, ProfileInput } from '../matching/types'
import { goalLabels } from './goalLabels'
import type { ProfileFormProps } from './props'

type Fields = { goal: Goal | ''; role: string; experience: string; skills: string; interests: string; about: string; lookingFor: string }

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

function validateText(event: FormEvent<HTMLInputElement | HTMLTextAreaElement>) {
  const field = event.currentTarget
  field.setCustomValidity(!field.value.trim() ? 'Заполните это поле.' : '')
}

export function ProfileForm({ initialProfile, onSubmit, example }: ProfileFormProps & { example: ProfileInput }) {
  const [fields, setFields] = useState(() => toFields(initialProfile))
  const showLookingFor = fields.goal === 'hire' || fields.goal === 'find_cofounder' || fields.goal === 'find_mentor'

  const change = (field: keyof Fields, value: string) => setFields(current => ({ ...current, [field]: value }))

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!fields.goal) return

    const skills = topics(fields.skills)
    const interests = topics(fields.interests)
    for (const [name, values] of [['skills', skills], ['interests', interests]] as const) {
      if (values.length) continue
      const field = event.currentTarget.elements.namedItem(name) as HTMLInputElement
      field.setCustomValidity('Введите хотя бы один пункт.')
      field.reportValidity()
      return
    }

    onSubmit({
      goal: fields.goal,
      role: fields.role.trim(),
      skills,
      interests,
      experienceYears: Number(fields.experience),
      about: fields.about.trim(),
      ...(showLookingFor && fields.lookingFor.trim() ? { lookingFor: topics(fields.lookingFor) } : {}),
    })
  }

  return (
    <form className="profile-form surface" aria-labelledby="profile-title" onSubmit={submit}>
      <div className="form-heading">
        <h2 id="profile-title">Ваш профиль</h2>
        <button className="text-button" type="button" onClick={event => {
          const controls = event.currentTarget.form?.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea')
          controls?.forEach(control => control.setCustomValidity(''))
          setFields(toFields(example))
        }}>Заполнить пример <span aria-hidden="true">↗</span></button>
      </div>

      <div className="form-fields">
        <label className="field field-full">
          <span>Цель знакомства</span>
          <select required value={fields.goal} onChange={event => change('goal', event.target.value)}>
            <option disabled value="">Выберите цель</option>
            {Object.entries(goalLabels).map(([goal, label]) => <option key={goal} value={goal}>{label}</option>)}
          </select>
        </label>

        <label className="field">
          <span>Роль</span>
          <input required maxLength={80} placeholder="Например, Backend-разработчик" value={fields.role} onInput={validateText} onChange={event => change('role', event.target.value)} />
        </label>
        <label className="field">
          <span>Опыт в годах</span>
          <input required type="number" min={0} max={60} placeholder="0" value={fields.experience} onChange={event => change('experience', event.target.value)} />
        </label>
        <label className="field">
          <span>Стек и навыки</span>
          <input name="skills" required maxLength={160} placeholder="Python, FastAPI, PostgreSQL" value={fields.skills} onInput={validateText} onChange={event => change('skills', event.target.value)} />
        </label>
        <label className="field">
          <span>Интересы</span>
          <input name="interests" required maxLength={160} placeholder="Стартапы, API, DevOps" value={fields.interests} onInput={validateText} onChange={event => change('interests', event.target.value)} />
        </label>

        {showLookingFor && <label className="field field-full">
          <span>Какие навыки ищете <small>необязательно</small></span>
          <input maxLength={160} placeholder="Например, React, продажи" value={fields.lookingFor} onChange={event => change('lookingFor', event.target.value)} />
        </label>}

        <label className="field field-full">
          <span>О себе</span>
          <textarea required rows={2} maxLength={400} placeholder="Что вы делаете и о чём хотите поговорить?" value={fields.about} onInput={validateText} onChange={event => change('about', event.target.value)} />
        </label>
      </div>
      <div className="form-footer">
        <button type="submit" className="primary-button">Найти людей <span aria-hidden="true">→</span></button>
        <span>Анкета остаётся в этой вкладке.</span>
      </div>
    </form>
  )
}
