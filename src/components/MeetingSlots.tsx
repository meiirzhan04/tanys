import { useEffect, useRef } from 'react'
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
  const pickerRef = useRef<HTMLDivElement>(null)
  const pendingFocusRef = useRef<{ kind: 'book' | 'cancel'; slotId: string } | null>(null)

  useEffect(() => {
    const pending = pendingFocusRef.current
    if (!pending) return
    pendingFocusRef.current = null

    const selector = pending.kind === 'cancel'
      ? `.meeting-slot-cancel[data-slot-id="${pending.slotId}"]`
      : `.meeting-slot-btn[data-slot-id="${pending.slotId}"]:not(:disabled)`
    pickerRef.current?.querySelector<HTMLButtonElement>(selector)?.focus()
  }, [bookings])

  return (
    <div ref={pickerRef} className="meeting-picker" aria-label={t.pickerAriaLabel(candidateName)}>
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
                    data-slot-id={slot.id}
                    className="meeting-slot-cancel"
                    onClick={() => {
                      pendingFocusRef.current = { kind: 'book', slotId: slot.id }
                      onCancel(slot.id)
                    }}
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
                data-slot-id={slot.id}
                className={`meeting-slot-btn ${isConflict ? 'meeting-slot-btn--conflict' : ''}`}
                disabled={isConflict}
                title={
                  isConflict && conflictBooking
                    ? t.busyTitle(conflictBooking.candidateName)
                    : t.selectTitle(slot.label)
                }
                onClick={() => {
                  pendingFocusRef.current = { kind: 'cancel', slotId: slot.id }
                  onBook({ id: candidateId, name: candidateName, role: candidateRole }, slot.id)
                }}
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
  const panelRef = useRef<HTMLElement>(null)
  const pendingCancelIndexRef = useRef<number | null>(null)

  useEffect(() => {
    const targetIndex = pendingCancelIndexRef.current
    if (targetIndex === null) return
    pendingCancelIndexRef.current = null

    if (bookings.length > 0) {
      const buttons = panelRef.current?.querySelectorAll<HTMLButtonElement>('.meeting-slot-cancel')
      buttons?.[Math.min(targetIndex, buttons.length - 1)]?.focus()
      return
    }

    panelRef.current?.querySelector<HTMLElement>('.schedule-panel__title')?.focus()
  }, [bookings])

  return (
    <section ref={panelRef} className="schedule-panel" aria-label={t.scheduleTitle}>
      <div className="schedule-panel__header">
        <h2 className="schedule-panel__title" tabIndex={-1}>{t.scheduleTitle}</h2>
        <span className="meeting-picker__tz">{EVENT_TIMEZONE_LABEL}</span>
      </div>

      {bookings.length === 0 ? (
        <p className="schedule-panel__empty">
          {t.scheduleEmpty}
        </p>
      ) : (
        <ul className="schedule-panel__list">
          {bookings.map((booking, index) => (
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
                onClick={() => {
                  pendingCancelIndexRef.current = index
                  onCancel(booking.slotId)
                }}
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
