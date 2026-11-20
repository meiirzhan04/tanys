import { CustomSelect } from './CustomSelect'
import { QUARTER_HOUR_TIMES, isQuarterHourTime } from '../scheduling/timeStep'

const OPTIONS = QUARTER_HOUR_TIMES.map(time => ({ value: time, label: time }))

interface TimeSelectProps {
  id?: string
  name: string
  value: string
  placeholder: string
  /** Label for a saved off-grid time, e.g. "09:46 — недопустимо". It is shown as is and never rounded. */
  legacyLabel: (time: string) => string
  disabled?: boolean
  required?: boolean
  onChange: (value: string) => void
  /** Limits the list, e.g. to the event window. The current value always stays listed. */
  isAllowed?: (time: string) => boolean
  'aria-describedby'?: string
}

/** Time picker limited to 15-minute steps. A saved legacy value stays visible until the user picks a valid one. */
export function TimeSelect({ legacyLabel, value, isAllowed, ...props }: TimeSelectProps) {
  const legacy = value !== '' && !isQuarterHourTime(value)
  const allowed = isAllowed ? OPTIONS.filter(option => option.value === value || isAllowed(option.value)) : OPTIONS
  const options = legacy ? [{ value, label: legacyLabel(value) }, ...allowed] : allowed
  const highlight = allowed.some(option => option.value === '09:00') ? '09:00' : allowed[0]?.value
  return (
    <CustomSelect
      {...props}
      value={value}
      options={options}
      initialHighlight={highlight}
      aria-invalid={legacy || undefined}
      className={legacy ? 'custom-select--legacy' : ''}
    />
  )
}
