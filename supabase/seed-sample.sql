-- TrainingBoost – minta terv betöltése (A/B program, heti 2 edzés, 6 hét)
-- Futtatás: Supabase SQL Editor -> New query -> beillesztés -> Run (EGYSZER).
-- A terv nevek és vásárlóspecifikus súlyok nélküli, tesztadat.

-- 1) Séma-kiegészítés: szakasz (aktiválás / könnyebb / nagy ellenállás / core / nyújtás)
alter table day_exercises add column if not exists section text;

-- 2) app_get_plan frissítése: a 'section' mezőt is visszaadja.
--    (create or replace: a meglévő jogosultságok megmaradnak)
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

-- 3) A terv (ha a slug már létezik, a futás hibával megáll, így nem duplázódik)
insert into plans (slug, title, description)
values (
  'teszt-2x-hetente',
  'Teszt terv – heti 2 edzés (A/B)',
  '6 hét, hetente két edzés: A és B program váltakozva. Tesztadat az app kipróbálásához.'
);

-- A gyakorlatok ideiglenes táblában (program, sorrend, szakasz, szuperszett-csoport, név, szett, ismétlés, megjegyzés)
create temp table _seed (
  program text, pos int, section text, grp text,
  name text, sets int, reps text, note text
);

insert into _seed values
-- ===== A program =====
('A',  1, 'Farizomzat és core aktiválás', null, 'Fitball csípőemelés, behúzás',          1, '8-8',  null),
('A',  2, 'Farizomzat és core aktiválás', null, 'Plank-fekvőtámasz',                    1, '8-8',  null),
('A',  3, 'Könnyebb ellenállásos',        null, 'Goblet squat pause tárcsa',            2, '10 és 6', null),
('A',  4, 'Könnyebb ellenállásos',        null, 'Könnyített fekvő',                     2, '12',   null),
('A',  5, 'Nagy ellenállásos',            null, 'Back squat',                           2, '12',   null),
('A',  6, 'Nagy ellenállásos',            null, 'Single leg hip thust',                 2, '10',   null),
('A',  7, 'Nagy ellenállásos',            null, 'Hiperhajlítás',                        3, '12',   null),
('A',  8, 'Nagy ellenállásos',            null, 'Melltől tolás szűk',                   3, '10',   null),
('A',  9, 'Nagy ellenállásos',            null, 'Lehúzás kábel egykezes',               2, '10',   null),
('A', 10, 'Nagy ellenállásos',            null, 'Döntött t. oldalemelés',               2, '12',   null),
('A', 11, 'Befejező core',                null, 'Fitball core',                         2, '10s tartás, 8 rollout, 5s tartás', null),
('A', 12, 'Befejező core',                null, 'Kettlebell suitcase carry',            2, 'Séta oda-vissza', null),
('A', 13, 'Nyújtás',                      null, 'Alapos alsótest és felsőtest nyújtás', 1, '–',    null),
-- ===== B program =====
('B',  1, 'Farizomzat és core aktiválás', null, 'Side plank clamshell',                 1, '10-10', null),
('B',  2, 'Farizomzat és core aktiválás', null, 'Plank terpeszbe lépés',                1, '6-6',   null),
('B',  3, 'Könnyebb ellenállásos',        null, 'DL + guggolás',                        2, '12 és 10', null),
('B',  4, 'Könnyebb ellenállásos',        null, 'KB HALO',                              2, '8-8',   null),
('B',  5, 'Nagy ellenállásos',            null, 'Split squat Smith',                    3, '10-10', 'Az első szett könnyű melegítő, utána 2 munkaszett.'),
('B',  6, 'Nagy ellenállásos',            null, 'Deadlift Smith',                       2, '12',    null),
('B',  7, 'Nagy ellenállásos',            null, 'Combközelítő gép',                     2, '12',    null),
('B',  8, 'Nagy ellenállásos',            'A',  'Egykaros vállból nyomás k.súlyzó',     2, '12-12', 'Szuperszett: a következő gyakorlattal együtt, szünet nélkül.'),
('B',  9, 'Nagy ellenállásos',            'A',  'Landmine evezés',                      2, '10',    'Szuperszett: az előző gyakorlattal együtt.'),
('B', 10, 'Nagy ellenállásos',            null, 'Bayesian bicepsz kábeles gép',         2, '10',    null),
('B', 11, 'Befejező core',                null, 'Side plank',                           2, '4-4 mozgatás + 6 beengedés', null),
('B', 12, 'Befejező core',                null, 'Plank tartás',                         1, '90s',   null),
('B', 13, 'Nyújtás',                      null, 'Alapos alsótest és felsőtest nyújtás', 1, '–',     null);

-- Gyakorlatok (név szerint egyedien)
insert into exercises (name)
select distinct s.name
from _seed s
where not exists (select 1 from exercises e where e.name = s.name);

-- 6 hét × 2 nap (1. nap = A program, 2. nap = B program)
insert into plan_days (plan_id, week, day, title)
select p.id, w, d, case d when 1 then 'A program' else 'B program' end
from plans p
cross join generate_series(1, 6) as w
cross join generate_series(1, 2) as d
where p.slug = 'teszt-2x-hetente';

-- Gyakorlatok a napokra
insert into day_exercises (plan_day_id, exercise_id, position, group_label, section, sets, reps, note)
select pd.id, e.id, s.pos, s.grp, s.section, s.sets, s.reps, s.note
from _seed s
join plans p on p.slug = 'teszt-2x-hetente'
join plan_days pd on pd.plan_id = p.id
                 and pd.day = case s.program when 'A' then 1 else 2 end
join exercises e on e.name = s.name;

-- 4) Teszt vásárló (hozzájárulás nélkül, hogy a hozzájárulási képernyő is kipróbálható legyen)
--    Teszt link: /app/t/teszt-kod-trainingboost-2026-a1
--    FIGYELEM: ez nyilvános teszt kód, éles indulás előtt töröld: delete from clients where label = 'TESZT';
insert into clients (label, access_code_hash, plan_id)
select 'TESZT',
       encode(sha256(convert_to('teszt-kod-trainingboost-2026-a1', 'utf8')), 'hex'),
       p.id
from plans p
where p.slug = 'teszt-2x-hetente';

drop table _seed;
