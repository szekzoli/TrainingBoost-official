-- TrainingBoost – 8. migráció: heti testsúly-napló
-- Futtatás: Supabase SQL Editor -> New query -> beillesztés -> Run. Újrafuttatható.
-- Előfeltétel: 006-ugyfel-reszletek.sql már lefutott.
--
--   1) body_weights tábla: ügyfelenként naponta legfeljebb egy mérés (kg, egy tizedes).
--      Az ügyfél törlésével (app_delete_my_data, admin törlés) a mérései is törlődnek.
--   2) app_log_weight: mérés mentése / felülírása; üres súllyal az adott napi mérés törlése.
--   3) app_get_weights: az ügyfél összes mérése, dátum szerint.
--   Az admin a service kulccsal közvetlenül olvassa a táblát.

create table if not exists body_weights (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients (id) on delete cascade,
  measured_on date not null,
  weight_kg numeric(5, 1) not null check (weight_kg between 20 and 400),
  created_at timestamptz not null default now(),
  unique (client_id, measured_on)
);

alter table body_weights enable row level security;
revoke all on table body_weights from anon, authenticated;
-- Az admin (service kulcs) olvashatja és törölheti
grant all on table body_weights to service_role;

create or replace function app_get_weights(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_client_id uuid := app_resolve_client(p_code);
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object('measured_on', b.measured_on, 'weight_kg', b.weight_kg) order by b.measured_on)
    from body_weights b
    where b.client_id = v_client_id
  ), '[]'::jsonb);
end;
$$;

create or replace function app_log_weight(p_code text, p_date date, p_weight numeric)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_client_id uuid := app_resolve_client(p_code);
  v_row body_weights;
begin
  if not exists (select 1 from clients where id = v_client_id and consent_at is not null) then
    raise exception 'consent_required' using errcode = 'P0001';
  end if;
  if p_date is null or p_date < date '2020-01-01' or p_date > (now() at time zone 'Europe/Budapest')::date + 1 then
    raise exception 'invalid_date' using errcode = 'P0001';
  end if;

  if p_weight is null then
    delete from body_weights where client_id = v_client_id and measured_on = p_date;
    return jsonb_build_object('measured_on', p_date, 'weight_kg', null);
  end if;

  if p_weight < 20 or p_weight > 400 then
    raise exception 'invalid_weight' using errcode = 'P0001';
  end if;

  insert into body_weights (client_id, measured_on, weight_kg)
  values (v_client_id, p_date, round(p_weight, 1))
  on conflict (client_id, measured_on) do update
    set weight_kg = excluded.weight_kg
  returning * into v_row;

  return jsonb_build_object('measured_on', v_row.measured_on, 'weight_kg', v_row.weight_kg);
end;
$$;

revoke all on function app_get_weights(text) from public, anon, authenticated;
revoke all on function app_log_weight(text, date, numeric) from public, anon, authenticated;
grant execute on function app_get_weights(text) to anon;
grant execute on function app_log_weight(text, date, numeric) to anon;
