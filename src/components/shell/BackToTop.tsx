import { useEffect, useState } from 'react'
import type { Locale } from '../../matching/types'
import { shellCopy } from '../connections/connectionsCopy'

const SHOW_AFTER_PX = 420

/**
 * Floating "Back to top" for the page scroller (window). It only listens to passive scroll events,
 * hides while a modal dialog is open, and jumps instantly when the user prefers reduced motion.
 */
export function BackToTop({ locale }: { locale: Locale }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => setVisible(window.scrollY > SHOW_AFTER_PX))
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', update)
    }
  }, [])

  function scrollUp() {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, left: 0, behavior: reduce ? 'instant' : 'smooth' })
    const heading = document.querySelector<HTMLElement>('main h1, h1')
    heading?.focus({ preventScroll: true })
  }

  const label = shellCopy[locale].backToTop
  return (
    <button
      type="button"
      className={`back-to-top ${visible ? 'back-to-top--visible' : ''}`}
      aria-label={label}
      title={label}
      tabIndex={visible ? 0 : -1}
      aria-hidden={visible ? undefined : true}
      onClick={scrollUp}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
        <path d="M12 19V5m0 0-6 6m6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}
