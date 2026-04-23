CREATE TABLE IF NOT EXISTS weight_log (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  logged_at    date        NOT NULL DEFAULT current_date,
  kg           numeric(5,2) NOT NULL CHECK (kg > 0 AND kg < 500),
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, logged_at)
);

ALTER TABLE weight_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own weight logs"
  ON weight_log FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
