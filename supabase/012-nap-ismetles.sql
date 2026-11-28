-- TrainingBoost – 12. migráció: egy edzésnap többször is elvégezhető („Újra elvégzem”)
-- Futtatás: Supabase SQL Editor -> New query -> beillesztés -> Run. Újrafuttatható.
-- Előfeltétel: 009, 010 és 011 már lefutott.
--
-- Eddig egy ügyfélnek egy terv-napjához egy napló tartozott (unique client_id, plan_day_id). Mostantól
-- egy napnak több „alkalma” lehet (workout_logs.attempt = 1, 2, 3…). Minden írás a nap LEGUTÓBBI
-- alkalmához megy (sorozat, kezdés, lezárás, dátum, értékelés, törlés), így a régebbi app-verziók is
-- helyesen működnek. Új alkalmat az app_repeat_day indít.
--
-- A meglévő naplók mind az 1. alkalom lesznek; adat nem vész el.

-- ---------------------------------------------------------------------------
-- 1) Oszlop és egyediség
-- ---------------------------------------------------------------------------

alter table workout_logs add column if not exists attempt int not null default 1;

do $$
declare
  v_name text;
begin
  -- A régi egyediség (client_id, plan_day_id) elhagyása, bármi is a neve
  for v_name in
    select con.conname
    from pg_constraint con
    where con.conrelid = 'public.workout_logs'::regclass
      and con.contype = 'u'
      and (
        select array_agg(att.attname::text order by att.attname)
        from unnest(con.conkey) k
        join pg_attribute att on att.attrelid = con.conrelid and att.attnum = k
      ) = array['client_id', 'plan_day_id']
  loop
    execute format('alter table workout_logs drop constraint %I', v_name);
  end loop;

  if not exists (select 1 from pg_constraint where conname = 'workout_logs_day_attempt_key') then
    alter table workout_logs add constraint workout_logs_day_attempt_key unique (client_id, plan_day_id, attempt);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'workout_logs_attempt_check') then
    alter table workout_logs add constraint workout_logs_attempt_check check (attempt between 1 and 100);
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2) Belső segédfüggvények (nem hívható az appból)
-- ---------------------------------------------------------------------------

-- A nap legutóbbi alkalma; ha még nincs és p_create, létrehozza az elsőt. Nem ellenőriz jogosultságot:
-- a hívó függvény már ellenőrizte, hogy a nap az ügyfél tervéhez tartozik.
create or replace function app_day_log(p_client uuid, p_plan_day uuid, p_create boolean)
returns workout_logs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_log workout_logs;
begin
  select * into v_log
  from workout_logs
  where client_id = p_client and plan_day_id = p_plan_day
  order by attempt desc
  limit 1;
  if found or not p_create then
    return v_log;
  end if;

  insert into workout_logs (client_id, plan_day_id, attempt)
  values (p_client, p_plan_day, 1)
  on conflict (client_id, plan_day_id, attempt) do nothing;

  select * into v_log
  from workout_logs
  where client_id = p_client and plan_day_id = p_plan_day
  order by attempt desc
  limit 1;
  return v_log;
end;
$$;

-- A nap az ügyfél tervéhez tartozik-e (különben 'not_in_plan').
create or replace function app_assert_day(p_client uuid, p_plan_day uuid)
returns void
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1
    from plan_days pd
    join clients c on c.plan_id = pd.plan_id
    where pd.id = p_plan_day
      and c.id = p_client
  ) then
    raise exception 'not_in_plan' using errcode = 'P0001';
  end if;
end;
$$;

-- Az ügyfél elfogadta-e az adatkezelést (különben 'consent_required').
create or replace function app_assert_consent(p_client uuid)
returns void
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (select 1 from clients where id = p_client and consent_at is not null) then
    raise exception 'consent_required' using errcode = 'P0001';
  end if;
end;
$$;

revoke all on function app_day_log(uuid, uuid, boolean) from public, anon, authenticated;
revoke all on function app_assert_day(uuid, uuid) from public, anon, authenticated;
revoke all on function app_assert_consent(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3) Írások: mindig a nap legutóbbi alkalmához
-- ---------------------------------------------------------------------------

-- Sorozat (új változat, megjegyzéssel és pulzussal)
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
  v_log workout_logs;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_set set_logs;
