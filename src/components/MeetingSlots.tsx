import { getMessages } from '../i18n/messages'
import type { Locale } from '../matching/types'
import {
  EVENT_TIMEZONE_LABEL,
  formatSlotLabel,
  getSlotAvailabilityForCandidate,
  type MeetingBooking,
} from '../scheduling/slots'
import './MeetingSlots.css'

export interface CandidateMeetingPickerProps {
  candidateId: string
  candidateName: string
  candidateRole?: string
  bookings: readonly MeetingBooking[]
  onBook: (candidate: { id: string; name: string; role?: string }, slotId: string) => void
  onCancel: (slotId: string) => void
  locale?: Locale
}

export interface SchedulePanelProps {
  bookings: readonly MeetingBooking[]
  onCancel: (slotId: string) => void
  locale?: Locale
}

/** Displays intersecting 1:1 free slots for a candidate and handles conflicts. */
export function CandidateMeetingPicker({
  candidateId,
  candidateName,
  candidateRole,
  bookings,
  onBook,
  onCancel,
  locale = 'ru',
}: CandidateMeetingPickerProps) {
  const options = getSlotAvailabilityForCandidate(candidateId, bookings)
  const t = getMessages(locale).meetings

  return (
    <div className="meeting-picker" aria-label={t.pickerAriaLabel(candidateName)}>
      <div className="meeting-picker__header">
        <span className="meeting-picker__title">{t.title}</span>
        <span className="meeting-picker__tz">{EVENT_TIMEZONE_LABEL}</span>
      </div>

      {options.length === 0 ? (
        <p className="meeting-picker__empty">
          {t.noCommonSlots}
        </p>
      ) : (
        <div className="meeting-picker__slots">
          {options.map(({ slot, status, conflictBooking }) => {
            if (status === 'booked_with_candidate') {
              return (
                <div key={slot.id} className="meeting-slot-booked">
                  <button
                    type="button"
                    className="meeting-slot-btn meeting-slot-btn--booked"
                    disabled
                    aria-disabled="true"
                  >
                    {slot.label} · {t.bookedSuffix}
                  </button>
                  <button
                    type="button"
                    className="meeting-slot-cancel"
                    onClick={() => onCancel(slot.id)}
                  >
                    {t.cancel}
                  </button>
                </div>
              )
            }

            const isConflict = status === 'conflict'
            return (
              <button
                key={slot.id}
                type="button"
                className={`meeting-slot-btn ${isConflict ? 'meeting-slot-btn--conflict' : ''}`}
                disabled={isConflict}
                title={
                  isConflict && conflictBooking
                    ? t.busyTitle(conflictBooking.candidateName)
                    : t.selectTitle(slot.label)
                }
                onClick={() =>
                  onBook({ id: candidateId, name: candidateName, role: candidateRole }, slot.id)
                }
              >
                {slot.label}
                {isConflict && conflictBooking ? t.busyInline(conflictBooking.candidateName) : ''}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

/** Shows the participant's scheduled 1:1 meetings with cancel actions. */
export function SchedulePanel({ bookings, onCancel, locale = 'ru' }: SchedulePanelProps) {
  const t = getMessages(locale).meetings

  return (
    <section className="schedule-panel" aria-label={t.scheduleTitle}>
      <div className="schedule-panel__header">
        <h2 className="schedule-panel__title">{t.scheduleTitle}</h2>
        <span className="meeting-picker__tz">{EVENT_TIMEZONE_LABEL}</span>
      </div>

      {bookings.length === 0 ? (
        <p className="schedule-panel__empty">
          {t.scheduleEmpty}
        </p>
      ) : (
        <ul className="schedule-panel__list">
          {bookings.map((booking) => (
            <li key={booking.slotId} className="schedule-panel__item">
              <div className="schedule-panel__meta">
                <strong>{formatSlotLabel(booking.slotId)}</strong>
                <span>
                  {booking.candidateName}
                  {booking.candidateRole ? ` · ${booking.candidateRole}` : ''}
                </span>
              </div>
              <button
                type="button"
                className="meeting-slot-cancel"
                onClick={() => onCancel(booking.slotId)}
              >
                {t.cancel}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
