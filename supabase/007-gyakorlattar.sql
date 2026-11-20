-- TrainingBoost – 7. migráció: gyakorlattár csoportosítás és gyakorlatcsere
-- Futtatás: Supabase SQL Editor -> New query -> beillesztés -> Run. Újrafuttatható.
-- Előfeltétel: 006-ugyfel-reszletek.sql már lefutott.
--
--   1) exercises.equipment (eszköz) és exercises.muscle_group (fő izomcsoport). A meglévő
--      exercises.category mostantól a mozgásminta (Felsőtest – toló / húzó, Alsótest – térd / csípő
--      domináns, Core, Kondi / intenzív, Bemelegítés / mobilitás).
--   2) admin_list_exercises: az új mezőkkel.
--   3) admin_replace_exercise: egy terv-sorban a gyakorlat cseréje (sorozat, ismétlés, ellenállás,
--      pihenő, megjegyzés marad), hatókörrel: csak ez a hét / ettől a héttől / minden hét.
--      Ahol az ügyfél már naplózott sorozatot, azt a hetet kihagyja (a napló ne keveredjen).

alter table exercises add column if not exists equipment text;
alter table exercises add column if not exists muscle_group text;

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
  plan_count int
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select e.id, e.name, e.category, e.equipment, e.muscle_group, e.video_url, e.image_url, e.technique_note, e.archived,
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

create or replace function admin_replace_exercise(p_id uuid, p_exercise uuid, p_scope text)
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
  v_replaced int := 0;
  v_logged int[] := '{}';
  v_unmatched int[] := '{}';
begin
  if p_scope is null or p_scope not in ('this', 'from', 'all') then
    raise exception 'invalid_scope' using errcode = 'P0001';
  end if;

  select * into v_row from day_exercises where id = p_id;
  if not found then
    raise exception 'row_not_found' using errcode = 'P0001';
  end if;
  if not exists (select 1 from exercises where id = p_exercise) then
    raise exception 'exercise_not_found' using errcode = 'P0001';
  end if;
  if exists (select 1 from exercises where id = p_exercise and archived) then
    raise exception 'exercise_archived' using errcode = 'P0001';
  end if;

  select * into v_day from plan_days where id = v_row.plan_day_id;
  perform 1 from plans where id = v_day.plan_id for update;

  if v_row.exercise_id = p_exercise then
    return jsonb_build_object('replaced', 0, 'logged_weeks', '[]'::jsonb, 'unmatched_weeks', '[]'::jsonb);
  end if;

  -- Hányadik az azonos (gyakorlat, szakasz) kulcsú sorok között a napon (ugyanaz a párosítás,
  -- mint a sorozat/ismétlés módosításánál)
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

    if exists (select 1 from set_logs s where s.day_exercise_id = v_target) then
      v_logged := v_logged || v_week;
      continue;
    end if;

    update day_exercises set exercise_id = p_exercise where id = v_target;
    v_replaced := v_replaced + 1;
  end loop;

  return jsonb_build_object(
    'replaced', v_replaced,
    'logged_weeks', to_jsonb(v_logged),
    'unmatched_weeks', to_jsonb(v_unmatched)
  );
end;
$$;

revoke execute on function admin_list_exercises() from public, anon, authenticated;
revoke execute on function admin_replace_exercise(uuid, uuid, text) from public, anon, authenticated;
grant execute on function admin_list_exercises() to service_role;
grant execute on function admin_replace_exercise(uuid, uuid, text) to service_role;
