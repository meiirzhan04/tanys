-- Lets the organizer cabinet list invites with their issue date after a reload.
ALTER TABLE event_invites ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS invites_by_event_created ON event_invites(event_id, created_at DESC);
