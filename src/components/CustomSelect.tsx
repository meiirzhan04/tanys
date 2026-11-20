import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ChangeEvent, KeyboardEvent, MouseEvent, SelectHTMLAttributes } from 'react'

export interface CustomSelectOption {
  value: string
  label: string
  badge?: string
}

interface CustomSelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  options: readonly CustomSelectOption[]
  placeholder?: string
  value: string
  onChange: (value: string) => void
  /** Option to highlight when nothing is selected yet, e.g. 09:00 in a long time list. */
  initialHighlight?: string
}

const MENU_MAX_HEIGHT = 280

/**
 * A native <select> (kept for forms, tests and assistive tech) with an app-styled popover instead of the
 * OS dropdown. Mouse, touch and keyboard (Enter/Space/Alt+ArrowDown to open, arrows, Home/End, Enter, Escape) work.
 */
export function CustomSelect({
  options,
  placeholder,
  value,
  onChange,
  disabled,
  className = '',
  initialHighlight,
  ...selectProps
}: CustomSelectProps) {
  const [open, setOpen] = useState(false)
  const [openUp, setOpenUp] = useState(false)
  const [alignEnd, setAlignEnd] = useState(false)
  const [highlight, setHighlight] = useState(-1)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const selectRef = useRef<HTMLSelectElement>(null)

  useEffect(() => {
    if (!open) return
    function handleOutside(event: globalThis.MouseEvent | TouchEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('touchstart', handleOutside)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('touchstart', handleOutside)
    }
  }, [open])

  // Flip above the control when there is not enough room below (e.g. near the bottom of a phone screen).
  useLayoutEffect(() => {
    if (!open || !rootRef.current) return
    const rect = rootRef.current.getBoundingClientRect()
    const below = window.innerHeight - rect.bottom
    setOpenUp(below < Math.min(MENU_MAX_HEIGHT, options.length * 47) + 12 && rect.top > below)
  }, [open, options.length])

  useLayoutEffect(() => {
    if (!open || !rootRef.current || !menuRef.current) return
    const root = rootRef.current.getBoundingClientRect()
    const width = menuRef.current.getBoundingClientRect().width
    setAlignEnd(root.left + width > window.innerWidth - 8 && root.right - width >= 8)
  }, [open, options])

  useEffect(() => {
    if (!open || highlight < 0) return
    const menu = menuRef.current
    const item = menu?.children[highlight] as HTMLElement | undefined
    // Scroll only the list (never the page) so the highlighted option sits in the middle.
    if (menu && item) menu.scrollTop = item.offsetTop - (menu.clientHeight - item.offsetHeight) / 2
  }, [open, highlight])

  function openMenu() {
    if (disabled) return
    const selected = options.findIndex(opt => opt.value === value)
    const fallback = initialHighlight ? options.findIndex(opt => opt.value === initialHighlight) : -1
    setHighlight(Math.max(0, selected >= 0 ? selected : fallback))
    setOpen(true)
  }

  function choose(index: number) {
    const option = options[index]
    if (option) onChange(option.value)
    setOpen(false)
    selectRef.current?.focus()
  }

  function handleMouseDown(event: MouseEvent<HTMLSelectElement>) {
    if (disabled) return
    // Keep the OS dropdown closed and toggle the app popover instead.
    event.preventDefault()
    event.currentTarget.focus()
    if (open) setOpen(false)
    else openMenu()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLSelectElement>) {
    if (disabled) return
    const { key } = event
    if (!open) {
      if (key === 'Enter' || key === ' ' || (key === 'ArrowDown' && event.altKey) || key === 'F4') {
        event.preventDefault()
        openMenu()
      }
      return
    }
    if (key === 'Escape' || key === 'Tab') {
      if (key === 'Escape') event.preventDefault()
      setOpen(false)
    } else if (key === 'ArrowDown' || key === 'ArrowUp') {
      event.preventDefault()
      const step = key === 'ArrowDown' ? 1 : -1
      setHighlight(current => Math.min(options.length - 1, Math.max(0, current + step)))
    } else if (key === 'Home' || key === 'End') {
      event.preventDefault()
      setHighlight(key === 'Home' ? 0 : options.length - 1)
    } else if (key === 'Enter' || key === ' ') {
      event.preventDefault()
      choose(highlight)
    }
  }

  function handleNativeChange(event: ChangeEvent<HTMLSelectElement>) {
    onChange(event.target.value)
    setOpen(false)
  }

  return (
    <div
      ref={rootRef}
      className={`custom-select ${open ? 'custom-select--open' : ''} ${openUp ? 'custom-select--up' : ''} ${alignEnd ? 'custom-select--align-end' : ''} ${disabled ? 'custom-select--disabled' : ''} ${className}`.trim()}
    >
      <div className="custom-select__control">
        <select
          {...selectProps}
          ref={selectRef}
          value={value}
          disabled={disabled}
          aria-expanded={open}
          onMouseDown={handleMouseDown}
          onKeyDown={handleKeyDown}
          onChange={handleNativeChange}
        >
          {placeholder !== undefined && (
            <option disabled value="">
              {placeholder}
            </option>
          )}
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className="custom-select__arrow" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M4 6.25L8 10.25L12 6.25"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>

      {open && !disabled && (
        <div ref={menuRef} className="custom-select__menu" aria-hidden="true">
          {options.map((opt, index) => {
            const active = opt.value === value
            return (
              <div
                key={opt.value}
                className={`custom-select__option ${active ? 'custom-select__option--active' : ''} ${index === highlight ? 'custom-select__option--highlight' : ''}`}
                onMouseEnter={() => setHighlight(index)}
                onMouseDown={event => {
                  event.preventDefault()
                  choose(index)
                }}
              >
                <span className="custom-select__dot" />
                <span className="custom-select__label">{opt.label}</span>
                {opt.badge && <span className="custom-select__badge">{opt.badge}</span>}
                {active && (
                  <svg className="custom-select__check" width="15" height="15" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M3.5 8.5L6.5 11.5L12.5 4.5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
