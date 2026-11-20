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
  'aria-describedby'?: string
}

/** Time picker limited to 15-minute steps. A saved legacy value stays visible until the user picks a valid one. */
export function TimeSelect({ legacyLabel, value, ...props }: TimeSelectProps) {
  const legacy = value !== '' && !isQuarterHourTime(value)
  const options = legacy ? [{ value, label: legacyLabel(value) }, ...OPTIONS] : OPTIONS
  return (
    <CustomSelect
      {...props}
      value={value}
      options={options}
      initialHighlight="09:00"
      aria-invalid={legacy || undefined}
      className={legacy ? 'custom-select--legacy' : ''}
    />
  )
}
