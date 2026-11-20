CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE CHECK (email = lower(btrim(email)) AND email <> ''),
  can_create_events boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
