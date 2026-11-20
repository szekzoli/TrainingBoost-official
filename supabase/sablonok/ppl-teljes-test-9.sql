-- Sablon: Push / Pull / Láb / Teljes test, heti 4 nap, 13 hét (a 9.0-s edzésterv alapján)
-- Futtatás: Supabase SQL Editor -> New query -> beillesztés -> Run. Előfeltétel: 005-kovetes.sql lefutott.
-- Újrafuttatható: ha a sablon (slug: ppl-teljes-test-9) már létezik, nem csinál semmit.
-- Utána az adminban: Ügyfelek -> Új ügyfél -> Sablonból -> ez a sablon. Az ügyfél saját másolatot kap,
-- amit tovább szerkeszthetsz. A hetek egyformák: a súlyokat az ügyfél naplózza, te hetente módosíthatod
-- ("ettől a héttől a végéig" hatókörrel).

-- 1) Gyakorlatok a gyakorlattárba (ami már megvan ugyanazzal a névvel, azt nem bántja)
insert into exercises (name, category) values
  ('Fekvenyomás ferde padon Smith keretben', 'felsőtest – toló'),
  ('Military press rúddal állva', 'felsőtest – toló'),
  ('Váll oldalemelés kézisúlyzóval', 'felsőtest – toló'),
  ('Deficit pushup', 'felsőtest – toló'),
  ('Tricepsz tolás fej felett kötéllel csigás gépen', 'felsőtest – toló'),
  ('Haskerék', 'core'),
  ('Húzódzkodás', 'felsőtest – húzó'),
  ('Egykezes evezés kézisúlyzóval padon', 'felsőtest – húzó'),
  ('Állig húzás francia rúddal', 'felsőtest – húzó'),
  ('Bicepsz Scott-gépen', 'felsőtest – húzó'),
  ('Kalapács bicepsz kötéllel csigás gépen', 'felsőtest – húzó'),
  ('Face pull kötéllel csigás gépen', 'felsőtest – húzó'),
  ('Cable chop (rotáció kábeles gépen)', 'core'),
  ('Lábtoló gép', 'alsótest – térd domináns'),
  ('Bolgár guggolás kézisúlyzóval', 'alsótest – térd domináns'),
  ('Egylábas RDL kézisúlyzóval / kettlebell', 'alsótest – csípő domináns'),
  ('Hip thrust gépen', 'alsótest – csípő domináns'),
  ('Combhajlító gép', 'alsótest – csípő domináns'),
  ('Thruster kézisúlyzóval', 'teljes test'),
  ('Dobozra lépés kézisúlyzóval', 'alsótest – térd domináns'),
  ('Tolódzkodás súllyal', 'felsőtest – toló'),
  ('Suitcase carry (egykezes cipelés)', 'core'),
  ('Inverz evezés rúdon', 'felsőtest – húzó'),
  ('Fitball plank kigördülés', 'core')
on conflict ((lower(name))) do nothing;

-- 2) A sablon, 13 hét × 4 nap, minden héten ugyanazokkal a gyakorlatokkal
do $$
declare
  v_plan uuid;
  v_day uuid;
  w int;
