-- Sablon: OTTHONI – váll + teljes test, 1 edzésnap, 4 hét (minden héten ugyanaz)
-- Futtatás: Supabase SQL Editor -> New query -> beillesztés -> Run. Előfeltétel: 005-kovetes.sql és 007-gyakorlattar.sql.
-- Újrafuttatható: ha a sablon (slug: otthoni-vall-teljes-test) már létezik, nem csinál semmit.
-- Utána az adminban: Ügyfelek -> Új ügyfél -> Sablonból -> ez a sablon.
-- A hetek számát a v_weeks változóban állíthatod.

-- 1) Gyakorlatok a gyakorlattárba (ami már megvan ugyanazzal a névvel, azt nem bántja)
insert into exercises (name, category, muscle_group, equipment, technique_note) values
  ('Vállból nyomás kézisúlyzóval ülve', 'Felsőtest – toló', 'Váll', 'Kézisúlyzó', null),
  ('Egykezes Z-ülés vállból nyomás kézisúlyzóval', 'Felsőtest – toló', 'Váll', 'Kézisúlyzó',
     'Talajon ülve, nyújtott lábbal (Z-ülés), háttámasz nélkül. A törzs végig egyenes, nem dől el a nyomás felé.'),
  ('Váll oldalemelés kézisúlyzóval', 'Felsőtest – toló', 'Váll', 'Kézisúlyzó', null),
  ('Állig húzás francia rúddal', 'Felsőtest – húzó', 'Váll', 'Rúd', null),
  ('Egykezes snatch kézisúlyzóval', 'Kondi / intenzív', 'Teljes test', 'Kézisúlyzó', null),
  ('Thruster kézisúlyzóval', 'Kondi / intenzív', 'Teljes test', 'Kézisúlyzó', null),
  ('Side plank', 'Core', 'Has / core', 'Saját testsúly', null)
on conflict ((lower(name))) do nothing;

-- 2) A sablon
do $$
declare
  v_weeks constant int := 4;
  v_plan uuid;
  v_day uuid;
  w int;
begin
  if exists (select 1 from plans where slug = 'otthoni-vall-teljes-test') then
    raise notice 'A sablon már létezik, nincs teendő.';
    return;
  end if;

  insert into plans (slug, title, description, is_template)
  values ('otthoni-vall-teljes-test', 'OTTHONI – váll + teljes test',
          'Otthoni edzés kézisúlyzóval és rúddal. Váll gyakorlatok külön, 90 mp pihenővel, utána snatch + thruster szuperszett (90 mp pihenő a kör végén), a végén side plank pihenő nélkül.',
          true)
  returning id into v_plan;

  for w in 1..v_weeks loop
    insert into plan_days (plan_id, week, day, title)
    values (v_plan, w, 1, 'Otthoni – váll + teljes test')
    returning id into v_day;

    insert into day_exercises (plan_day_id, exercise_id, position, section, group_label, sets, reps, resistance, rest_seconds, note)
    select v_day, e.id, x.pos, x.section, x.grp, x.sets, x.reps, null, x.rest, x.note
    from (values
      (1, 'Fő rész', null, 'Vállból nyomás kézisúlyzóval ülve', 3, '8', 90, 'Dobozon ülve.'),
      (2, 'Fő rész', null, 'Egykezes Z-ülés vállból nyomás kézisúlyzóval', 2, '10-10', 90, null),
      (3, 'Fő rész', null, 'Váll oldalemelés kézisúlyzóval', 4, '12', 90, null),
      (4, 'Fő rész', null, 'Állig húzás francia rúddal', 3, '10', 90, null),
      (5, 'Szuperszett', 'A', 'Egykezes snatch kézisúlyzóval', 3, '8-8', 90, 'Szuperszettben a thrusterrel, a pihenő a kör végén.'),
      (6, 'Szuperszett', 'A', 'Thruster kézisúlyzóval', 3, '10', 90, null),
      (7, 'Befejezés', null, 'Side plank', 1, '2 × 30-30 mp', null,
         'Pihenő nélkül végig: bal 30 mp, jobb 30 mp, bal 30 mp, jobb 30 mp.')
    ) as x(pos, section, grp, name, sets, reps, rest, note)
    join exercises e on lower(e.name) = lower(x.name);
  end loop;
end;
$$;
