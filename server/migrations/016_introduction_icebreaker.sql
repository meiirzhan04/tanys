ALTER TABLE introductions ADD COLUMN icebreaker text CHECK (length(icebreaker) BETWEEN 1 AND 1000);
