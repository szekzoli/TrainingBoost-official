-- TrainingBoost – 3. migráció: admin (edzésterv-készítő) támogatás (docs/admin-terv.md 3. fejezet)
-- Futtatás: Supabase SQL Editor -> New query -> beillesztés -> Run (újrafuttatható).
-- Előfeltétel: schema.sql, seed-sample.sql (section oszlop) és 002-resistance.sql (resistance oszlop) már lefutott.
--
-- Az admin_* függvényeket kizárólag a helyi admin szerver hívja a titkos (service_role) kulccsal.
-- Az anon / authenticated szerepek nem érhetik el őket.

-- ---------------------------------------------------------------------------
-- 0) Előfeltételek ellenőrzése (hiba esetén a futás itt megáll, és semmi nem változik)
-- ---------------------------------------------------------------------------

do $$
declare
  v_dups text;
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'day_exercises' and column_name = 'section'
  ) then
    raise exception 'Hiányzik a day_exercises.section oszlop: előbb futtasd a supabase/seed-sample.sql fájlt.';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'day_exercises' and column_name = 'resistance'
  ) then
    raise exception 'Hiányzik a day_exercises.resistance oszlop: előbb futtasd a supabase/002-resistance.sql fájlt.';
  end if;

  -- Ismétlődő gyakorlatnevek (kis- és nagybetű különbség nélkül) akadályoznák az egyedi indexet.
  -- Nem törlünk semmit: a hibaüzenet felsorolja őket, kézzel kell rendezni (átnevezés / egyesítés).
  select string_agg(d.n || ' (' || d.c || ' db)', '; ' order by d.n)
  into v_dups
  from (
    select min(name) as n, count(*) as c
    from exercises
    group by lower(name)
    having count(*) > 1
  ) d;

  if v_dups is not null then
    raise exception 'Ismétlődő gyakorlatnevek (kis/nagybetű nélkül): %. Nevezd át vagy egyesítsd őket, majd futtasd újra.', v_dups;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 1) Séma-kiegészítések
-- ---------------------------------------------------------------------------

-- Sablon jelölő a terveken
alter table plans add column if not exists is_template boolean not null default false;

-- Gyakorlattár: kategória és archiválás
alter table exercises add column if not exists category text;
alter table exercises add column if not exists archived boolean not null default false;

-- Egyedi gyakorlatnév, kis- és nagybetű különbség nélkül
create unique index if not exists exercises_name_lower_key on exercises (lower(name));

-- A terv slug egyedisége (a schema.sql-ben `unique`; ha valamiért hiányozna, pótoljuk)
do $$
begin
  if not exists (
    select 1
    from pg_index i
    join pg_attribute a on a.attrelid = i.indrelid and a.attnum = i.indkey[0]
    where i.indrelid = 'public.plans'::regclass
      and i.indisunique
      and i.indnatts = 1
      and i.indpred is null
      and i.indexprs is null
      and a.attname = 'slug'
  ) then
    create unique index plans_slug_unique_idx on plans (slug);
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2) Admin függvények (security definer, csak service_role hívhatja)
-- ---------------------------------------------------------------------------

