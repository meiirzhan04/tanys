CREATE TABLE account_profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  name varchar(80) NOT NULL,
  profession varchar(80) NOT NULL,
  about varchar(400) NOT NULL
);
