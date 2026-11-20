import { useId } from 'react'
import { getMessages } from '../../i18n/messages'
import type { Goal, Locale } from '../../matching/types'
import { CustomSelect } from '../CustomSelect'
import { getGoalLabels } from '../goalLabels'
import { parseProfileTopics } from '../profileDirty'
import type { EventProfileDraft } from '../profileDirty'

type ProfileErrorField = 'name' | 'goal' | 'role' | 'experience' | 'skills' | 'interests' | 'about' | 'consent'
type ProfileErrors = Partial<Record<ProfileErrorField, string>>

export function usesLookingFor(goal: EventProfileDraft['goal']) {
  return goal === 'find_job' || goal === 'hire' || goal === 'find_cofounder' || goal === 'find_mentor'
}

export function validateDraft(draft: EventProfileDraft, locale: Locale): ProfileErrors {
  const formErrors = getMessages(locale).form.errors
  const accountErrors = getMessages(locale).account.errors
  const errors: ProfileErrors = {}
  const experience = Number(draft.experience)

  if (!draft.name.trim()) errors.name = accountErrors.nameRequired
  if (!draft.goal) errors.goal = formErrors.goal
  if (!draft.role.trim()) errors.role = formErrors.role
  if (!draft.experience || !Number.isInteger(experience) || experience < 0 || experience > 60) {
    errors.experience = formErrors.experience
  }
  if (!parseProfileTopics(draft.skills).length) errors.skills = formErrors.skills
  if (!parseProfileTopics(draft.interests).length) errors.interests = formErrors.interests
  if (!draft.about.trim()) errors.about = formErrors.about
  if (!draft.consentAccepted) errors.consent = accountErrors.consentRequired
  return errors
}

interface Props {
  locale: Locale
  draft: EventProfileDraft
  errors: ProfileErrors
  disabled?: boolean
  updateField: <K extends keyof EventProfileDraft>(key: K, value: EventProfileDraft[K]) => void
}

