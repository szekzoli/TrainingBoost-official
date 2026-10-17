-- TrainingBoost edzésnapló app – Supabase séma (docs/app-terv.md 4. és 5. fejezet)
-- A kód hash-e: lower-case hex SHA-256 az UTF-8 kódból, pl. encode(sha256(convert_to(code, 'utf8')), 'hex').
-- A scripts/create-client.ts ugyanezt a hash-t számolja.

-- ---------------------------------------------------------------------------
-- Táblák
-- ---------------------------------------------------------------------------

-- Tervek
create table plans (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  created_at timestamptz not null default now()
);

create table plan_days (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references plans(id) on delete cascade,
  week int not null,
  day int not null,
  title text,
  unique (plan_id, week, day)
);

create table exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  video_url text,          -- YouTube unlisted link vagy embed azonosító
  technique_note text
);

create table day_exercises (
  id uuid primary key default gen_random_uuid(),
  plan_day_id uuid not null references plan_days(id) on delete cascade,
  exercise_id uuid not null references exercises(id),
  position int not null,
  group_label text,        -- pl. "A" / "B" szuperszett-csoport
  sets int not null,
  reps text not null,      -- SZÖVEG, mert "8-12" jellegű értékek is vannak
  rest_seconds int,
  note text
);

-- Vásárlók
create table clients (
  id uuid primary key default gen_random_uuid(),
  label text not null,                 -- Zoli saját jelölése, pl. keresztnév
  access_code_hash text unique not null,
  plan_id uuid not null references plans(id),
  consent_at timestamptz,              -- adatkezelési hozzájárulás időpontja
  consent_version text,                -- az elfogadott adatkezelési tájékoztató verziója
  revoked_at timestamptz,              -- ha ki van tiltva / érvénytelenítve
  created_at timestamptz not null default now()
);

-- Napló
create table workout_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  plan_day_id uuid not null references plan_days(id),
  completed_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  unique (client_id, plan_day_id)
);

create table set_logs (
  id uuid primary key default gen_random_uuid(),
  workout_log_id uuid not null references workout_logs(id) on delete cascade,
  day_exercise_id uuid not null references day_exercises(id),
  set_number int not null,
  weight_kg numeric(6,2),
  reps int,
  logged_at timestamptz not null default now(),
  unique (workout_log_id, day_exercise_id, set_number)
);

create index day_exercises_plan_day_idx on day_exercises (plan_day_id, position);
create index set_logs_day_exercise_idx on set_logs (day_exercise_id);

-- ---------------------------------------------------------------------------
-- Minden tábla zárt a nyilvános kulcs elől
-- ---------------------------------------------------------------------------

alter table plans enable row level security;
alter table plan_days enable row level security;
alter table exercises enable row level security;
alter table day_exercises enable row level security;
alter table clients enable row level security;
alter table workout_logs enable row level security;
alter table set_logs enable row level security;
-- (Szándékosan nincs policy az anon/authenticated szerepeknek.)

-- ---------------------------------------------------------------------------
-- Belső segédfüggvény: kód -> client_id (hibát dob, ha érvénytelen/visszavont)
-- Nem hívható kívülről (lásd a jogosultságokat lent).
-- ---------------------------------------------------------------------------

