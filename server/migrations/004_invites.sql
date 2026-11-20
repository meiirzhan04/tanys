CREATE TABLE event_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events ON DELETE CASCADE,
  digest text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked boolean NOT NULL DEFAULT false
);
CREATE INDEX invites_by_event ON event_invites(event_id);
