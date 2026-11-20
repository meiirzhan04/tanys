CREATE TABLE event_feedback (
  event_id uuid NOT NULL,
  user_id uuid NOT NULL,
  candidate_id uuid NOT NULL,
  response text NOT NULL CHECK (response IN ('met','not_a_fit')),
  PRIMARY KEY (event_id,user_id,candidate_id),
  FOREIGN KEY (event_id,user_id) REFERENCES memberships ON DELETE CASCADE,
  FOREIGN KEY (event_id,candidate_id) REFERENCES memberships ON DELETE CASCADE,
  CHECK (user_id <> candidate_id)
);
