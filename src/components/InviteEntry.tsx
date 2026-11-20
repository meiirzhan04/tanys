import { useState } from 'react'
import { parseInviteLocation } from '../api/inviteRoute'
import { getMessages } from '../i18n/messages'
import type { Locale } from '../matching/types'

export function InviteEntry({ locale }: { locale: Locale }) {
  const t = getMessages(locale).account
  const [link, setLink] = useState('')
  const [invalid, setInvalid] = useState(false)
  return <form className="auth-form" onSubmit={event => {
    event.preventDefault()
    try {
      const url = new URL(link.trim())
      const target = parseInviteLocation(url.pathname, url.search)
      if (url.origin === location.origin && target?.token) {
        location.assign(`/invite/${encodeURIComponent(target.eventId)}/${encodeURIComponent(target.token)}`)
        return
      }
    } catch { /* A pasted string may not be a URL. */ }
    setInvalid(true)
  }}>
    <label className="field"><span>{t.inviteLink}</span>
      <input type="text" inputMode="url" autoCapitalize="none" value={link} required
        onChange={event => { setLink(event.target.value); setInvalid(false) }} />
    </label>
    {invalid && <p className="field-error" role="alert">{t.inviteInvalid}</p>}
    <button className="primary-button" type="submit">{t.joinWithLink}</button>
  </form>
}
