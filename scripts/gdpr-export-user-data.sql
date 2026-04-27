-- GDPR: Exportera all data för en specifik användare
-- Byt ut DERAS-UUID på raden nedan (finns under Authentication → Users i Supabase)
-- Exportera resultatet som CSV eller JSON via knappen i SQL Editor

with u as (select 'DERAS-UUID'::uuid as uid)

select 'profile'            as table_name, row_to_json(p)   as data from profile p,            u where p.user_id   = u.uid
union all
select 'weight_log',                        row_to_json(w)           from weight_log w,          u where w.user_id   = u.uid
union all
select 'exercise_log',                      row_to_json(e)           from exercise_log e,        u where e.user_id   = u.uid
union all
select 'training_programs',                 row_to_json(tp)          from training_programs tp,  u where tp.user_id  = u.uid
union all
select 'training_sessions',                 row_to_json(ts)          from training_sessions ts,  u where ts.user_id  = u.uid
union all
select 'workouts',                          row_to_json(w)           from workouts w,            u where w.user_id   = u.uid
union all
select 'workout_sets',                      row_to_json(ws)          from workout_sets ws,       u where ws.user_id  = u.uid
union all
select 'meals',                             row_to_json(m)           from meals m,               u where m.user_id   = u.uid
union all
select 'weekly_plans',                      row_to_json(wp)          from weekly_plans wp,       u where wp.user_id  = u.uid
union all
select 'weekly_plan_days',                  row_to_json(wpd)         from weekly_plan_days wpd,  u where wpd.user_id = u.uid
union all
select 'contact_messages',                  row_to_json(cm)          from contact_messages cm,   u where cm.user_id  = u.uid;
