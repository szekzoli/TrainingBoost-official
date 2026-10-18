-- TrainingBoost – 2. migráció: ellenállás mező (egyetlen szöveges érték gyakorlatonként)
-- Futtatás: Supabase SQL Editor -> New query -> beillesztés -> Run (egyszer; újrafuttatható).
-- Előfeltétel: schema.sql és seed-sample.sql már lefutott.

-- 1) Új oszlop: az előírt ellenállás szabad szövegként (pl. "10 kg", "közepes gumiszalag", "testsúly")
alter table day_exercises add column if not exists resistance text;

-- 2) app_get_plan: a 'resistance' mezőt is visszaadja
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

-- 3) A teszt terv ellenállás-értékei (egy érték gyakorlatonként)
update day_exercises de
set resistance = v.res
from plan_days pd, plans p, exercises e,
     (values
       ('Fitball csípőemelés, behúzás', 'testsúly'),
       ('Plank-fekvőtámasz', 'testsúly'),
       ('Goblet squat pause tárcsa', '10 kg'),
       ('Könnyített fekvő', 'testsúly'),
       ('Back squat', '20 kg'),
       ('Single leg hip thust', '4 kg'),
       ('Hiperhajlítás', '10 kg'),
       ('Melltől tolás szűk', '22,5 kg'),
       ('Lehúzás kábel egykezes', '16,25 kg'),
       ('Döntött t. oldalemelés', '5 kg'),
       ('Fitball core', 'testsúly'),
       ('Kettlebell suitcase carry', '20 kg'),
       ('Side plank clamshell', 'testsúly'),
       ('Plank terpeszbe lépés', 'testsúly'),
       ('DL + guggolás', '12 kg'),
       ('KB HALO', '8 kg'),
       ('Split squat Smith', '10 kg'),
       ('Deadlift Smith', '20 kg'),
       ('Combközelítő gép', '38,5 kg'),
       ('Egykaros vállból nyomás k.súlyzó', '8 kg'),
       ('Landmine evezés', '3,75 kg'),
       ('Bayesian bicepsz kábeles gép', '6,25 kg'),
       ('Side plank', 'testsúly'),
       ('Plank tartás', 'testsúly')
     ) as v(name, res)
where de.plan_day_id = pd.id
  and pd.plan_id = p.id
  and p.slug = 'teszt-2x-hetente'
  and e.id = de.exercise_id
  and e.name = v.name;