-- Gyakorlattár lista: minden gyakorlat (archivált is), hány tervben szerepel (sablonokat is beleértve).
create or replace function admin_list_exercises()
returns table (
  id uuid,
  name text,
  category text,
  video_url text,
  technique_note text,
  archived boolean,
  plan_count int
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select e.id, e.name, e.category, e.video_url, e.technique_note, e.archived,
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

-- Terv mély másolata: napok és gyakorlat-sorok másolódnak, a `exercises` sorok nem (csak hivatkozás).
-- Ügyfelek nem másolódnak. Az új terv azonosítóját adja vissza.
create or replace function admin_copy_plan(
  p_source uuid,
  p_title text,
  p_slug text,
  p_as_template boolean
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_title text := btrim(coalesce(p_title, ''));
  v_slug text := coalesce(p_slug, '');
  v_new_id uuid;
begin
  if length(v_title) < 1 or length(v_title) > 120 then
    raise exception 'invalid_title' using errcode = 'P0001';
  end if;
  if length(v_slug) > 80 or v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'invalid_slug' using errcode = 'P0001';
  end if;

  if not exists (select 1 from plans where id = p_source) then
    raise exception 'plan_not_found' using errcode = 'P0001';
  end if;
  if exists (select 1 from plans where slug = v_slug) then
    raise exception 'slug_taken' using errcode = 'P0001';
  end if;

  insert into plans (slug, title, description, is_template)
  select v_slug, v_title, p.description, coalesce(p_as_template, false)
  from plans p
  where p.id = p_source
  returning id into v_new_id;

  insert into plan_days (plan_id, week, day, title)
  select v_new_id, pd.week, pd.day, pd.title
  from plan_days pd
  where pd.plan_id = p_source;

  insert into day_exercises (
    plan_day_id, exercise_id, position, section, group_label,
    sets, reps, resistance, rest_seconds, note
  )
  select nd.id, de.exercise_id, de.position, de.section, de.group_label,
         de.sets, de.reps, de.resistance, de.rest_seconds, de.note
  from day_exercises de
  join plan_days od on od.id = de.plan_day_id and od.plan_id = p_source
  join plan_days nd on nd.plan_id = v_new_id and nd.week = od.week and nd.day = od.day;

  return v_new_id;
end;
$$;

-- A cél hét napjait és gyakorlatait lecseréli a forrás hét másolatára (a cél hét korábbi tartalma törlődik).
-- Ha a cél hét még nem létezik, létrehozza. Ha a cél héthez már van naplózott edzés, nem cserélhető.
-- Visszatérés: { "days": <másolt napok>, "exercises": <másolt gyakorlat-sorok> }
create or replace function admin_copy_week(
  p_plan uuid,
  p_from_week int,
  p_to_week int
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_days int;
  v_exercises int;
begin
  if p_from_week is null or p_to_week is null
     or p_from_week < 1 or p_from_week > 52
     or p_to_week < 1 or p_to_week > 52 then
    raise exception 'invalid_week' using errcode = 'P0001';
  end if;
  if p_from_week = p_to_week then
    raise exception 'same_week' using errcode = 'P0001';
  end if;

  -- Egyidejű módosítások kizárása erre a tervre
  perform 1 from plans where id = p_plan for update;
  if not found then
    raise exception 'plan_not_found' using errcode = 'P0001';
  end if;

  if not exists (select 1 from plan_days where plan_id = p_plan and week = p_from_week) then
    raise exception 'source_week_empty' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from workout_logs wl
    join plan_days pd on pd.id = wl.plan_day_id
    where pd.plan_id = p_plan and pd.week = p_to_week
  ) then
    raise exception 'week_has_logs' using errcode = 'P0001';
  end if;

  -- A day_exercises sorai a plan_days törlésével kaszkádolva törlődnek.
  delete from plan_days where plan_id = p_plan and week = p_to_week;

  insert into plan_days (plan_id, week, day, title)
  select pd.plan_id, p_to_week, pd.day, pd.title
  from plan_days pd
  where pd.plan_id = p_plan and pd.week = p_from_week;
  get diagnostics v_days = row_count;

  insert into day_exercises (
    plan_day_id, exercise_id, position, section, group_label,
    sets, reps, resistance, rest_seconds, note
  )
  select nd.id, de.exercise_id, de.position, de.section, de.group_label,
         de.sets, de.reps, de.resistance, de.rest_seconds, de.note
  from day_exercises de
  join plan_days od on od.id = de.plan_day_id and od.plan_id = p_plan and od.week = p_from_week
  join plan_days nd on nd.plan_id = p_plan and nd.week = p_to_week and nd.day = od.day;
  get diagnostics v_exercises = row_count;

  return jsonb_build_object('days', v_days, 'exercises', v_exercises);
end;
$$;

-- A nap gyakorlatainak (day_exercises.id) sorrendje a megadott tömb szerint (position = 1, 2, 3...).
-- A tömbnek pontosan a nap összes gyakorlatát kell tartalmaznia, ismétlődés nélkül.
create or replace function admin_set_exercise_order(
  p_day uuid,
  p_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count int;
begin
  perform 1 from plan_days where id = p_day for update;
  if not found then
    raise exception 'day_not_found' using errcode = 'P0001';
  end if;

  select count(*) into v_count from day_exercises where plan_day_id = p_day;

  if p_ids is null
     or coalesce(array_length(p_ids, 1), 0) <> v_count
     or (select count(distinct x) from unnest(p_ids) as x) <> v_count
     or exists (
       select 1
       from unnest(p_ids) as x
       where not exists (select 1 from day_exercises de where de.id = x and de.plan_day_id = p_day)
     ) then
    raise exception 'order_mismatch' using errcode = 'P0001';
  end if;

  update day_exercises de
  set position = t.ord
  from unnest(p_ids) with ordinality as t(id, ord)
  where de.id = t.id and de.plan_day_id = p_day;
end;
$$;

-- Terv törlése: csak akkor, ha egyetlen ügyfél sincs hozzárendelve.
-- (A napok és gyakorlat-sorok kaszkádolva törlődnek; a `exercises` sorok megmaradnak.)
create or replace function admin_delete_plan(p_plan uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform 1 from plans where id = p_plan for update;
  if not found then
    raise exception 'plan_not_found' using errcode = 'P0001';
  end if;

  if exists (select 1 from clients where plan_id = p_plan) then
    raise exception 'plan_has_clients' using errcode = 'P0001';
  end if;

  delete from plans where id = p_plan;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3) Jogosultságok
-- ---------------------------------------------------------------------------

revoke execute on function admin_list_exercises() from public, anon, authenticated;
revoke execute on function admin_copy_plan(uuid, text, text, boolean) from public, anon, authenticated;
revoke execute on function admin_copy_week(uuid, int, int) from public, anon, authenticated;
revoke execute on function admin_set_exercise_order(uuid, uuid[]) from public, anon, authenticated;
revoke execute on function admin_delete_plan(uuid) from public, anon, authenticated;

grant execute on function admin_list_exercises() to service_role;
grant execute on function admin_copy_plan(uuid, text, text, boolean) to service_role;
grant execute on function admin_copy_week(uuid, int, int) to service_role;
grant execute on function admin_set_exercise_order(uuid, uuid[]) to service_role;
grant execute on function admin_delete_plan(uuid) to service_role;

-- A service_role kikerüli az RLS-t, de táblajog kell neki. A schema.sql revoke parancsai csak az
-- anon/authenticated szerepet érintették, így ez normál esetben már megvan; a grant újrafuttatható és ártalmatlan.
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
