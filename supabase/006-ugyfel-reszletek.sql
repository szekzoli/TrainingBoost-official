-- TrainingBoost – 6. migráció: edzés értékelése és ügyfél-részletek az adminban
-- Futtatás: Supabase SQL Editor -> New query -> beillesztés -> Run. Újrafuttatható.
-- Előfeltétel: 005-kovetes.sql már lefutott.
--
--   1) workout_logs.rating: az ügyfél 1–5 skálán értékeli, milyen nehéz volt az edzés
--      (1 = nagyon könnyű, 3 = pont jó, 5 = nagyon nehéz).
--   2) app_rate_workout: az értékelés mentése; app_get_logs: az értékelést is visszaadja.
--   3) admin_client_detail: egy ügyfél teljes naplója az admin ügyfél-oldalához.

alter table workout_logs add column if not exists rating smallint;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'workout_logs_rating_check') then
    alter table workout_logs add constraint workout_logs_rating_check check (rating is null or rating between 1 and 5);
  end if;
end;
$$;

-- A napló: dátum és értékelés is.
create or replace function app_get_logs(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_client_id uuid := app_resolve_client(p_code);
begin
  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'plan_day_id', w.plan_day_id,
        'completed_at', w.completed_at,
        'performed_on', w.performed_on,
        'rating', w.rating,
        'note', w.note,
        'created_at', w.created_at,
        'sets', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'day_exercise_id', s.day_exercise_id,
              'set_number', s.set_number,
              'weight_kg', s.weight_kg,
              'reps', s.reps,
              'logged_at', s.logged_at
            )
            order by s.day_exercise_id, s.set_number
          )
          from set_logs s
          where s.workout_log_id = w.id
        ), '[]'::jsonb)
      )
      order by w.created_at
    )
    from workout_logs w
    where w.client_id = v_client_id
  ), '[]'::jsonb);
end;
$$;

-- Az edzés értékelése (1–5) vagy törlése (null). Létrehozza a naplósort, ha még nincs.
create or replace function app_rate_workout(
  p_code text,
  p_plan_day_id uuid,
  p_rating int
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_client_id uuid := app_resolve_client(p_code);
  v_log workout_logs;
begin
  if not exists (select 1 from clients where id = v_client_id and consent_at is not null) then
    raise exception 'consent_required' using errcode = 'P0001';
  end if;
  if p_rating is not null and (p_rating < 1 or p_rating > 5) then
    raise exception 'invalid_rating' using errcode = 'P0001';
  end if;
  if not exists (
    select 1
    from plan_days pd
    join clients c on c.plan_id = pd.plan_id
    where pd.id = p_plan_day_id
      and c.id = v_client_id
  ) then
    raise exception 'not_in_plan' using errcode = 'P0001';
  end if;

  insert into workout_logs (client_id, plan_day_id, rating)
  values (v_client_id, p_plan_day_id, p_rating)
  on conflict (client_id, plan_day_id) do update
    set rating = excluded.rating
  returning * into v_log;

  return jsonb_build_object('plan_day_id', v_log.plan_day_id, 'rating', v_log.rating);
end;
$$;

revoke all on function app_rate_workout(text, uuid, int) from public, anon, authenticated;
revoke all on function app_get_logs(text) from public, authenticated;
grant execute on function app_rate_workout(text, uuid, int) to anon;
grant execute on function app_get_logs(text) to anon;

-- Admin: egy ügyfél összes naplózott edzése (a jelenlegi és a korábbi tervekből is), a legújabb elöl.
-- Minden edzésnél: hét, nap, cím, dátum, kész-e, értékelés, jegyzet és a sorozatok az előírással.
create or replace function admin_client_detail(p_client uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(jsonb_agg(x.obj order by x.sort_date desc nulls last, x.week desc, x.day desc), '[]'::jsonb)
  from (
    select
      coalesce(w.performed_on, (w.completed_at at time zone 'Europe/Budapest')::date,
               (w.created_at at time zone 'Europe/Budapest')::date) as sort_date,
      d.week, d.day,
      jsonb_build_object(
        'plan_day_id', w.plan_day_id,
        'plan_id', d.plan_id,
        'plan_title', p.title,
        'week', d.week,
        'day', d.day,
        'day_title', d.title,
        'performed_on', w.performed_on,
        'completed_at', w.completed_at,
        'created_at', w.created_at,
        'rating', w.rating,
        'note', w.note,
        'sets', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'exercise_id', e.id,
              'exercise_name', e.name,
              'position', de.position,
              'set_number', s.set_number,
              'weight_kg', s.weight_kg,
              'reps', s.reps,
              'prescribed_sets', de.sets,
              'prescribed_reps', de.reps,
              'prescribed_resistance', de.resistance
            )
            order by de.position, s.set_number
          )
          from set_logs s
          join day_exercises de on de.id = s.day_exercise_id
          join exercises e on e.id = de.exercise_id
          where s.workout_log_id = w.id
            and (s.weight_kg is not null or s.reps is not null)
        ), '[]'::jsonb)
      ) as obj
    from workout_logs w
    join plan_days d on d.id = w.plan_day_id
    join plans p on p.id = d.plan_id
    where w.client_id = p_client
  ) x;
$$;

revoke execute on function admin_client_detail(uuid) from public, anon, authenticated;
grant execute on function admin_client_detail(uuid) to service_role;
