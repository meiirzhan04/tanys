-- Public handle: separate from the login username so it can change without touching credentials.
-- Existing accounts start with their login username as handle (nothing is lost on upgrade).
ALTER TABLE users ADD COLUMN handle text UNIQUE CHECK (handle ~ '^[a-z0-9_-]{3,32}$');
UPDATE users SET handle = username WHERE username IS NOT NULL AND handle IS NULL;
CREATE INDEX users_handle_prefix ON users (handle text_pattern_ops);

-- Optional short note attached to an introduction request.
ALTER TABLE introductions ADD COLUMN message text CHECK (message IS NULL OR length(message) BETWEEN 1 AND 280);

-- Per-user request buckets for search and introduction spam protection (not per IP: venues share Wi-Fi).
CREATE TABLE request_buckets (
  bucket_key text PRIMARY KEY,
  hits integer NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE INDEX request_buckets_expiry ON request_buckets (expires_at);
