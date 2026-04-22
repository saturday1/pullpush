-- Table to store Live Activity push tokens for APNs dismissal
CREATE TABLE IF NOT EXISTS live_activity_tokens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  push_token text NOT NULL,
  end_time timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Allow the app (anon role) to insert tokens
ALTER TABLE live_activity_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_insert" ON live_activity_tokens FOR INSERT TO anon WITH CHECK (true);

-- Auto-cleanup: delete tokens older than 1 hour
CREATE OR REPLACE FUNCTION cleanup_old_tokens() RETURNS void AS $$
  DELETE FROM live_activity_tokens WHERE end_time < now() - interval '1 hour';
$$ LANGUAGE sql;

-- Enable required extensions (run these in SQL Editor if not already enabled)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule: every minute, call the edge function to end expired Live Activities
-- Run this AFTER deploying the edge function:
--
-- SELECT cron.schedule(
--   'end-expired-live-activities',
--   '* * * * *',
--   $$
--   SELECT net.http_post(
--     url := 'https://jfayqffmmkwjrbdanqsm.supabase.co/functions/v1/end-live-activities',
--     headers := jsonb_build_object(
--       'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
--       'Content-Type', 'application/json'
--     ),
--     body := '{}'::jsonb
--   );
--   SELECT cleanup_old_tokens();
--   $$
-- );
