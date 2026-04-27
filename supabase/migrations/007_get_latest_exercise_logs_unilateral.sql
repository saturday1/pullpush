-- Update get_latest_exercise_logs to include unilateral field
drop function if exists get_latest_exercise_logs(uuid);
create or replace function get_latest_exercise_logs(p_user_id uuid)
returns table (
  exercise_id text,
  weight_kg   numeric,
  sets        integer,
  reps        integer,
  unilateral  boolean
)
language sql
security definer
as $$
  select distinct on (el.exercise_id)
    el.exercise_id,
    el.weight_kg,
    el.sets,
    el.reps,
    coalesce(el.unilateral, false) as unilateral
  from exercise_log el
  where el.user_id = p_user_id
  order by el.exercise_id, el.id desc;
$$;