begin
  if exists (select 1 from plans where slug = 'ppl-teljes-test-9') then
    raise notice 'A sablon már létezik, nincs teendő.';
    return;
  end if;

  insert into plans (slug, title, description, is_template)
  values ('ppl-teljes-test-9', 'Push / Pull / Láb / Teljes test (9.0)',
          'Heti 4 edzés: push, pull, láb, teljes test. A piros „bukásig” gyakorlatoknál 2 széria, mindkettő bukásig. Pihenő: felsőtest 1 perc, láb és teljes test 1,5 perc.',
          true)
  returning id into v_plan;

  for w in 1..13 loop
    insert into plan_days (plan_id, week, day, title) values (v_plan, w, 1, 'Push – felsőtest') returning id into v_day;
    insert into day_exercises (plan_day_id, exercise_id, position, section, sets, reps, resistance, rest_seconds, note)
    select v_day, e.id, x.pos, 'Fő rész', x.sets, x.reps, x.res, 60, x.note
    from (values
      (1, 'Fekvenyomás ferde padon Smith keretben', 3, '8', '65 kg', null),
      (2, 'Military press rúddal állva', 3, '8', '40 kg', 'Kezdősúly becsült, az első héten pontosítsd.'),
      (3, 'Váll oldalemelés kézisúlyzóval', 3, '12', '10-10 kg', null),
      (4, 'Deficit pushup', 2, 'bukásig', 'testsúly', 'Bukásig: mindkét széria a lehető legtöbb ismétléssel, jó technikával.'),
      (5, 'Tricepsz tolás fej felett kötéllel csigás gépen', 2, 'bukásig', '40 kg', 'Bukásig: előtte 1–2 könnyebb felvezető sorozat. 1. széria a fő súllyal bukásig, 2. széria 35 kg súllyal bukásig.'),
      (6, 'Haskerék', 3, '8', 'testsúly', null)
    ) as x(pos, name, sets, reps, res, note)
    join exercises e on lower(e.name) = lower(x.name);
    insert into plan_days (plan_id, week, day, title) values (v_plan, w, 2, 'Pull – felsőtest') returning id into v_day;
    insert into day_exercises (plan_day_id, exercise_id, position, section, sets, reps, resistance, rest_seconds, note)
    select v_day, e.id, x.pos, 'Fő rész', x.sets, x.reps, x.res, 60, x.note
    from (values
      (1, 'Húzódzkodás', 4, '8', 'testsúly', '2 széria széles, 2 széria neutrális fogással, szériánként váltva.'),
      (2, 'Egykezes evezés kézisúlyzóval padon', 3, '10-10', '30 kg', null),
      (3, 'Állig húzás francia rúddal', 3, '10', 'francia rúd + 15 kg', 'Széles fogás, könyök legfeljebb vállmagasságig.'),
      (4, 'Bicepsz Scott-gépen', 2, 'bukásig', '45 kg', 'Bukásig: előtte 1–2 könnyebb felvezető sorozat. 1. széria a fő súllyal bukásig, 2. széria 36 kg súllyal bukásig.'),
      (5, 'Kalapács bicepsz kötéllel csigás gépen', 3, '12', '20 kg', 'Kezdősúly becsült, az első héten pontosítsd.'),
      (6, 'Face pull kötéllel csigás gépen', 3, '15', '20 kg', 'Kezdősúly becsült, az első héten pontosítsd.'),
      (7, 'Cable chop (rotáció kábeles gépen)', 2, '10-10', '15 kg', 'Kezdősúly becsült, az első héten pontosítsd.')
    ) as x(pos, name, sets, reps, res, note)
    join exercises e on lower(e.name) = lower(x.name);
    insert into plan_days (plan_id, week, day, title) values (v_plan, w, 3, 'Láb') returning id into v_day;
    insert into day_exercises (plan_day_id, exercise_id, position, section, sets, reps, resistance, rest_seconds, note)
    select v_day, e.id, x.pos, 'Fő rész', x.sets, x.reps, x.res, 90, x.note
    from (values
      (1, 'Lábtoló gép', 3, '10', '150 kg', null),
      (2, 'Bolgár guggolás kézisúlyzóval', 3, '8-8', '14-14 kg', null),
      (3, 'Egylábas RDL kézisúlyzóval / kettlebell', 3, '8-8', '12 kg', null),
      (4, 'Hip thrust gépen', 3, '10', '50 kg', null),
      (5, 'Combhajlító gép', 2, 'bukásig', '55 kg', 'Bukásig: előtte 1–2 könnyebb felvezető sorozat. 1. széria a fő súllyal bukásig, 2. széria 45 kg súllyal bukásig.')
    ) as x(pos, name, sets, reps, res, note)
    join exercises e on lower(e.name) = lower(x.name);
    insert into plan_days (plan_id, week, day, title) values (v_plan, w, 4, 'Teljes test') returning id into v_day;
    insert into day_exercises (plan_day_id, exercise_id, position, section, sets, reps, resistance, rest_seconds, note)
    select v_day, e.id, x.pos, 'Fő rész', x.sets, x.reps, x.res, 90, x.note
    from (values
      (1, 'Thruster kézisúlyzóval', 3, '10', '12-12 kg', null),
      (2, 'Dobozra lépés kézisúlyzóval', 3, '8-8', '12-12 kg', 'Kb. térdmagasságú doboz.'),
      (3, 'Tolódzkodás súllyal', 3, '8', '+12 kg', null),
      (4, 'Suitcase carry (egykezes cipelés)', 3, '30 m oldalanként', '24 kg', null),
      (5, 'Inverz evezés rúdon', 3, '10', 'testsúly', 'A láb magasításával nehezíthető.'),
      (6, 'Fitball plank kigördülés', 2, '40 mp', 'testsúly', null)
    ) as x(pos, name, sets, reps, res, note)
    join exercises e on lower(e.name) = lower(x.name);
  end loop;
end;
$$;
