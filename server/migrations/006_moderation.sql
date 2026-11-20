CREATE TABLE event_blocks (
  event_id uuid NOT NULL REFERENCES events ON DELETE CASCADE,
  blocker_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);
CREATE INDEX event_blocks_by_blocked ON event_blocks(event_id, blocked_id);

CREATE TABLE event_restrictions (
  event_id uuid NOT NULL REFERENCES events ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  reason text NOT NULL,
  restricted_by uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);

CREATE TABLE event_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  reason text NOT NULL CHECK (reason IN ('spam', 'harassment', 'fake_profile', 'other')),
  details text NOT NULL DEFAULT '' CHECK (length(details) <= 500),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  action text CHECK (action IN ('dismiss', 'warn', 'restrict')),
  resolved_by uuid REFERENCES users ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (reporter_id <> subject_id)
);
CREATE INDEX event_reports_by_event ON event_reports(event_id, status, created_at DESC);

CREATE TABLE moderation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events ON DELETE CASCADE,
  report_id uuid REFERENCES event_reports ON DELETE SET NULL,
  moderator_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('dismiss', 'warn', 'restrict')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX moderation_actions_by_event ON moderation_actions(event_id, created_at DESC);
