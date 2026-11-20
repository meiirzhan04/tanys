CREATE TABLE availability (
  event_id uuid NOT NULL, user_id uuid NOT NULL,
  starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL CHECK (ends_at>starts_at),
  PRIMARY KEY(event_id,user_id,starts_at),
  FOREIGN KEY(event_id,user_id) REFERENCES memberships ON DELETE CASCADE
);
CREATE TABLE meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  introduction_id uuid NOT NULL REFERENCES introductions ON DELETE CASCADE,
  proposer uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL CHECK (ends_at>starts_at),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','declined','cancelled'))
);
CREATE UNIQUE INDEX active_proposal ON meetings(introduction_id,starts_at) WHERE status IN ('pending','confirmed');
CREATE INDEX confirmed_meeting_times ON meetings(starts_at,ends_at) WHERE status='confirmed';
