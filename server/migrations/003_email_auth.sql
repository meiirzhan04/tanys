CREATE TABLE auth_challenges (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  source_hash text NOT NULL,
  purpose text NOT NULL CHECK (purpose IN ('login','recover')),
  digest text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '10 minutes',
  attempts integer NOT NULL DEFAULT 0,
  used boolean NOT NULL DEFAULT false
);
CREATE INDEX challenges_by_email ON auth_challenges(email, created_at);
CREATE INDEX challenges_by_source ON auth_challenges(source_hash, created_at);
CREATE TABLE sessions (
  digest text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '7 days'
);
CREATE INDEX sessions_by_user ON sessions(user_id);
