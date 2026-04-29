-- Add lang column to coach_summaries for per-language caching
ALTER TABLE coach_summaries ADD COLUMN IF NOT EXISTS lang text NOT NULL DEFAULT 'sv';

-- Change unique constraint to cache per language
ALTER TABLE coach_summaries DROP CONSTRAINT IF EXISTS coach_summaries_user_id_week_start_key;
ALTER TABLE coach_summaries ADD CONSTRAINT coach_summaries_user_id_week_start_lang_key UNIQUE(user_id, week_start, lang);
