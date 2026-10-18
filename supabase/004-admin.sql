-- TrainingBoost – 4. migráció: admin B. szakasz (Tervek, Sablonok, Terv-szerkesztő)
-- Futtatás: Supabase SQL Editor -> New query -> beillesztés -> Run (újrafuttatható).
-- Előfeltétel: a 003-admin.sql már lefutott. A 003-at nem módosítja.
--
-- Az admin_* függvényeket kizárólag a helyi admin szerver hívja a titkos (service_role) kulccsal.

-- ---------------------------------------------------------------------------
-- 0) Előfeltétel
-- ---------------------------------------------------------------------------

do $$
begin
  if to_regprocedure('admin_copy_plan(uuid, text, text, boolean)') is null
     or to_regprocedure('admin_copy_week(uuid, int, int)') is null then
    raise exception 'Előbb futtasd a supabase/003-admin.sql fájlt.';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 1) Belső segédfüggvények (senki nem hívhatja kívülről, csak a többi függvény)
-- ---------------------------------------------------------------------------

-- Törli a szuperszett-jelölést azokról a sorokról, amelyek csoportjában már csak egy sor maradt.
create or replace function admin_cleanup_groups(p_day uuid)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update day_exercises de
  set group_label = null
  where de.plan_day_id = p_day
    and de.group_label is not null
    and (
      select count(*) from day_exercises x
      where x.plan_day_id = p_day and x.group_label = de.group_label
    ) < 2;
$$;

-- A sort a nap azonos szakaszú sorainak utolsója mögé helyezi (és a nap pozícióit újraszámozza).
-- Ha a szakasz máshol nem szerepel (vagy nincs szakasz), nem csinál semmit.
create or replace function admin_place_after_section(p_day uuid, p_id uuid, p_section text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_anchor int;
begin
  if p_section is null then
    return;
  end if;

  with others as (
    select id, section, row_number() over (order by position, id) as rn
    from day_exercises
    where plan_day_id = p_day and id <> p_id
  )
  select max(rn) into v_anchor from others where section = p_section;

  if v_anchor is null then
    return;
  end if;

  with others as (
    select id, row_number() over (order by position, id) as rn
    from day_exercises
    where plan_day_id = p_day and id <> p_id
  )
  update day_exercises de
  set position = o.rn + case when o.rn > v_anchor then 1 else 0 end
  from others o
  where de.id = o.id;

  update day_exercises set position = v_anchor + 1 where id = p_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2) Tervek: lista, lekérdezés, létrehozás
-- ---------------------------------------------------------------------------