begin
  perform app_assert_consent(v_client_id);
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

  v_log := app_day_log(v_client_id, v_plan_day_id, true);

  insert into set_logs (workout_log_id, day_exercise_id, set_number, weight_kg, reps, note, heart_rate)
  values (v_log.id, p_day_exercise_id, p_set_number, p_weight, p_reps, v_note, p_heart_rate)
  on conflict (workout_log_id, day_exercise_id, set_number) do update
    set weight_kg = excluded.weight_kg,
        reps = excluded.reps,
        note = excluded.note,
        heart_rate = excluded.heart_rate,
        logged_at = now()
  returning * into v_set;

  return jsonb_build_object(
    'plan_day_id', v_plan_day_id,
    'attempt', v_log.attempt,
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

-- Sorozat (régi változat, a régi app-verzióknak)
create or replace function app_log_set(
  p_code text,
  p_day_exercise_id uuid,
  p_set_number int,
  p_weight numeric,
  p_reps int
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_client_id uuid := app_resolve_client(p_code);
  v_plan_day_id uuid;
  v_log workout_logs;
  v_set set_logs;
begin
  perform app_assert_consent(v_client_id);
  if p_set_number is null or p_set_number < 1 or p_set_number > 50 then
    raise exception 'invalid_set_number' using errcode = 'P0001';
  end if;
  if p_weight is not null and (p_weight < 0 or p_weight >= 10000) then
    raise exception 'invalid_weight' using errcode = 'P0001';
  end if;
  if p_reps is not null and (p_reps < 0 or p_reps > 1000) then
    raise exception 'invalid_reps' using errcode = 'P0001';
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

  v_log := app_day_log(v_client_id, v_plan_day_id, true);

  insert into set_logs (workout_log_id, day_exercise_id, set_number, weight_kg, reps)
  values (v_log.id, p_day_exercise_id, p_set_number, p_weight, p_reps)
  on conflict (workout_log_id, day_exercise_id, set_number) do update
    set weight_kg = excluded.weight_kg,
        reps = excluded.reps,
        logged_at = now()
  returning * into v_set;

  return jsonb_build_object(
    'plan_day_id', v_plan_day_id,
    'day_exercise_id', v_set.day_exercise_id,
    'set_number', v_set.set_number,
    'weight_kg', v_set.weight_kg,
    'reps', v_set.reps,
    'logged_at', v_set.logged_at
  );
end;
$$;

-- Edzés kezdése: p_at = a kezdés ideje (null: törlés). Legfeljebb 7 nappal korábbi és 10 perccel későbbi.
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
  perform app_assert_consent(v_client_id);
  if p_at is not null and (p_at < now() - interval '7 days' or p_at > now() + interval '10 minutes') then
    raise exception 'invalid_time' using errcode = 'P0001';
  end if;
  perform app_assert_day(v_client_id, p_plan_day_id);

  v_log := app_day_log(v_client_id, p_plan_day_id, true);
  update workout_logs set started_at = p_at where id = v_log.id returning * into v_log;

  return jsonb_build_object('plan_day_id', v_log.plan_day_id, 'attempt', v_log.attempt, 'started_at', v_log.started_at);
end;
$$;

-- Lezárás a valós időponttal (új változat). Ha még nincs dátuma, a befejezés (budapesti) napja lesz az.
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
  perform app_assert_consent(v_client_id);
  if p_note is not null and length(p_note) > 2000 then
    raise exception 'invalid_note' using errcode = 'P0001';
  end if;
  if v_at < now() - interval '7 days' or v_at > now() + interval '10 minutes' then
    v_at := now();
  end if;
  perform app_assert_day(v_client_id, p_plan_day_id);

  v_log := app_day_log(v_client_id, p_plan_day_id, true);
  update workout_logs
    set completed_at = v_at,
        note = p_note,
        performed_on = coalesce(performed_on, (v_at at time zone 'Europe/Budapest')::date)
  where id = v_log.id
  returning * into v_log;

  return jsonb_build_object(
    'plan_day_id', v_log.plan_day_id,
    'attempt', v_log.attempt,
    'started_at', v_log.started_at,
    'completed_at', v_log.completed_at,
    'performed_on', v_log.performed_on,
    'note', v_log.note
  );
end;
$$;

-- Lezárás (régi változat, a régi app-verzióknak)
create or replace function app_complete_day(
  p_code text,
  p_plan_day_id uuid,
  p_note text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return app_complete_day(p_code, p_plan_day_id, p_note, now());
end;
$$;

-- Az edzés dátuma (vagy törlése null-lal). Csak 2020 és a holnapi nap közötti dátum fogadható el.
create or replace function app_set_workout_date(
  p_code text,
  p_plan_day_id uuid,
  p_date date
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
  perform app_assert_consent(v_client_id);
  if p_date is not null
     and (p_date < date '2020-01-01' or p_date > (now() at time zone 'Europe/Budapest')::date + 1) then
    raise exception 'invalid_date' using errcode = 'P0001';
  end if;
  perform app_assert_day(v_client_id, p_plan_day_id);

  v_log := app_day_log(v_client_id, p_plan_day_id, true);
  update workout_logs set performed_on = p_date where id = v_log.id returning * into v_log;

  return jsonb_build_object('plan_day_id', v_log.plan_day_id, 'attempt', v_log.attempt, 'performed_on', v_log.performed_on);
end;
$$;

-- Az edzés értékelése (1–5) vagy törlése (null).
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
  perform app_assert_consent(v_client_id);
  if p_rating is not null and (p_rating < 1 or p_rating > 5) then
    raise exception 'invalid_rating' using errcode = 'P0001';
  end if;
  perform app_assert_day(v_client_id, p_plan_day_id);

  v_log := app_day_log(v_client_id, p_plan_day_id, true);
  update workout_logs set rating = p_rating where id = v_log.id returning * into v_log;

  return jsonb_build_object('plan_day_id', v_log.plan_day_id, 'attempt', v_log.attempt, 'rating', v_log.rating);
end;
$$;

-- Az edzés törlése: a nap LEGUTÓBBI alkalma (a korábbiak megmaradnak).
create or replace function app_delete_workout(p_code text, p_plan_day_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_client_id uuid := app_resolve_client(p_code);
  v_log workout_logs;
begin
  perform app_assert_day(v_client_id, p_plan_day_id);
  v_log := app_day_log(v_client_id, p_plan_day_id, false);
  if v_log.id is null then
    return jsonb_build_object('plan_day_id', p_plan_day_id, 'deleted', false, 'attempt', null);
  end if;
  delete from workout_logs where id = v_log.id;
  return jsonb_build_object('plan_day_id', p_plan_day_id, 'deleted', true, 'attempt', v_log.attempt);
end;
$$;

-- „Újra elvégzem”: új, üres alkalom a naphoz. Ha a legutóbbi alkalom még üres (nincs benne sorozat,
-- kezdés, lezárás, értékelés, jegyzet), azt adja vissza, nem hoz létre újat (így az ismételt hívás
-- – pl. net nélküli újraküldés – sem szaporítja). Ha még nincs alkalom, az 1. jön létre.
create or replace function app_repeat_day(p_code text, p_plan_day_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_client_id uuid := app_resolve_client(p_code);
  v_log workout_logs;
  v_empty boolean;
begin
  perform app_assert_consent(v_client_id);
  perform app_assert_day(v_client_id, p_plan_day_id);

  v_log := app_day_log(v_client_id, p_plan_day_id, false);
  if v_log.id is null then
    v_log := app_day_log(v_client_id, p_plan_day_id, true);
  else
    v_empty := v_log.started_at is null and v_log.completed_at is null and v_log.rating is null
      and nullif(btrim(coalesce(v_log.note, '')), '') is null
      and not exists (
        select 1 from set_logs s
        where s.workout_log_id = v_log.id and (s.weight_kg is not null or s.reps is not null)
      );
    if not v_empty then
      if v_log.attempt >= 100 then
        raise exception 'too_many_attempts' using errcode = 'P0001';
      end if;
      insert into workout_logs (client_id, plan_day_id, attempt)
      values (v_client_id, p_plan_day_id, v_log.attempt + 1)
      on conflict (client_id, plan_day_id, attempt) do nothing;
      v_log := app_day_log(v_client_id, p_plan_day_id, false);
    end if;
  end if;

  return jsonb_build_object(
    'plan_day_id', v_log.plan_day_id,
    'attempt', v_log.attempt,
    'created_at', v_log.created_at
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 4) Olvasás: az alkalom sorszáma is
-- ---------------------------------------------------------------------------

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
        'attempt', w.attempt,
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
      order by w.created_at, w.attempt
    )
    from workout_logs w
    where w.client_id = v_client_id
  ), '[]'::jsonb);
end;
$$;

-- ---------------------------------------------------------------------------
-- 5) Admin: elvégzett napok (egy nap egyszer számít), alkalom a naplóban és a Figyelendőben
-- ---------------------------------------------------------------------------

create or replace function admin_client_overview()
returns table (
  client_id uuid,
  plan_weeks int,
  days_total int,
  days_done int,
  last_activity timestamptz,
  last_performed_on date
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select c.id,
         (select count(distinct d.week) from plan_days d where d.plan_id = c.plan_id)::int,
         (select count(*) from plan_days d where d.plan_id = c.plan_id)::int,
         (select count(distinct w.plan_day_id) from workout_logs w
            join plan_days d on d.id = w.plan_day_id
           where w.client_id = c.id and d.plan_id = c.plan_id and w.completed_at is not null)::int,
         (select max(greatest(w.created_at, coalesce(w.completed_at, w.created_at),
                              coalesce((select max(s.logged_at) from set_logs s where s.workout_log_id = w.id), w.created_at)))
            from workout_logs w where w.client_id = c.id),
         (select max(w.performed_on) from workout_logs w where w.client_id = c.id)
  from clients c;
$$;

create or replace function admin_client_detail(p_client uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(jsonb_agg(x.obj order by x.sort_date desc nulls last, x.week desc, x.day desc, x.attempt desc), '[]'::jsonb)
  from (
    select
      coalesce(w.performed_on, (w.completed_at at time zone 'Europe/Budapest')::date,
               (w.created_at at time zone 'Europe/Budapest')::date) as sort_date,
      d.week, d.day, w.attempt,
      jsonb_build_object(
        'plan_day_id', w.plan_day_id,
        'attempt', w.attempt,
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

-- A Figyelendő: az alkalom sorszámával (a többi a 011-es szerint)
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
        'attempt', f.attempt,
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

-- ---------------------------------------------------------------------------
-- Jogosultságok
-- ---------------------------------------------------------------------------

revoke all on function app_log_set(text, uuid, int, numeric, int, text, int) from public, anon, authenticated;
revoke all on function app_log_set(text, uuid, int, numeric, int) from public, anon, authenticated;
revoke all on function app_start_workout(text, uuid, timestamptz) from public, anon, authenticated;
revoke all on function app_complete_day(text, uuid, text, timestamptz) from public, anon, authenticated;
revoke all on function app_complete_day(text, uuid, text) from public, anon, authenticated;
revoke all on function app_set_workout_date(text, uuid, date) from public, anon, authenticated;
revoke all on function app_rate_workout(text, uuid, int) from public, anon, authenticated;
revoke all on function app_delete_workout(text, uuid) from public, anon, authenticated;
revoke all on function app_repeat_day(text, uuid) from public, anon, authenticated;
revoke all on function app_get_logs(text) from public, authenticated;
grant execute on function app_log_set(text, uuid, int, numeric, int, text, int) to anon;
grant execute on function app_log_set(text, uuid, int, numeric, int) to anon;
grant execute on function app_start_workout(text, uuid, timestamptz) to anon;
grant execute on function app_complete_day(text, uuid, text, timestamptz) to anon;
grant execute on function app_complete_day(text, uuid, text) to anon;
grant execute on function app_set_workout_date(text, uuid, date) to anon;
grant execute on function app_rate_workout(text, uuid, int) to anon;
grant execute on function app_delete_workout(text, uuid) to anon;
grant execute on function app_repeat_day(text, uuid) to anon;
grant execute on function app_get_logs(text) to anon;

revoke execute on function admin_client_overview() from public, anon, authenticated;
revoke execute on function admin_client_detail(uuid) from public, anon, authenticated;
revoke execute on function admin_attention() from public, anon, authenticated;
grant execute on function admin_client_overview() to service_role;
grant execute on function admin_client_detail(uuid) to service_role;
grant execute on function admin_attention() to service_role;
