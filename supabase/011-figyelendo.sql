-- TrainingBoost – 11. migráció: „Figyelendő” lista az adminban
-- Futtatás: Supabase SQL Editor -> New query -> beillesztés -> Run. Újrafuttatható.
-- Előfeltétel: 009-edzes-reszletek.sql már lefutott.
--
-- Az ügyfélnek nincs új teendője: az admin Áttekintése magától kigyűjti a figyelmet érdemlő edzéseket
-- (az aktív ügyfelek elmúlt 60 napjából):
--   * sorozat megjegyzéssel (pl. „fájt”, „nem szabályos”, „segítséggel”, vagy saját szöveg),
--   * „nagyon nehéz” (5) vagy „nagyon könnyű” (1) értékelés,
--   * jegyzet az edzéshez.
-- Egy edzés addig marad a listán, amíg az admin „Láttam”-ra nem jelöli (workout_logs.reviewed_at). Ha
-- utána új sorozatot rögzít vagy lezárja ugyanazt az edzést, újra megjelenik.

alter table workout_logs add column if not exists reviewed_at timestamptz;

create or replace function admin_attention()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with logs as (
    select
      w.*,
      greatest(
        w.created_at,
        coalesce(w.completed_at, w.created_at),
        coalesce((select max(s.logged_at) from set_logs s where s.workout_log_id = w.id), w.created_at)
      ) as last_change
    from workout_logs w
    join clients c on c.id = w.client_id
    where c.revoked_at is null
      and w.created_at > now() - interval '60 days'
  ),
  flagged as (
    select
      l.*,
      coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'exercise_name', e.name,
            'position', de.position,
            'set_number', s.set_number,
            'weight_kg', s.weight_kg,
            'reps', s.reps,
            'note', s.note
          )
          order by de.position, s.set_number
        )
        from set_logs s
        join day_exercises de on de.id = s.day_exercise_id
        join exercises e on e.id = de.exercise_id
        where s.workout_log_id = l.id
          and nullif(btrim(s.note), '') is not null
          and (s.weight_kg is not null or s.reps is not null)
      ), '[]'::jsonb) as noted_sets
    from logs l
  )
  select coalesce(jsonb_agg(x.obj order by x.last_change desc), '[]'::jsonb)
  from (
    select
      f.last_change,
      jsonb_build_object(
        'workout_log_id', f.id,
        'client_id', f.client_id,
        'client_label', c.label,
        'plan_id', d.plan_id,
        'week', d.week,
        'day', d.day,
        'day_title', d.title,
        'performed_on', f.performed_on,
        'completed_at', f.completed_at,
        'rating', f.rating,
        'note', nullif(btrim(f.note), ''),
        'sets', f.noted_sets,
        'last_change', f.last_change,
        'reviewed_at', f.reviewed_at
      ) as obj
    from flagged f
    join clients c on c.id = f.client_id
    join plan_days d on d.id = f.plan_day_id
    where (jsonb_array_length(f.noted_sets) > 0 or f.rating in (1, 5) or nullif(btrim(f.note), '') is not null)
      and (f.reviewed_at is null or f.reviewed_at < f.last_change)
  ) x;
$$;

-- „Láttam”: a megadott edzések (legfeljebb 200) olvasottnak jelölése. Visszaadja, hányat jelölt meg.
create or replace function admin_mark_reviewed(p_logs uuid[])
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count int;
begin
  if p_logs is null or coalesce(array_length(p_logs, 1), 0) = 0 then
    return 0;
  end if;
  if array_length(p_logs, 1) > 200 then
    raise exception 'invalid_value' using errcode = 'P0001';
  end if;
  update workout_logs set reviewed_at = now() where id = any (p_logs);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function admin_attention() from public, anon, authenticated;
revoke execute on function admin_mark_reviewed(uuid[]) from public, anon, authenticated;
grant execute on function admin_attention() to service_role;
grant execute on function admin_mark_reviewed(uuid[]) to service_role;