export function EventQuestionnaireFields({ locale, draft, errors, disabled, updateField }: Props) {
  const id = useId()
  const { form: formText, account: t } = getMessages(locale)
  const goalLabels = getGoalLabels(locale)
  const showLookingFor = usesLookingFor(draft.goal)
  return (
    <div className="form-fields">
      <div className="field">
        <label htmlFor={`${id}-name`}>{t.nameLabel}</label>
        <input
          id={`${id}-name`}
          name="name"
          required
          maxLength={80}
          disabled={disabled}
          placeholder={t.namePlaceholder}
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? `${id}-name-error` : undefined}
          value={draft.name}
          onChange={event => updateField('name', event.target.value)}
        />
        {errors.name && <span id={`${id}-name-error`} className="field-error">{errors.name}</span>}
      </div>

      <div className="field">
        <label htmlFor={`${id}-goal`}>{formText.goalLabel}</label>
        <CustomSelect
          id={`${id}-goal`}
          name="goal"
          required
          disabled={disabled}
          aria-invalid={errors.goal ? true : undefined}
          aria-describedby={errors.goal ? `${id}-goal-error` : undefined}
          value={draft.goal}
          placeholder={formText.goalPlaceholder}
          options={Object.entries(goalLabels).map(([goal, label]) => ({ value: goal, label }))}
          onChange={val => updateField('goal', val as Goal | '')}
        />
        {errors.goal && <span id={`${id}-goal-error`} className="field-error">{errors.goal}</span>}
      </div>

      <div className="field">
        <label htmlFor={`${id}-role`}>{formText.roleLabel}</label>
        <input
          id={`${id}-role`}
          name="role"
          required
          maxLength={80}
          disabled={disabled}
          placeholder={formText.rolePlaceholder}
          aria-invalid={errors.role ? true : undefined}
          aria-describedby={errors.role ? `${id}-role-error` : undefined}
          value={draft.role}
          onChange={event => updateField('role', event.target.value)}
        />
        {errors.role && <span id={`${id}-role-error`} className="field-error">{errors.role}</span>}
      </div>

      <div className="field">
        <label htmlFor={`${id}-experience`}>{formText.experienceLabel}</label>
        <input
          id={`${id}-experience`}
          name="experience"
          type="number"
          min={0}
          max={60}
          required
          disabled={disabled}
          placeholder="0"
          aria-invalid={errors.experience ? true : undefined}
          aria-describedby={errors.experience ? `${id}-experience-error` : undefined}
          value={draft.experience}
          onChange={event => updateField('experience', event.target.value)}
        />
        {errors.experience && <span id={`${id}-experience-error`} className="field-error">{errors.experience}</span>}
      </div>

      <div className="field">
        <label htmlFor={`${id}-skills`}>{formText.skillsLabel}</label>
        <input
          id={`${id}-skills`}
          name="skills"
          required
          maxLength={160}
          disabled={disabled}
          placeholder={formText.skillsPlaceholder}
          aria-invalid={errors.skills ? true : undefined}
          aria-describedby={errors.skills ? `${id}-skills-error` : undefined}
          value={draft.skills}
          onChange={event => updateField('skills', event.target.value)}
        />
        {errors.skills && <span id={`${id}-skills-error`} className="field-error">{errors.skills}</span>}
      </div>

      <div className="field">
        <label htmlFor={`${id}-interests`}>{formText.interestsLabel}</label>
        <input
          id={`${id}-interests`}
          name="interests"
          required
          maxLength={160}
          disabled={disabled}
          placeholder={formText.interestsPlaceholder}
          aria-invalid={errors.interests ? true : undefined}
          aria-describedby={errors.interests ? `${id}-interests-error` : undefined}
          value={draft.interests}
          onChange={event => updateField('interests', event.target.value)}
        />
        {errors.interests && <span id={`${id}-interests-error`} className="field-error">{errors.interests}</span>}
      </div>

      {showLookingFor && (
        <label className="field field-full">
          <span>
            {draft.goal === 'find_job' ? formText.findJobLookingForLabel : formText.lookingForLabel}{' '}
            <small>{formText.optional}</small>
          </span>
          <input
            name="lookingFor"
            maxLength={160}
            disabled={disabled}
            placeholder={
              draft.goal === 'find_job'
                ? formText.findJobLookingForPlaceholder
                : formText.lookingForPlaceholder
            }
            value={draft.lookingFor}
            onChange={event => updateField('lookingFor', event.target.value)}
          />
          {draft.goal === 'hire' && !draft.lookingFor.trim() && (
            <span className="field-hint">{formText.hireLookingForHint}</span>
          )}
        </label>
      )}

      <div className="field field-full">
        <label htmlFor={`${id}-about`}>{formText.aboutLabel}</label>
        <textarea
          id={`${id}-about`}
          name="about"
          rows={2}
          maxLength={400}
          required
          disabled={disabled}
          placeholder={formText.aboutPlaceholder}
          aria-invalid={errors.about ? true : undefined}
          aria-describedby={errors.about ? `${id}-about-error` : undefined}
          value={draft.about}
          onChange={event => updateField('about', event.target.value)}
        />
        {errors.about && <span id={`${id}-about-error`} className="field-error">{errors.about}</span>}
      </div>

      <div className="field field-full privacy-box">
        <span className="privacy-box__heading">{t.visibilityHeading}</span>
        <label className="checkbox-row">
          <input
            type="checkbox"
            name="visible"
            disabled={disabled}
            checked={draft.visible}
            onChange={event => updateField('visible', event.target.checked)}
          />
          <span>{t.visibilityToggleLabel}</span>
        </label>
        <p className="privacy-box__note">{t.visibilityNotice}</p>
        {!draft.visible && (
          <p className="field-hint privacy-box__warning">{t.hiddenProfileWarning}</p>
        )}
      </div>

      <div className="field field-full">
        <label className="checkbox-row">
          <input
            id={`${id}-consent`}
            type="checkbox"
            name="consent"
            required
            disabled={disabled}
            aria-invalid={errors.consent ? true : undefined}
            aria-describedby={errors.consent ? `${id}-consent-error` : undefined}
            checked={draft.consentAccepted}
            onChange={event => updateField('consentAccepted', event.target.checked)}
          />
          <span className="consent-text">{t.consentLabel}</span>
        </label>
        {errors.consent && <span id={`${id}-consent-error`} className="field-error">{errors.consent}</span>}
      </div>
    </div>
  )
}
