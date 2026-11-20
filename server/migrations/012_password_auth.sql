ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE users ADD COLUMN username text UNIQUE CHECK (username ~ '^[a-z0-9_-]{3,32}$');
ALTER TABLE users ADD COLUMN password_hash text;
ALTER TABLE users ADD CONSTRAINT user_login_present CHECK (email IS NOT NULL OR username IS NOT NULL);
ALTER TABLE users ADD CONSTRAINT password_credentials_complete CHECK ((username IS NULL) = (password_hash IS NULL));

CREATE TABLE password_attempts (
  bucket_key text PRIMARY KEY,
  attempts integer NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE INDEX password_attempts_expiry ON password_attempts (expires_at);
