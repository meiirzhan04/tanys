import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, MouseEvent, SelectHTMLAttributes } from 'react'

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
}

export function CustomSelect({
  options,
  placeholder,
  value,
  onChange,
  disabled,
  className = '',
  ...selectProps
}: CustomSelectProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleOutside(event: globalThis.MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  function handleMouseDown(event: MouseEvent<HTMLSelectElement>) {
    if (disabled) return
    // Prevent native OS Win32 dropdown popup and open custom Gcore popover instead
    event.preventDefault()
    event.currentTarget.focus()
    setOpen(current => !current)
  }

  function handleNativeChange(event: ChangeEvent<HTMLSelectElement>) {
    onChange(event.target.value)
    setOpen(false)
  }

  return (
    <div
      ref={rootRef}
      className={`custom-select ${open ? 'custom-select--open' : ''} ${disabled ? 'custom-select--disabled' : ''} ${className}`.trim()}
    >
      <div className="custom-select__control">
        <select
          {...selectProps}
          value={value}
          disabled={disabled}
          onMouseDown={handleMouseDown}
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
        <div className="custom-select__menu" aria-hidden="true">
          {options.map(opt => {
            const active = opt.value === value
            return (
              <div
                key={opt.value}
                className={`custom-select__option ${active ? 'custom-select__option--active' : ''}`}
                onMouseDown={event => {
                  event.preventDefault()
                  onChange(opt.value)
                  setOpen(false)
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
