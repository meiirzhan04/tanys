CREATE TABLE user_contacts (
  user_id uuid PRIMARY KEY REFERENCES users ON DELETE CASCADE,
  value text NOT NULL CHECK (length(value) BETWEEN 1 AND 256)
);
CREATE TABLE introductions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  sender uuid NOT NULL,
  recipient uuid NOT NULL CHECK (recipient <> sender),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','withdrawn','declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(event_id,sender) REFERENCES memberships ON DELETE CASCADE,
  FOREIGN KEY(event_id,recipient) REFERENCES memberships ON DELETE CASCADE
);
CREATE UNIQUE INDEX introductions_pair ON introductions(event_id,least(sender,recipient),greatest(sender,recipient));
CREATE INDEX introductions_recipient ON introductions(event_id,recipient);
CREATE INDEX introductions_sender ON introductions(event_id,sender);
