import { useEffect } from 'react'
import type { RefObject } from 'react'

/**
 * Adds `is-revealed` to every `[data-reveal]` element inside the root once it
 * scrolls into view. Without IntersectionObserver everything is revealed at once.
 */
export function useReveal(rootRef: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const targets = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'))
    if (typeof IntersectionObserver === 'undefined') {
      targets.forEach(target => target.classList.add('is-revealed'))
      return
    }
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.classList.add('is-revealed')
          observer.unobserve(entry.target)
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    )
    targets.forEach(target => observer.observe(target))
    return () => observer.disconnect()
  }, [rootRef])
}
