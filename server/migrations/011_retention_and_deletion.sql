CREATE TABLE IF NOT EXISTS deleted_account_tombstones (
  user_id uuid PRIMARY KEY,
  deleted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS deleted_account_tombstones_deleted_at ON deleted_account_tombstones(deleted_at);

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE events ADD COLUMN IF NOT EXISTS closed_at timestamptz;
ALTER TABLE events ADD COLUMN IF NOT EXISTS data_purged_at timestamptz;
