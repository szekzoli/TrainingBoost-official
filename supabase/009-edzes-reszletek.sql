-- TrainingBoost – 9. migráció: sorozat-megjegyzés, pulzus, edzésidő, saját testsúlyos súlyok
-- Futtatás: Supabase SQL Editor -> New query -> beillesztés -> Run. Újrafuttatható.
-- Előfeltétel: 008-testsuly.sql már lefutott.
--
--   1) set_logs.note: rövid megjegyzés sorozatonként (pl. „nem szabályos”, „60 kg, a vége csalt”).
--      set_logs.heart_rate: pulzus a sorozat végén (30–250).
--   2) exercises.track_hr: ennél a gyakorlatnál az app kérje a pulzust (a Kondi / intenzív
--      kategóriánál az első futtatáskor bekapcsolva). Az adminban a gyakorlattárban állítható.
--   3) workout_logs.started_at: mikor kezdte az edzést (az app küldi, net nélkül is a valós időt).
--      Az edzés vége továbbra is a completed_at; az app_complete_day új változata a valós
--      befejezési időt is fogadja (hogy a net nélkül rögzített edzés ideje is pontos legyen).
--   4) Saját testsúlyos gyakorlatnál a súly lehet negatív is (segítség, pl. gumikötél / gép).
--   5) app_get_plan: a gyakorlat eszköze és a track_hr; app_get_logs és admin_client_detail:
--      kezdés, sorozat-megjegyzés, pulzus.
--   A régi app_log_set és app_complete_day megmarad, így a még régi verziót futtató telefonok is működnek.

-- ---------------------------------------------------------------------------
-- 1–3) Oszlopok
-- ---------------------------------------------------------------------------

alter table set_logs add column if not exists note text;
alter table set_logs add column if not exists heart_rate smallint;
alter table workout_logs add column if not exists started_at timestamptz;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'exercises' and column_name = 'track_hr'
  ) then
    alter table exercises add column track_hr boolean not null default false;
    update exercises set track_hr = true where category = 'Kondi / intenzív';
  end if;
  if not exists (select 1 from pg_constraint where conname = 'set_logs_heart_rate_check') then
    alter table set_logs add constraint set_logs_heart_rate_check check (heart_rate is null or heart_rate between 30 and 250);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'set_logs_note_check') then
    alter table set_logs add constraint set_logs_note_check check (note is null or length(note) <= 300);
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5) Ügyfél-app: terv és napló
-- ---------------------------------------------------------------------------

create or replace function app_get_plan(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_client_id uuid := app_resolve_client(p_code);
  v_plan_id uuid;
  v_started date;
  v_result jsonb;
begin
  select plan_id, plan_started_on into v_plan_id, v_started from clients where id = v_client_id;

  select jsonb_build_object(
    'plan', jsonb_build_object(
      'id', p.id,
      'slug', p.slug,
      'title', p.title,
      'description', p.description,
      'started_on', v_started
    ),
    'days', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', d.id,
          'week', d.week,
          'day', d.day,
          'title', d.title,
          'exercises', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'id', de.id,
                'position', de.position,
                'section', de.section,
                'group_label', de.group_label,
                'sets', de.sets,
                'reps', de.reps,
                'resistance', de.resistance,
                'rest_seconds', de.rest_seconds,
                'note', de.note,
                'exercise', jsonb_build_object(
                  'id', e.id,
                  'name', e.name,
                  'video_url', e.video_url,
                  'image_url', e.image_url,
                  'technique_note', e.technique_note,
                  'equipment', e.equipment,
                  'track_hr', e.track_hr
                )
              )
              order by de.position
            )
            from day_exercises de
            join exercises e on e.id = de.exercise_id
            where de.plan_day_id = d.id
          ), '[]'::jsonb)
        )
        order by d.week, d.day
      )
      from plan_days d
      where d.plan_id = p.id
    ), '[]'::jsonb)
  )
  into v_result
  from plans p
  where p.id = v_plan_id;

  return v_result;
end;
$$;

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
        'started_at', w.started_at,
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
              'note', s.note,
              'heart_rate', s.heart_rate,
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

-- ---------------------------------------------------------------------------
-- Sorozat rögzítése megjegyzéssel és pulzussal (új változat, 7 paraméter)
-- ---------------------------------------------------------------------------

