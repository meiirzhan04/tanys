CREATE TABLE event_profiles (
  event_id uuid NOT NULL,
  user_id uuid NOT NULL,
  name text NOT NULL,
  role text NOT NULL,
  skills text[] NOT NULL,
  interests text[] NOT NULL,
  looking_for text[] NOT NULL DEFAULT '{}',
  experience_years integer NOT NULL CHECK (experience_years BETWEEN 0 AND 60),
  about text NOT NULL,
  goal text NOT NULL CHECK (goal IN ('find_job','hire','find_mentor','be_mentor','find_cofounder','exchange_experience')),
  visible boolean NOT NULL DEFAULT false,
  consent_version text NOT NULL,
  consent_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id,user_id),
  FOREIGN KEY (event_id,user_id) REFERENCES memberships(event_id,user_id) ON DELETE CASCADE
);
