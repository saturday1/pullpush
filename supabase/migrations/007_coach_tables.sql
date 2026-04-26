-- Coach feature tables

-- Cached weekly summaries
CREATE TABLE IF NOT EXISTS coach_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  summary_json jsonb NOT NULL,
  tokens_used integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start)
);

ALTER TABLE coach_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own summaries"
  ON coach_summaries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own summaries"
  ON coach_summaries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Question/answer log
CREATE TABLE IF NOT EXISTS coach_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text NOT NULL,
  tokens_used integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE coach_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own questions"
  ON coach_questions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own questions"
  ON coach_questions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RPC function: get_coach_data
-- Returns aggregated user data for AI context
CREATE OR REPLACE FUNCTION get_coach_data(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  profile_data jsonb;
  training_data jsonb;
  pr_data jsonb;
  nutrition_data jsonb;
  program_data jsonb;
  weight_data jsonb;
BEGIN
  -- Profile
  SELECT jsonb_build_object(
    'first_name', p.first_name,
    'gender', p.gender,
    'height_cm', p.height,
    'age', EXTRACT(YEAR FROM age(p.birthday)),
    'current_weight_kg', p.current_weight,
    'goal_weight_kg', p.goal_weight,
    'start_weight_kg', p.start_weight,
    'role', p.role
  ) INTO profile_data
  FROM profile p
  WHERE p.user_id = p_user_id;

  -- Training last 4 weeks
  SELECT jsonb_build_object(
    'workout_count', COALESCE(COUNT(*), 0),
    'total_volume_kg', COALESCE(SUM(sub.vol), 0),
    'deload_count', COALESCE(SUM(CASE WHEN w.is_deload THEN 1 ELSE 0 END), 0),
    'sessions', COALESCE(
      jsonb_agg(DISTINCT jsonb_build_object('name', w.session_name)) FILTER (WHERE w.session_name IS NOT NULL),
      '[]'::jsonb
    )
  ) INTO training_data
  FROM workouts w
  LEFT JOIN LATERAL (
    SELECT COALESCE(SUM(ws.kg * ws.reps), 0) AS vol
    FROM workout_sets ws
    WHERE ws.workout_id = w.id
  ) sub ON true
  WHERE w.user_id = p_user_id
    AND w.completed_at IS NOT NULL
    AND w.completed_at >= (now() - interval '28 days');

  -- Weekly workout counts for streak calc
  WITH weekly AS (
    SELECT date_trunc('week', w.completed_at::date) AS wk
    FROM workouts w
    WHERE w.user_id = p_user_id
      AND w.completed_at IS NOT NULL
    GROUP BY 1
    ORDER BY 1 DESC
  )
  SELECT jsonb_set(
    COALESCE(training_data, '{}'::jsonb),
    '{streak_weeks}',
    to_jsonb((
      SELECT COUNT(*)::int FROM (
        SELECT wk, ROW_NUMBER() OVER (ORDER BY wk DESC) AS rn
        FROM weekly
      ) s
      WHERE s.wk >= date_trunc('week', now()) - (s.rn - 1) * interval '1 week'
        AND s.wk <= date_trunc('week', now())
    ))
  ) INTO training_data;

  -- PRs last 4 weeks (top exercises by max kg)
  SELECT COALESCE(
    jsonb_agg(jsonb_build_object('exercise', name, 'kg', max_kg) ORDER BY max_kg DESC),
    '[]'::jsonb
  ) INTO pr_data
  FROM (
    SELECT e.name, MAX(ws.kg) AS max_kg
    FROM workout_sets ws
    JOIN workouts w ON w.id = ws.workout_id
    JOIN exercises e ON e.id = ws.exercise_id
    WHERE w.user_id = p_user_id
      AND w.completed_at IS NOT NULL
      AND w.completed_at >= (now() - interval '28 days')
      AND ws.kg IS NOT NULL
    GROUP BY e.name
    ORDER BY max_kg DESC
    LIMIT 10
  ) sub;

  -- Nutrition last 7 days
  SELECT jsonb_build_object(
    'days_logged', COALESCE(COUNT(DISTINCT m.date), 0),
    'avg_kcal', COALESCE(ROUND(AVG(daily.kcal)), 0),
    'avg_protein', COALESCE(ROUND(AVG(daily.protein)), 0)
  ) INTO nutrition_data
  FROM (
    SELECT m2.date,
      SUM(m2.kcal) AS kcal,
      SUM(m2.protein) AS protein
    FROM meals m2
    WHERE m2.user_id = p_user_id
      AND m2.date >= (CURRENT_DATE - 7)
    GROUP BY m2.date
  ) daily
  RIGHT JOIN (SELECT DISTINCT date FROM meals WHERE user_id = p_user_id AND date >= (CURRENT_DATE - 7)) m ON m.date = daily.date;

  -- Weight trend (last 4 entries)
  SELECT COALESCE(
    jsonb_agg(jsonb_build_object('date', wl.date, 'kg', wl.weight_kg) ORDER BY wl.date DESC),
    '[]'::jsonb
  ) INTO weight_data
  FROM (
    SELECT date, weight_kg
    FROM weight_log
    WHERE user_id = p_user_id
    ORDER BY date DESC
    LIMIT 4
  ) wl;

  -- Active program
  SELECT jsonb_build_object(
    'name', tp.name,
    'session_count', (SELECT COUNT(*) FROM training_sessions ts WHERE ts.program_id = tp.id)
  ) INTO program_data
  FROM training_programs tp
  JOIN profile pr ON pr.active_program_id = tp.id AND pr.user_id = p_user_id
  LIMIT 1;

  result := jsonb_build_object(
    'profile', COALESCE(profile_data, '{}'::jsonb),
    'training_4w', COALESCE(training_data, '{}'::jsonb),
    'top_prs', COALESCE(pr_data, '[]'::jsonb),
    'nutrition_7d', COALESCE(nutrition_data, '{}'::jsonb),
    'weight_trend', COALESCE(weight_data, '[]'::jsonb),
    'program', COALESCE(program_data, '{}'::jsonb)
  );

  RETURN result;
END;
$$;