create or replace function app_log_set(
  p_code text,
  p_day_exercise_id uuid,
  p_set_number int,
  p_weight numeric,
  p_reps int,
  p_note text,
  p_heart_rate int
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_client_id uuid := app_resolve_client(p_code);
  v_plan_day_id uuid;
  v_workout_log_id uuid;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_set set_logs;
begin
  if not exists (select 1 from clients where id = v_client_id and consent_at is not null) then
    raise exception 'consent_required' using errcode = 'P0001';
  end if;

  if p_set_number is null or p_set_number < 1 or p_set_number > 50 then
    raise exception 'invalid_set_number' using errcode = 'P0001';
  end if;
  -- Negatív súly: segítség saját testsúlyos gyakorlatnál (pl. −20 kg gumikötéllel)
  if p_weight is not null and (p_weight <= -500 or p_weight >= 10000) then
    raise exception 'invalid_weight' using errcode = 'P0001';
  end if;
  if p_reps is not null and (p_reps < 0 or p_reps > 10000) then
    raise exception 'invalid_reps' using errcode = 'P0001';
  end if;
  if v_note is not null and length(v_note) > 300 then
    raise exception 'invalid_note' using errcode = 'P0001';
  end if;
  if p_heart_rate is not null and (p_heart_rate < 30 or p_heart_rate > 250) then
    raise exception 'invalid_heart_rate' using errcode = 'P0001';
  end if;

  select de.plan_day_id into v_plan_day_id
  from day_exercises de
  join plan_days pd on pd.id = de.plan_day_id
  join clients c on c.plan_id = pd.plan_id
  where de.id = p_day_exercise_id
    and c.id = v_client_id;

  if v_plan_day_id is null then
    raise exception 'not_in_plan' using errcode = 'P0001';
  end if;

  insert into workout_logs (client_id, plan_day_id)
  values (v_client_id, v_plan_day_id)
  on conflict (client_id, plan_day_id) do update
    set client_id = excluded.client_id
  returning id into v_workout_log_id;

  insert into set_logs (workout_log_id, day_exercise_id, set_number, weight_kg, reps, note, heart_rate)
  values (v_workout_log_id, p_day_exercise_id, p_set_number, p_weight, p_reps, v_note, p_heart_rate)
  on conflict (workout_log_id, day_exercise_id, set_number) do update
    set weight_kg = excluded.weight_kg,
        reps = excluded.reps,
        note = excluded.note,
        heart_rate = excluded.heart_rate,
        logged_at = now()
  returning * into v_set;

  return jsonb_build_object(
    'plan_day_id', v_plan_day_id,
    'day_exercise_id', v_set.day_exercise_id,
    'set_number', v_set.set_number,
    'weight_kg', v_set.weight_kg,
    'reps', v_set.reps,
    'note', v_set.note,
    'heart_rate', v_set.heart_rate,
    'logged_at', v_set.logged_at
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Edzés kezdése és befejezése (az app küldi az időpontot)
-- ---------------------------------------------------------------------------

-- Kezdés: p_at = a kezdés ideje (null: törlés). Legfeljebb 7 nappal korábbi és 10 perccel későbbi lehet.
create or replace function app_start_workout(p_code text, p_plan_day_id uuid, p_at timestamptz)
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
  if p_at is not null and (p_at < now() - interval '7 days' or p_at > now() + interval '10 minutes') then
    raise exception 'invalid_time' using errcode = 'P0001';
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

  insert into workout_logs (client_id, plan_day_id, started_at)
  values (v_client_id, p_plan_day_id, p_at)
  on conflict (client_id, plan_day_id) do update
    set started_at = excluded.started_at
  returning * into v_log;

  return jsonb_build_object('plan_day_id', v_log.plan_day_id, 'started_at', v_log.started_at);
end;
$$;

-- Befejezés a valós időponttal (új változat, 4 paraméter). Ha még nincs dátuma, a befejezés
-- (budapesti) napja lesz az.
create or replace function app_complete_day(
  p_code text,
  p_plan_day_id uuid,
  p_note text,
  p_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_client_id uuid := app_resolve_client(p_code);
  v_at timestamptz := coalesce(p_at, now());
  v_log workout_logs;
begin
  if not exists (select 1 from clients where id = v_client_id and consent_at is not null) then
    raise exception 'consent_required' using errcode = 'P0001';
  end if;
  if p_note is not null and length(p_note) > 2000 then
    raise exception 'invalid_note' using errcode = 'P0001';
  end if;
  if v_at < now() - interval '7 days' or v_at > now() + interval '10 minutes' then
    v_at := now();
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

  insert into workout_logs (client_id, plan_day_id, completed_at, note, performed_on)
  values (v_client_id, p_plan_day_id, v_at, p_note, (v_at at time zone 'Europe/Budapest')::date)
  on conflict (client_id, plan_day_id) do update
    set completed_at = v_at,
        note = excluded.note,
        performed_on = coalesce(workout_logs.performed_on, excluded.performed_on)
  returning * into v_log;

  return jsonb_build_object(
    'plan_day_id', v_log.plan_day_id,
    'started_at', v_log.started_at,
    'completed_at', v_log.completed_at,
    'performed_on', v_log.performed_on,
    'note', v_log.note
  );
end;
$$;

revoke all on function app_log_set(text, uuid, int, numeric, int, text, int) from public, anon, authenticated;
revoke all on function app_start_workout(text, uuid, timestamptz) from public, anon, authenticated;
revoke all on function app_complete_day(text, uuid, text, timestamptz) from public, anon, authenticated;
revoke all on function app_get_plan(text) from public, authenticated;
revoke all on function app_get_logs(text) from public, authenticated;
grant execute on function app_log_set(text, uuid, int, numeric, int, text, int) to anon;
grant execute on function app_start_workout(text, uuid, timestamptz) to anon;
grant execute on function app_complete_day(text, uuid, text, timestamptz) to anon;
grant execute on function app_get_plan(text) to anon;
grant execute on function app_get_logs(text) to anon;

-- ---------------------------------------------------------------------------
-- Admin: gyakorlattár a track_hr mezővel, ügyfél-napló kezdéssel, megjegyzéssel, pulzussal
-- ---------------------------------------------------------------------------

drop function if exists admin_list_exercises();
create function admin_list_exercises()
returns table (
  id uuid,
  name text,
  category text,
  equipment text,
  muscle_group text,
  video_url text,
  image_url text,
  technique_note text,
  archived boolean,
  track_hr boolean,
  plan_count int
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select e.id, e.name, e.category, e.equipment, e.muscle_group, e.video_url, e.image_url, e.technique_note, e.archived,
         e.track_hr, coalesce(u.plan_count, 0)::int
  from exercises e
  left join (
    select de.exercise_id, count(distinct pd.plan_id) as plan_count
    from day_exercises de
    join plan_days pd on pd.id = de.plan_day_id
    group by de.exercise_id
  ) u on u.exercise_id = e.id
  order by lower(e.name);
$$;

revoke execute on function admin_list_exercises() from public, anon, authenticated;
grant execute on function admin_list_exercises() to service_role;

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
        'started_at', w.started_at,
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
              'note', s.note,
              'heart_rate', s.heart_rate,
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
