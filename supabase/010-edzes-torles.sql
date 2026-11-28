-- TrainingBoost – 10. migráció: edzés törlése az ügyfél-appból
-- Futtatás: Supabase SQL Editor -> New query -> beillesztés -> Run. Újrafuttatható.
-- Előfeltétel: 009-edzes-reszletek.sql már lefutott.
--
-- app_delete_workout: az ügyfél a saját, adott napra rögzített edzését törli (rosszul rögzített edzés).
-- A workout_logs sora törlődik, vele kaszkádolva a sorozatai (set_logs): a kezdés, a lezárás, a dátum,
-- a nehézség és a jegyzet is. A terv (a nap és a gyakorlatai) nem változik, a nap újra elvégezhető.
-- Csak a saját kódjához tartozó, a saját tervében lévő napot törölheti.

create or replace function app_delete_workout(p_code text, p_plan_day_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_client_id uuid := app_resolve_client(p_code);
  v_deleted int;
begin
  if not exists (
    select 1
    from plan_days pd
    join clients c on c.plan_id = pd.plan_id
    where pd.id = p_plan_day_id
      and c.id = v_client_id
  ) then
    raise exception 'not_in_plan' using errcode = 'P0001';
  end if;

  delete from workout_logs
  where client_id = v_client_id
    and plan_day_id = p_plan_day_id;
  get diagnostics v_deleted = row_count;

  return jsonb_build_object('plan_day_id', p_plan_day_id, 'deleted', v_deleted > 0);
end;
$$;

revoke all on function app_delete_workout(text, uuid) from public, anon, authenticated;
grant execute on function app_delete_workout(text, uuid) to anon;
