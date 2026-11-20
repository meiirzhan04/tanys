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
}

export interface SchedulePanelProps {
  bookings: readonly MeetingBooking[]
  onCancel: (slotId: string) => void
}

/** Displays intersecting 1:1 free slots for a candidate and handles conflicts. */
export function CandidateMeetingPicker({
  candidateId,
  candidateName,
  candidateRole,
  bookings,
  onBook,
  onCancel,
}: CandidateMeetingPickerProps) {
  const options = getSlotAvailabilityForCandidate(candidateId, bookings)

  return (
    <div className="meeting-picker" aria-label={`Слоты 1:1 с ${candidateName}`}>
      <div className="meeting-picker__header">
        <span className="meeting-picker__title">Встреча 1:1</span>
        <span className="meeting-picker__tz">{EVENT_TIMEZONE_LABEL}</span>
      </div>

      {options.length === 0 ? (
        <p className="meeting-picker__empty">
          Нет общих свободных слотов с этим участником.
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
                    {slot.label} · назначено
                  </button>
                  <button
                    type="button"
                    className="meeting-slot-cancel"
                    onClick={() => onCancel(slot.id)}
                  >
                    Отменить
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
                    ? `Время занято: ${conflictBooking.candidateName}`
                    : `Выбрать ${slot.label}`
                }
                onClick={() =>
                  onBook({ id: candidateId, name: candidateName, role: candidateRole }, slot.id)
                }
              >
                {slot.label}
                {isConflict && conflictBooking ? ` (занято: ${conflictBooking.candidateName})` : ''}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

/** Shows the participant's scheduled 1:1 meetings with cancel actions. */
export function SchedulePanel({ bookings, onCancel }: SchedulePanelProps) {
  return (
    <section className="schedule-panel" aria-label="Моё расписание 1:1">
      <div className="schedule-panel__header">
        <h2 className="schedule-panel__title">Моё расписание 1:1</h2>
        <span className="meeting-picker__tz">{EVENT_TIMEZONE_LABEL}</span>
      </div>

      {bookings.length === 0 ? (
        <p className="schedule-panel__empty">
          Пока нет запланированных встреч — выберите слот в карточке собеседника.
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
                Отменить
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