create or replace function app_resolve_client(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_client_id uuid;
begin
  if p_code is null or length(p_code) < 20 then
    raise exception 'invalid_code' using errcode = 'P0001';
  end if;

  select id into v_client_id
  from clients
  where access_code_hash = encode(sha256(convert_to(p_code, 'utf8')), 'hex')
    and revoked_at is null;

  if v_client_id is null then
    raise exception 'invalid_code' using errcode = 'P0001';
  end if;

  return v_client_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC függvények
-- ---------------------------------------------------------------------------

-- A vásárló tervét adja vissza: { plan, days: [{ ..., exercises: [{ ..., exercise }] }] }
create or replace function app_get_plan(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_client_id uuid := app_resolve_client(p_code);
  v_plan_id uuid;
  v_result jsonb;
begin
  select plan_id into v_plan_id from clients where id = v_client_id;

  select jsonb_build_object(
    'plan', jsonb_build_object(
      'id', p.id,
      'slug', p.slug,
      'title', p.title,
      'description', p.description
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
                'group_label', de.group_label,
                'sets', de.sets,
                'reps', de.reps,
                'rest_seconds', de.rest_seconds,
                'note', de.note,
                'exercise', jsonb_build_object(
                  'id', e.id,
                  'name', e.name,
                  'video_url', e.video_url,
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

-- A vásárló összes naplózott edzése és szetje:
-- [{ plan_day_id, completed_at, note, sets: [{ day_exercise_id, set_number, weight_kg, reps, logged_at }] }]
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

-- Szet rögzítése vagy módosítása (upsert); létrehozza a workout_logs sort, ha még nincs.
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
  v_workout_log_id uuid;
  v_set set_logs;
begin
  if not exists (select 1 from clients where id = v_client_id and consent_at is not null) then
    raise exception 'consent_required' using errcode = 'P0001';
  end if;

  if p_set_number is null or p_set_number < 1 or p_set_number > 50 then
    raise exception 'invalid_set_number' using errcode = 'P0001';
  end if;
  if p_weight is not null and (p_weight < 0 or p_weight >= 10000) then
    raise exception 'invalid_weight' using errcode = 'P0001';
  end if;
  if p_reps is not null and (p_reps < 0 or p_reps > 1000) then
    raise exception 'invalid_reps' using errcode = 'P0001';
  end if;

  -- Csak a vásárló saját tervéhez tartozó gyakorlat fogadható el.
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
    set client_id = excluded.client_id   -- no-op, hogy a RETURNING mindig adjon sort
  returning id into v_workout_log_id;

  insert into set_logs (workout_log_id, day_exercise_id, set_number, weight_kg, reps)
  values (v_workout_log_id, p_day_exercise_id, p_set_number, p_weight, p_reps)
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

-- Az edzésnapot elvégzettnek jelöli (létrehozza a workout_logs sort, ha még nincs).
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

  -- Csak a vásárló saját tervének napja fogadható el.
  if not exists (
    select 1
    from plan_days pd
    join clients c on c.plan_id = pd.plan_id
    where pd.id = p_plan_day_id
      and c.id = v_client_id
  ) then
    raise exception 'not_in_plan' using errcode = 'P0001';
  end if;

  insert into workout_logs (client_id, plan_day_id, completed_at, note)
  values (v_client_id, p_plan_day_id, now(), p_note)
  on conflict (client_id, plan_day_id) do update
    set completed_at = now(),
        note = excluded.note
  returning * into v_log;

  return jsonb_build_object(
    'plan_day_id', v_log.plan_day_id,
    'completed_at', v_log.completed_at,
    'note', v_log.note
  );
end;
$$;

-- Adatkezelési hozzájárulás rögzítése (újrahívásnál az új verzióra frissíti).
create or replace function app_give_consent(p_code text, p_version text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_client_id uuid := app_resolve_client(p_code);
  v_consent_at timestamptz;
begin
  if p_version is null or length(trim(p_version)) = 0 or length(p_version) > 50 then
    raise exception 'invalid_version' using errcode = 'P0001';
  end if;

  update clients
  set consent_at = now(),
      consent_version = p_version
  where id = v_client_id
  returning consent_at into v_consent_at;

  return jsonb_build_object(
    'consent_at', v_consent_at,
    'consent_version', p_version
  );
end;
$$;

-- Törli a vásárló naplóadatait és magát a clients sort (a workout_logs/set_logs kaszkádolva törlődik).
create or replace function app_delete_my_data(p_code text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_client_id uuid := app_resolve_client(p_code);
begin
  delete from clients where id = v_client_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Jogosultságok: csak az anon szerep hívhatja az app_* RPC-ket
-- ---------------------------------------------------------------------------

revoke all on function app_resolve_client(text) from public, anon, authenticated;

revoke all on function app_get_plan(text) from public, anon, authenticated;
revoke all on function app_get_logs(text) from public, anon, authenticated;
revoke all on function app_log_set(text, uuid, int, numeric, int) from public, anon, authenticated;
revoke all on function app_complete_day(text, uuid, text) from public, anon, authenticated;
revoke all on function app_delete_my_data(text) from public, anon, authenticated;
revoke all on function app_give_consent(text, text) from public, anon, authenticated;

grant execute on function app_get_plan(text) to anon;
grant execute on function app_get_logs(text) to anon;
grant execute on function app_log_set(text, uuid, int, numeric, int) to anon;
grant execute on function app_complete_day(text, uuid, text) to anon;
grant execute on function app_delete_my_data(text) to anon;
grant execute on function app_give_consent(text, text) to anon;

-- Az anon/authenticated szerepek ne érjék el közvetlenül a táblákat (a meglévőket és a jövőbelieket sem)
revoke all on all tables in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
