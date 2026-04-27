-- GDPR: Skapa funktion för användarinitierad kontoradering
-- Kör detta en gång i Supabase SQL Editor

create or replace function delete_user()
returns void
language plpgsql security definer
as $$
begin
  delete from contact_messages  where user_id = auth.uid();
  delete from workout_sets       where user_id = auth.uid();
  delete from workouts           where user_id = auth.uid();
  delete from exercise_log       where user_id = auth.uid();
  delete from meals              where user_id = auth.uid();
  delete from weight_log         where user_id = auth.uid();
  delete from training_sessions  where user_id = auth.uid();
  delete from training_programs  where user_id = auth.uid();
  delete from weekly_plan_days   where user_id = auth.uid();
  delete from weekly_plans       where user_id = auth.uid();
  delete from profile            where user_id = auth.uid();
  delete from auth.users         where id = auth.uid();
end;
$$;

grant execute on function delete_user() to authenticated;