-- Tervek (p_template = false) vagy sablonok (true) listája.
create or replace function admin_list_plans(p_template boolean)
returns table (
  id uuid,
  slug text,
  title text,
  description text,
  is_template boolean,
  created_at timestamptz,
  week_count int,
  max_days int,
  client_count int
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
         (select count(*) from clients c where c.plan_id = p.id)::int
  from plans p
  where p.is_template = coalesce(p_template, false)
  order by lower(p.title), p.created_at;
$$;

-- Egy teljes terv a szerkesztőnek: napok, gyakorlat-sorok, a gyakorlat adatai, és hogy van-e naplózott adat.
create or replace function admin_get_plan(p_plan uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_result jsonb;
begin
  select jsonb_build_object(
    'plan', jsonb_build_object(
      'id', p.id,
      'slug', p.slug,
      'title', p.title,
      'description', p.description,
      'is_template', p.is_template,
      'client_count', (select count(*) from clients c where c.plan_id = p.id)
    ),
    'days', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', d.id,
          'week', d.week,
          'day', d.day,
          'title', d.title,
          'has_logs', exists (select 1 from workout_logs w where w.plan_day_id = d.id),
          'exercises', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'id', de.id,
                'exercise_id', de.exercise_id,
                'position', de.position,
                'section', de.section,
                'group_label', de.group_label,
                'sets', de.sets,
                'reps', de.reps,
                'resistance', de.resistance,
                'rest_seconds', de.rest_seconds,
                'note', de.note,
                'has_logs', exists (select 1 from set_logs s where s.day_exercise_id = de.id),
                'exercise', jsonb_build_object(
                  'id', e.id,
                  'name', e.name,
                  'archived', e.archived,
                  'video_url', e.video_url
                )
              )
              order by de.position, de.id
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
  where p.id = p_plan;

  if v_result is null then
    raise exception 'plan_not_found' using errcode = 'P0001';
  end if;
  return v_result;
end;
$$;

-- Új üres terv: p_weeks hét × p_days nap, a napok címe "A program", "B program"...
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
  if p_weeks is null or p_weeks < 1 or p_weeks > 12 or p_days is null or p_days < 1 or p_days > 7 then
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

-- Új terv sablonból (nem sablon példány). Ha a sablonnak pontosan egy hete van, és p_weeks > 1,
-- az egyetlen hetet az új terv p_weeks hetére átmásolja ("egész heti" sablon kiterjesztése).
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
  if p_weeks is not null and (p_weeks < 1 or p_weeks > 12) then
    raise exception 'invalid_value' using errcode = 'P0001';
  end if;

  v_new := admin_copy_plan(p_source, p_title, p_slug, false);

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

-- ---------------------------------------------------------------------------
-- 3) Napok
-- ---------------------------------------------------------------------------

-- Új nap a hétre: a legkisebb szabad sorszám (1–7). Ha a hét még nem létezik, létrehozza az 1. napot.
create or replace function admin_add_day(p_plan uuid, p_week int)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_day int;
  v_id uuid;
begin
  if p_week is null or p_week < 1 or p_week > 52 then
    raise exception 'invalid_week' using errcode = 'P0001';
  end if;

  perform 1 from plans where id = p_plan for update;
  if not found then
    raise exception 'plan_not_found' using errcode = 'P0001';
  end if;

  select min(n) into v_day
  from generate_series(1, 7) as n
  where not exists (
    select 1 from plan_days where plan_id = p_plan and week = p_week and day = n
  );
  if v_day is null then
    raise exception 'week_full' using errcode = 'P0001';
  end if;

  insert into plan_days (plan_id, week, day, title)
  values (p_plan, p_week, v_day, chr(64 + v_day) || ' program')
  returning id into v_id;

  return v_id;
end;
$$;

-- Nap törlése (a gyakorlat-sorai kaszkádolva törlődnek). Naplózott edzés esetén nem törölhető.
create or replace function admin_delete_day(p_day uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_plan uuid;
begin
  select plan_id into v_plan from plan_days where id = p_day;
  if v_plan is null then
    raise exception 'day_not_found' using errcode = 'P0001';
  end if;

  perform 1 from plans where id = v_plan for update;

  if exists (select 1 from workout_logs where plan_day_id = p_day) then
    raise exception 'day_has_logs' using errcode = 'P0001';
  end if;

  delete from plan_days where id = p_day;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4) Gyakorlat-sorok a napokon
-- ---------------------------------------------------------------------------

-- Új sor a napra. Ha a szakasz már szerepel a napon, az azonos szakasz utolsó sora mögé kerül,
-- különben a nap végére. Az új sor azonosítóját adja vissza.
create or replace function admin_add_day_exercise(
  p_day uuid,
  p_exercise uuid,
  p_section text,
  p_sets int,
  p_reps text,
  p_resistance text,
  p_rest_seconds int,
  p_note text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_plan uuid;
  v_archived boolean;
  v_section text := nullif(btrim(coalesce(p_section, '')), '');
  v_reps text := btrim(coalesce(p_reps, ''));
  v_res text := nullif(btrim(coalesce(p_resistance, '')), '');
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_id uuid;
begin
  select plan_id into v_plan from plan_days where id = p_day;
  if v_plan is null then
    raise exception 'day_not_found' using errcode = 'P0001';
  end if;

  select archived into v_archived from exercises where id = p_exercise;
  if not found then
    raise exception 'exercise_not_found' using errcode = 'P0001';
  end if;
  if v_archived then
    raise exception 'exercise_archived' using errcode = 'P0001';
  end if;

  if length(v_section) > 60 or length(v_reps) < 1 or length(v_reps) > 60
     or length(v_res) > 80 or length(v_note) > 1000
     or p_sets is null or p_sets < 1 or p_sets > 50
     or (p_rest_seconds is not null and (p_rest_seconds < 0 or p_rest_seconds > 3600)) then
    raise exception 'invalid_value' using errcode = 'P0001';
  end if;

  perform 1 from plans where id = v_plan for update;

  insert into day_exercises (plan_day_id, exercise_id, position, section, sets, reps, resistance, rest_seconds, note)
  values (
    p_day, p_exercise,
    coalesce((select max(position) from day_exercises where plan_day_id = p_day), 0) + 1,
    v_section, p_sets, v_reps, v_res, p_rest_seconds, v_note
  )
  returning id into v_id;

  perform admin_place_after_section(p_day, v_id, v_section);
  return v_id;
end;
$$;

-- Sor módosítása.
--  * sets, reps, resistance, rest_seconds, note: a p_scope szerint ('this' | 'from' | 'all') más hetekre is.
--    Párosítás: ugyanaz a nap sorszáma, ugyanaz a gyakorlat és szakasz; ha a gyakorlat többször szerepel a
--    napon, a nap szerinti sorrend (pozíció) dönt. A nem párosítható hetek listáját visszaadja.
--  * section: csak erre a sorra vonatkozik (a sor az azonos szakasz mögé kerül, a szuperszett-jelölése megszűnik).
-- Visszatérés: { updated, unmatched_weeks, row }
create or replace function admin_update_day_exercise(p_id uuid, p_fields jsonb, p_scope text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row day_exercises;
  v_day plan_days;
  v_ord int;
  v_week int;
  v_pd uuid;
  v_target uuid;
  v_updated int := 0;
  v_unmatched int[] := '{}';
  v_sets int;
  v_reps text;
  v_res text;
  v_rest int;
  v_note text;
  v_section text;
begin
  if p_scope is null or p_scope not in ('this', 'from', 'all') then
    raise exception 'invalid_scope' using errcode = 'P0001';
  end if;
  if p_fields is null or jsonb_typeof(p_fields) <> 'object' then
    raise exception 'invalid_value' using errcode = 'P0001';
  end if;

  select * into v_row from day_exercises where id = p_id;
  if not found then
    raise exception 'row_not_found' using errcode = 'P0001';
  end if;
  select * into v_day from plan_days where id = v_row.plan_day_id;

  perform 1 from plans where id = v_day.plan_id for update;

  -- Értékek ellenőrzése
  if p_fields ? 'sets' then
    v_sets := (p_fields->>'sets')::int;
    if v_sets is null or v_sets < 1 or v_sets > 50 then
      raise exception 'invalid_value' using errcode = 'P0001';
    end if;
  end if;
  if p_fields ? 'reps' then
    v_reps := btrim(coalesce(p_fields->>'reps', ''));
    if length(v_reps) < 1 or length(v_reps) > 60 then
      raise exception 'invalid_value' using errcode = 'P0001';
    end if;
  end if;
  if p_fields ? 'resistance' then
    v_res := nullif(btrim(coalesce(p_fields->>'resistance', '')), '');
    if length(v_res) > 80 then
      raise exception 'invalid_value' using errcode = 'P0001';
    end if;
  end if;
  if p_fields ? 'rest_seconds' then
    v_rest := (p_fields->>'rest_seconds')::int;
    if v_rest is not null and (v_rest < 0 or v_rest > 3600) then
      raise exception 'invalid_value' using errcode = 'P0001';
    end if;
  end if;
  if p_fields ? 'note' then
    v_note := nullif(btrim(coalesce(p_fields->>'note', '')), '');
    if length(v_note) > 1000 then
      raise exception 'invalid_value' using errcode = 'P0001';
    end if;
  end if;
  if p_fields ? 'section' then
    v_section := nullif(btrim(coalesce(p_fields->>'section', '')), '');
    if length(v_section) > 60 then
      raise exception 'invalid_value' using errcode = 'P0001';
    end if;
  end if;

  -- Hatókör szerinti módosítás
  if p_fields ?| array['sets', 'reps', 'resistance', 'rest_seconds', 'note'] then
    -- Hányadik az azonos (gyakorlat, szakasz) kulcsú sorok között a napon
    select count(*) into v_ord
    from day_exercises de
    where de.plan_day_id = v_day.id
      and de.exercise_id = v_row.exercise_id
      and coalesce(de.section, '') = coalesce(v_row.section, '')
      and (de.position < v_row.position or (de.position = v_row.position and de.id <= v_row.id));

    for v_week in
      select distinct pd.week
      from plan_days pd
      where pd.plan_id = v_day.plan_id
        and (p_scope = 'all' or (p_scope = 'from' and pd.week >= v_day.week) or pd.week = v_day.week)
      order by pd.week
    loop
      select pd.id into v_pd
      from plan_days pd
      where pd.plan_id = v_day.plan_id and pd.week = v_week and pd.day = v_day.day;

      v_target := null;
      if v_pd is not null then
        select de.id into v_target
        from day_exercises de
        where de.plan_day_id = v_pd
          and de.exercise_id = v_row.exercise_id
          and coalesce(de.section, '') = coalesce(v_row.section, '')
        order by de.position, de.id
        offset v_ord - 1 limit 1;
      end if;

      if v_target is null then
        v_unmatched := v_unmatched || v_week;
        continue;
      end if;

      update day_exercises
      set sets = case when p_fields ? 'sets' then v_sets else sets end,
          reps = case when p_fields ? 'reps' then v_reps else reps end,
          resistance = case when p_fields ? 'resistance' then v_res else resistance end,
          rest_seconds = case when p_fields ? 'rest_seconds' then v_rest else rest_seconds end,
          note = case when p_fields ? 'note' then v_note else note end
      where id = v_target;
      v_updated := v_updated + 1;
    end loop;
  end if;

  -- Szakasz: csak erre a sorra
  if (p_fields ? 'section') and (v_section is distinct from v_row.section) then
    update day_exercises set section = v_section, group_label = null where id = p_id;
    perform admin_place_after_section(v_day.id, p_id, v_section);
    perform admin_cleanup_groups(v_day.id);
    v_updated := v_updated + 1;
  end if;

  return jsonb_build_object(
    'updated', v_updated,
    'unmatched_weeks', to_jsonb(v_unmatched),
    'row', (select to_jsonb(de) from day_exercises de where de.id = p_id)
  );
end;
$$;

-- Sor törlése. Naplózott sorozat esetén nem törölhető. A nap pozícióit újraszámozza,
-- és megszünteti a magára maradt szuperszett-jelölést.
create or replace function admin_delete_day_exercise(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_day uuid;
  v_plan uuid;
begin
  select de.plan_day_id, pd.plan_id into v_day, v_plan
  from day_exercises de
  join plan_days pd on pd.id = de.plan_day_id
  where de.id = p_id;
  if v_day is null then
    raise exception 'row_not_found' using errcode = 'P0001';
  end if;

  perform 1 from plans where id = v_plan for update;

  if exists (select 1 from set_logs where day_exercise_id = p_id) then
    raise exception 'row_has_logs' using errcode = 'P0001';
  end if;

  delete from day_exercises where id = p_id;

  with r as (
    select id, row_number() over (order by position, id) as rn
    from day_exercises where plan_day_id = v_day
  )
  update day_exercises de set position = r.rn from r where de.id = r.id;

  perform admin_cleanup_groups(v_day);
end;
$$;

-- Szuperszett: a megadott sorok közös jelölést kapnak (p_label: 'A'..'Z'), vagy a jelölést elveszik (null).
-- Feltétel: ugyanazon a napon, ugyanabban a szakaszban, egymás melletti pozíciókon (legalább 2 sor),
-- és a jelölést más sorok nem használják a napon.
create or replace function admin_set_group(p_ids uuid[], p_label text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_n int;
  v_days int;
  v_sections int;
  v_day uuid;
  v_plan uuid;
  v_span int;
begin
  if p_ids is null or coalesce(array_length(p_ids, 1), 0) < 1 then
    raise exception 'group_invalid' using errcode = 'P0001';
  end if;

  select count(*), count(distinct plan_day_id), count(distinct coalesce(section, '')), (array_agg(plan_day_id))[1]
  into v_n, v_days, v_sections, v_day
  from day_exercises
  where id = any(p_ids);

  if v_n <> (select count(distinct x) from unnest(p_ids) as x) or v_days <> 1 then
    raise exception 'group_invalid' using errcode = 'P0001';
  end if;

  select plan_id into v_plan from plan_days where id = v_day;
  perform 1 from plans where id = v_plan for update;

  if p_label is not null then
    if p_label !~ '^[A-Z]$' then
      raise exception 'invalid_value' using errcode = 'P0001';
    end if;
    if v_n < 2 or v_sections <> 1 then
      raise exception 'group_invalid' using errcode = 'P0001';
    end if;

    with ranked as (
      select id, row_number() over (order by position, id) as rn
      from day_exercises where plan_day_id = v_day
    )
    select max(rn) - min(rn) + 1 into v_span from ranked where id = any(p_ids);
    if v_span <> v_n then
      raise exception 'group_invalid' using errcode = 'P0001';
    end if;

    if exists (
      select 1 from day_exercises
      where plan_day_id = v_day and group_label = p_label and not (id = any(p_ids))
    ) then
      raise exception 'label_taken' using errcode = 'P0001';
    end if;
  end if;

  update day_exercises set group_label = p_label where id = any(p_ids);
  perform admin_cleanup_groups(v_day);
end;
$$;

-- ---------------------------------------------------------------------------
-- 5) Jogosultságok
-- ---------------------------------------------------------------------------

-- Belső segédfüggvények: senki nem hívhatja kívülről
revoke execute on function admin_cleanup_groups(uuid) from public, anon, authenticated, service_role;
revoke execute on function admin_place_after_section(uuid, uuid, text) from public, anon, authenticated, service_role;

revoke execute on function admin_list_plans(boolean) from public, anon, authenticated;
revoke execute on function admin_get_plan(uuid) from public, anon, authenticated;
revoke execute on function admin_create_plan(text, text, text, int, int, boolean) from public, anon, authenticated;
revoke execute on function admin_plan_from_template(uuid, text, text, int) from public, anon, authenticated;
revoke execute on function admin_add_day(uuid, int) from public, anon, authenticated;
revoke execute on function admin_delete_day(uuid) from public, anon, authenticated;
revoke execute on function admin_add_day_exercise(uuid, uuid, text, int, text, text, int, text) from public, anon, authenticated;
revoke execute on function admin_update_day_exercise(uuid, jsonb, text) from public, anon, authenticated;
revoke execute on function admin_delete_day_exercise(uuid) from public, anon, authenticated;
revoke execute on function admin_set_group(uuid[], text) from public, anon, authenticated;

grant execute on function admin_list_plans(boolean) to service_role;
grant execute on function admin_get_plan(uuid) to service_role;
grant execute on function admin_create_plan(text, text, text, int, int, boolean) to service_role;
grant execute on function admin_plan_from_template(uuid, text, text, int) to service_role;
grant execute on function admin_add_day(uuid, int) to service_role;
grant execute on function admin_delete_day(uuid) to service_role;
grant execute on function admin_add_day_exercise(uuid, uuid, text, int, text, text, int, text) to service_role;
grant execute on function admin_update_day_exercise(uuid, jsonb, text) to service_role;
grant execute on function admin_delete_day_exercise(uuid) to service_role;
grant execute on function admin_set_group(uuid[], text) to service_role;
