import { useEffect, useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { Locale } from '../../matching/types'
import { TanysWordmark } from '../brand/TanysLogo'
import { shellCopy } from '../connections/connectionsCopy'

export const SUPPORT_EMAIL = 'tanys.hrr@gmail.com'

/** Compact product footer: brand, year, and real "About" and "Support" content in dialogs. */
export function SiteFooter({ locale }: { locale: Locale }) {
  const t = shellCopy[locale]
  const [open, setOpen] = useState<'about' | 'support' | null>(null)

  return (
    <footer className="site-footer">
      <div className="site-width site-footer__inner">
        <div className="site-footer__brand">
          <TanysWordmark size={22} />
          <span>{t.footerTagline}</span>
        </div>
        <nav className="site-footer__links" aria-label={t.about}>
          <button type="button" className="footer-link" onClick={() => setOpen('about')}>{t.about}</button>
          <button type="button" className="footer-link" data-footer="support" onClick={() => setOpen('support')}>{t.support}</button>
        </nav>
        <p className="site-footer__meta">
          © {new Date().getFullYear()} Tanys
        </p>
      </div>
      {open === 'about' && (
        <InfoDialog title={t.aboutTitle} closeLabel={t.close} onClose={() => setOpen(null)}>
          {t.aboutBody.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
        </InfoDialog>
      )}
      {open === 'support' && (
        <InfoDialog title={t.supportTitle} closeLabel={t.close} onClose={() => setOpen(null)}>
          <p>{t.supportEvent}</p>
          <p>{t.supportPlatform}</p>
          <p className="support-email">
            <span className="visually-hidden">{t.supportEmailLabel}: </span>
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
          </p>
        </InfoDialog>
      )}
    </footer>
  )
}

function InfoDialog({ title, closeLabel, onClose, children }: { title: string; closeLabel: string; onClose: () => void; children: ReactNode }) {
  const id = useId()
  const closeRef = useRef<HTMLButtonElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    returnFocus.current = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      returnFocus.current?.focus()
    }
  }, [onClose])

  return createPortal(
    <div className="qr-modal-backdrop" role="presentation" onClick={event => { if (event.target === event.currentTarget) onClose() }}>
      <div className="qr-modal surface info-dialog" role="dialog" aria-modal="true" aria-labelledby={`${id}-title`}>
        <h2 id={`${id}-title`}>{title}</h2>
        <div className="info-dialog__body">{children}</div>
        <div className="confirm-dialog__actions">
          <button ref={closeRef} type="button" className="secondary-button" onClick={onClose}>{closeLabel}</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
