-- TrainingBoost – 5. migráció: követés és emlékeztetők
-- Futtatás: Supabase SQL Editor -> New query -> beillesztés -> Run. Újrafuttatható.
-- Előfeltétel: schema.sql, 002-resistance.sql, 003-admin.sql, 004-admin.sql már lefutott.
--
-- Tartalom:
--   1) Új oszlopok: gyakorlat képe, terv eredete (melyik sablonból), ügyfél kezdési és
--      "új terv esedékes" dátuma, belső edzői jegyzet, az edzés tényleges dátuma.
--   2) Ügyfél-app: a terv a kép linkjét és a kezdési dátumot is visszaadja, a napló az edzés
--      dátumát; új függvény az edzés dátumának beállítására; app_ping az ébresztéshez.
--   3) Admin: legfeljebb 52 hetes terv (eddig 12), gyakorlattár képpel, ügyfél-áttekintő.

-- ---------------------------------------------------------------------------
-- 1) Oszlopok
-- ---------------------------------------------------------------------------

alter table exercises add column if not exists image_url text;

alter table plans add column if not exists based_on uuid references plans(id) on delete set null;

alter table clients add column if not exists plan_started_on date;
alter table clients add column if not exists plan_due_on date;   -- mikorra kell új terv (emlékeztető)
alter table clients add column if not exists coach_note text;    -- belső jegyzet, az ügyfél nem látja

alter table workout_logs add column if not exists performed_on date;  -- az edzés tényleges napja

-- A már elvégzett edzések dátuma: a befejezés napja (budapesti idő szerint)
update workout_logs
set performed_on = (completed_at at time zone 'Europe/Budapest')::date
where performed_on is null and completed_at is not null;

-- Meglévő ügyfelek: a kezdés a létrehozás napja, az új terv esedékessége kezdés + a terv hetei
update clients
set plan_started_on = (created_at at time zone 'Europe/Budapest')::date
where plan_started_on is null;

update clients c
set plan_due_on = c.plan_started_on + 7 * (select count(distinct d.week) from plan_days d where d.plan_id = c.plan_id)::int
where c.plan_due_on is null and c.plan_started_on is not null;

-- ---------------------------------------------------------------------------
-- 2) Ügyfél-app függvények
-- ---------------------------------------------------------------------------

-- A terv: a gyakorlat képe (image_url) és az ügyfél kezdési dátuma is benne van.
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
                  'technique_note', e.technique_note
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

-- A napló: az edzés dátuma (performed_on) is benne van.
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

-- Edzésnap befejezése: ha még nincs dátuma, a mai (budapesti) nap lesz az.
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
declare
  v_client_id uuid := app_resolve_client(p_code);
  v_log workout_logs;
begin
  if not exists (select 1 from clients where id = v_client_id and consent_at is not null) then
    raise exception 'consent_required' using errcode = 'P0001';
  end if;

  if p_note is not null and length(p_note) > 2000 then
    raise exception 'invalid_note' using errcode = 'P0001';
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
  values (v_client_id, p_plan_day_id, now(), p_note, (now() at time zone 'Europe/Budapest')::date)
  on conflict (client_id, plan_day_id) do update
    set completed_at = now(),
        note = excluded.note,
        performed_on = coalesce(workout_logs.performed_on, excluded.performed_on)
  returning * into v_log;

  return jsonb_build_object(
    'plan_day_id', v_log.plan_day_id,
    'completed_at', v_log.completed_at,
    'performed_on', v_log.performed_on,
    'note', v_log.note
  );
end;
$$;

-- Az edzés dátumának beállítása (vagy törlése null-lal). Létrehozza a naplósort, ha még nincs.
-- Csak 2020 és a holnapi nap közötti dátum fogadható el.
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
  if not exists (select 1 from clients where id = v_client_id and consent_at is not null) then
    raise exception 'consent_required' using errcode = 'P0001';
  end if;

  if p_date is not null
     and (p_date < date '2020-01-01' or p_date > (now() at time zone 'Europe/Budapest')::date + 1) then
    raise exception 'invalid_date' using errcode = 'P0001';
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

  insert into workout_logs (client_id, plan_day_id, performed_on)
  values (v_client_id, p_plan_day_id, p_date)
  on conflict (client_id, plan_day_id) do update
    set performed_on = excluded.performed_on
  returning * into v_log;

  return jsonb_build_object(
    'plan_day_id', v_log.plan_day_id,
    'performed_on', v_log.performed_on
  );
end;
$$;

-- Ébresztő: az ingyenes Supabase-projekt 7 nap tétlenség után szünetel. Ezt egy időzített
-- kérés hívja pár naponta (lásd .github/workflows/supabase-ebreszto.yml). Adatot nem ad vissza.
create or replace function app_ping()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from plans limit 1);
$$;

revoke all on function app_set_workout_date(text, uuid, date) from public, anon, authenticated;
revoke all on function app_ping() from public, anon, authenticated;
revoke all on function app_get_plan(text) from public, authenticated;
revoke all on function app_get_logs(text) from public, authenticated;
revoke all on function app_complete_day(text, uuid, text) from public, authenticated;
grant execute on function app_set_workout_date(text, uuid, date) to anon;
grant execute on function app_ping() to anon;
grant execute on function app_get_plan(text) to anon;
grant execute on function app_get_logs(text) to anon;
grant execute on function app_complete_day(text, uuid, text) to anon;

-- ---------------------------------------------------------------------------
-- 3) Admin függvények
-- ---------------------------------------------------------------------------

