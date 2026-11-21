import { useState } from 'react'
import type { AccountProfile } from '../../api/client'
import { getMessages } from '../../i18n/messages'
import type { Locale } from '../../matching/types'
import type { EventProfileDraft } from '../profileDirty'
import { accountLabels } from './accountLabels'
import { EventQuestionnaireFields, validateDraft } from './EventQuestionnaireFields'
import { identityCopy } from './identityCopy'
import { profileCopy } from './profileCopy'
import { ProfileEditDialog } from './ProfileEditDialog'
import { profileEditorCopy } from './profileEditorCopy'

interface EditorProps { locale: Locale; onClose: () => void }

export function PersonalEditor({ locale, initial, saved, onSave, onClose }: EditorProps & {
  initial: AccountProfile
  saved: AccountProfile
  onSave: (profile: AccountProfile) => Promise<void>
}) {
  const [draft, setDraft] = useState(initial)
  const t = accountLabels[locale]
  const dirty = draft.name !== saved.name || draft.profession !== saved.profession || draft.about !== saved.about
  return <ProfileEditDialog locale={locale} title={profileEditorCopy[locale].personal} dirty={dirty} onClose={onClose}
    onSave={async form => {
      if (!draft.name.trim()) {
        form.querySelector<HTMLInputElement>('[name=accountName]')?.focus()
        return getMessages(locale).account.errors.nameRequired
      }
      await onSave(draft)
      return ''
    }}>
    <label className="field"><span>{t.name}</span><input name="accountName" autoComplete="name" required maxLength={80}
      value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></label>
    <label className="field"><span>{t.profession}</span><input name="accountProfession" maxLength={80}
      value={draft.profession} onChange={e => setDraft({ ...draft, profession: e.target.value })} /></label>
    <label className="field"><span>{profileCopy[locale].about}</span><textarea name="accountAbout" rows={5} maxLength={400}
      value={draft.about} onChange={e => setDraft({ ...draft, about: e.target.value })} /></label>
  </ProfileEditDialog>
}

export function IdentityEditor({ locale, kind, initial, onSave, onClose }: EditorProps & {
  kind: 'handle' | 'contact'
  initial: string
  onSave: (value: string) => Promise<string>
}) {
  const [value, setValue] = useState(initial)
  const t = identityCopy[locale]
  const contact = kind === 'contact'
  return <ProfileEditDialog locale={locale} title={contact ? t.editContact : t.editHandle} dirty={initial !== value}
    onSave={() => onSave(value.trim())} onClose={onClose}>
    <label className="field">
      <span>{contact ? t.contactLabel : t.handleLabel}</span>
      <input name={contact ? 'profileContact' : 'handle'} maxLength={contact ? 256 : 33}
        placeholder={contact ? t.contactPlaceholder : undefined} value={value} onChange={e => setValue(e.target.value)} />
      <small>{contact ? t.contactHelp : t.handleRules}</small>
    </label>
  </ProfileEditDialog>
}

export function EventEditor({ locale, initial, eventName, onSave, onClose }: EditorProps & {
  initial: EventProfileDraft
  eventName?: string
  onSave: (value: EventProfileDraft) => Promise<void>
}) {
  const [draft, setDraft] = useState(initial)
  const [validate, setValidate] = useState(false)
  const errors = validateDraft(draft, locale)
  return <ProfileEditDialog locale={locale} title={[accountLabels[locale].event, eventName].filter(Boolean).join(' · ')}
    dirty={Object.keys(initial).some(key => initial[key as keyof EventProfileDraft] !== draft[key as keyof EventProfileDraft])}
    onClose={onClose} onSave={async form => {
      const first = Object.keys(errors)[0] as keyof typeof errors | undefined
      if (first) {
        setValidate(true)
        const field = form.elements.namedItem(first)
        if (field instanceof HTMLElement) field.focus()
        return errors[first]!
      }
      await onSave(draft)
      return ''
    }}>
    <EventQuestionnaireFields locale={locale} draft={draft} errors={validate ? errors : {}}
      updateField={(key, value) => setDraft(current => ({ ...current, [key]: value }))} />
  </ProfileEditDialog>
}