-- Gyakorlattár lista a kép linkjével. A visszatérési típus változik, ezért előbb törölni kell.
drop function if exists admin_list_exercises();
create function admin_list_exercises()
returns table (
  id uuid,
  name text,
  category text,
  video_url text,
  image_url text,
  technique_note text,
  archived boolean,
  plan_count int
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select e.id, e.name, e.category, e.video_url, e.image_url, e.technique_note, e.archived,
         coalesce(u.plan_count, 0)::int
  from exercises e
  left join (
    select de.exercise_id, count(distinct pd.plan_id) as plan_count
    from day_exercises de
    join plan_days pd on pd.id = de.plan_day_id
    group by de.exercise_id
  ) u on u.exercise_id = e.id
  order by lower(e.name);
$$;

-- Új üres terv: legfeljebb 52 hét (eddig 12).
create or replace function admin_create_plan(
  p_title text,
  p_slug text,
  p_description text,
  p_weeks int,
  p_days int,
  p_is_template boolean
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_title text := btrim(coalesce(p_title, ''));
  v_slug text := coalesce(p_slug, '');
  v_desc text := nullif(btrim(coalesce(p_description, '')), '');
  v_new uuid;
begin
  if length(v_title) < 1 or length(v_title) > 120 then
    raise exception 'invalid_title' using errcode = 'P0001';
  end if;
  if length(v_slug) > 80 or v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'invalid_slug' using errcode = 'P0001';
  end if;
  if length(v_desc) > 2000 then
    raise exception 'invalid_value' using errcode = 'P0001';
  end if;
  if p_weeks is null or p_weeks < 1 or p_weeks > 52 or p_days is null or p_days < 1 or p_days > 7 then
    raise exception 'invalid_value' using errcode = 'P0001';
  end if;
  if exists (select 1 from plans where slug = v_slug) then
    raise exception 'slug_taken' using errcode = 'P0001';
  end if;

  insert into plans (slug, title, description, is_template)
  values (v_slug, v_title, v_desc, coalesce(p_is_template, false))
  returning id into v_new;

  insert into plan_days (plan_id, week, day, title)
  select v_new, w, d, chr(64 + d) || ' program'
  from generate_series(1, p_weeks) as w
  cross join generate_series(1, p_days) as d;

  return v_new;
end;
$$;

-- Új terv sablonból: legfeljebb 52 hét; a terv megjegyzi, melyik sablonból készült (based_on).
create or replace function admin_plan_from_template(
  p_source uuid,
  p_title text,
  p_slug text,
  p_weeks int
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_new uuid;
  v_week_count int;
  v_week int;
  w int;
begin
  if p_weeks is not null and (p_weeks < 1 or p_weeks > 52) then
    raise exception 'invalid_value' using errcode = 'P0001';
  end if;

  v_new := admin_copy_plan(p_source, p_title, p_slug, false);
  update plans set based_on = p_source where id = v_new;

  select count(distinct week), min(week) into v_week_count, v_week
  from plan_days where plan_id = p_source;

  if v_week_count = 1 and p_weeks is not null and p_weeks > 1 then
    for w in 1..p_weeks loop
      if w <> v_week then
        perform admin_copy_week(v_new, v_week, w);
      end if;
    end loop;
  end if;

  return v_new;
end;
$$;

-- Tervlista: a forrás sablon címe is (based_on_title). A visszatérési típus változik.
drop function if exists admin_list_plans(boolean);
create function admin_list_plans(p_template boolean)
returns table (
  id uuid,
  slug text,
  title text,
  description text,
  is_template boolean,
  created_at timestamptz,
  week_count int,
  max_days int,
  client_count int,
  based_on_title text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.id, p.slug, p.title, p.description, p.is_template, p.created_at,
         (select count(distinct d.week) from plan_days d where d.plan_id = p.id)::int,
         coalesce((
           select max(x.c) from (
             select count(*) as c from plan_days d where d.plan_id = p.id group by d.week
           ) x
         ), 0)::int,
         (select count(*) from clients c where c.plan_id = p.id)::int,
         (select b.title from plans b where b.id = p.based_on)
  from plans p
  where p.is_template = coalesce(p_template, false)
  order by lower(p.title), p.created_at;
$$;

-- Ügyfél-áttekintő: terv hossza, elvégzett / összes edzés, utolsó aktivitás.
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
         (select count(*) from workout_logs w
            join plan_days d on d.id = w.plan_day_id
           where w.client_id = c.id and d.plan_id = c.plan_id and w.completed_at is not null)::int,
         (select max(greatest(w.created_at, coalesce(w.completed_at, w.created_at),
                              coalesce((select max(s.logged_at) from set_logs s where s.workout_log_id = w.id), w.created_at)))
            from workout_logs w where w.client_id = c.id),
         (select max(w.performed_on) from workout_logs w where w.client_id = c.id)
  from clients c;
$$;

revoke execute on function admin_list_exercises() from public, anon, authenticated;
revoke execute on function admin_list_plans(boolean) from public, anon, authenticated;
revoke execute on function admin_client_overview() from public, anon, authenticated;
revoke execute on function admin_create_plan(text, text, text, int, int, boolean) from public, anon, authenticated;
revoke execute on function admin_plan_from_template(uuid, text, text, int) from public, anon, authenticated;
grant execute on function admin_list_exercises() to service_role;
grant execute on function admin_list_plans(boolean) to service_role;
grant execute on function admin_client_overview() to service_role;
grant execute on function admin_create_plan(text, text, text, int, int, boolean) to service_role;
grant execute on function admin_plan_from_template(uuid, text, text, int) to service_role;

grant all on all tables in schema public to service_role;
