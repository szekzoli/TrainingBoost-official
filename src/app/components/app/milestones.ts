// Mérföldkövek: a naplóból számolva (nem kell hozzá külön adat a szerveren).
// Az elért mérföldköveket a Haladás oldal mutatja; az újonnan elérteket egy rövid üzenet jelzi.
import type { BodyWeight, PlanData, WorkoutLog } from '../../../lib/app-api';
import { isBodyweight, isSetDone, timedSpec } from './plan-utils';

export type Milestone = {
  id: string;
  title: string;
  detail: string;
  /** Elérve-e már. */
  done: boolean;
  /** Ha még nincs elérve: hol tart (pl. 7 / 10). */
  progress?: { now: number; goal: number };
};

const fmt = (n: number) => n.toLocaleString('hu-HU');

/** Lépcsők: csak az elért legmagasabb fokot és a következőt mutatjuk, hogy a lista rövid maradjon. */
function ladder(
  key: string,
  value: number,
  steps: number[],
  title: (n: number) => string,
  detail: (n: number) => string,
): Milestone[] {
  const reached = steps.filter((s) => value >= s).slice(-1);
  const next = steps.find((s) => value < s);
  const out: Milestone[] = reached.map((s) => ({ id: `${key}-${s}`, title: title(s), detail: detail(s), done: true }));
  if (next !== undefined) {
    out.push({
      id: `${key}-${next}`,
      title: title(next),
      detail: detail(next),
      done: false,
      progress: { now: value, goal: next },
    });
  }
  return out;
}

export function computeMilestones(plan: PlanData, logs: WorkoutLog[], weights: BodyWeight[] = []): Milestone[] {
  const completed = logs.filter((l) => l.completed_at);
  const completedIds = new Set(completed.map((l) => l.plan_day_id));
  const planDayIds = new Set(plan.days.map((d) => d.id));
  const doneInPlan = plan.days.filter((d) => completedIds.has(d.id)).length;

  // Sorok típusa a tonnához: időre menő sorozatnál az „ismétlés” másodperc (nem számít bele),
  // saját testsúlyosnál a súly = testsúly + plusz súly (ha van mérés; különben kimarad).
  const rowKind = new Map<string, { timed: boolean; bodyweight: boolean }>();
  for (const d of plan.days)
    for (const e of d.exercises) rowKind.set(e.id, { timed: !!timedSpec(e.reps), bodyweight: isBodyweight(e) });
  const sortedWeights = [...weights].sort((a, b) => a.measured_on.localeCompare(b.measured_on));
  /** A sorozat napján (vagy előtte) mért legutóbbi testsúly; ha előtte nincs, az első mérés. */
  const bodyWeightAt = (iso: string): number | null => {
    if (sortedWeights.length === 0) return null;
    let w = sortedWeights[0].weight_kg;
    for (const m of sortedWeights) if (m.measured_on <= iso) w = m.weight_kg;
    return Number(w);
  };

  let sets = 0;
  let volume = 0;
  for (const l of logs) {
    for (const s of l.sets) {
      if (!isSetDone(s)) continue;
      sets++;
      const kind = rowKind.get(s.day_exercise_id);
      if (!s.reps || kind?.timed) continue;
      if (kind?.bodyweight) {
        const bw = bodyWeightAt(s.logged_at.slice(0, 10));
        if (bw !== null) volume += Math.max(0, bw + (s.weight_kg ?? 0)) * s.reps;
      } else if (s.weight_kg && s.weight_kg > 0) volume += s.weight_kg * s.reps;
    }
  }

  // Hetek: egy hét kész, ha minden napja kész
  const weeks = new Map<number, string[]>();
  for (const d of plan.days) weeks.set(d.week, [...(weeks.get(d.week) ?? []), d.id]);
  const fullWeeks = [...weeks.values()].filter((ids) => ids.every((id) => completedIds.has(id))).length;
  // A legjobban álló hét: ennyi napja kész / ennyi napos
  let bestWeek = { now: 0, goal: 0 };
  for (const ids of weeks.values()) {
    const now = ids.filter((id) => completedIds.has(id)).length;
    if (bestWeek.goal === 0 || now / ids.length > bestWeek.now / bestWeek.goal) bestWeek = { now, goal: ids.length };
  }

  // Új egyéni csúcs: egy gyakorlat legnagyobb súlya nagyobb, mint az első alkalommal
  const rowToEx = new Map<string, string>();
  for (const d of plan.days) for (const e of d.exercises) rowToEx.set(e.id, e.exercise.id);
  const byEx = new Map<string, { first: number; best: number }>();
  const ordered = [...logs].sort((a, b) => (a.completed_at ?? a.created_at).localeCompare(b.completed_at ?? b.created_at));
  for (const l of ordered) {
    if (!planDayIds.has(l.plan_day_id)) continue;
    const top = new Map<string, number>();
    for (const s of l.sets) {
      const ex = rowToEx.get(s.day_exercise_id);
      if (!ex || !s.weight_kg || /nem szabályos/i.test(s.note ?? '')) continue;
      top.set(ex, Math.max(top.get(ex) ?? 0, s.weight_kg));
    }
    for (const [ex, w] of top) {
      const cur = byEx.get(ex);
      if (!cur) byEx.set(ex, { first: w, best: w });
      else cur.best = Math.max(cur.best, w);
    }
  }
  const prs = [...byEx.values()].filter((x) => x.best > x.first).length;

  const total = plan.days.length;
  const out: Milestone[] = [];

  out.push(
    ...ladder(
      'edzes',
      completed.length,
      [1, 5, 10, 25, 50, 100],
      (n) => (n === 1 ? 'Az első edzés' : `${n} edzés`),
      (n) => (n === 1 ? 'Megvan az első lépés, a legnehezebb.' : `${n} befejezett edzés.`),
    ),
  );

  if (weeks.size > 0) {
    out.push(
      fullWeeks >= 1
        ? { id: 'het-1', title: 'Első teljes hét', detail: 'Egy hét minden edzése kész.', done: true }
        : {
            id: 'het-1',
            title: 'Első teljes hét',
            detail: 'Egy hét minden edzése kész.',
            done: false,
            progress: bestWeek,
          },
    );
  }

  if (total >= 4) {
    const half = Math.ceil(total / 2);
    out.push(
      doneInPlan >= half
        ? { id: `felut-${plan.plan.id}`, title: 'Félúton', detail: 'A program fele kész.', done: true }
        : { id: `felut-${plan.plan.id}`, title: 'Félúton', detail: 'A program fele kész.', done: false, progress: { now: doneInPlan, goal: half } },
    );
    out.push(
      doneInPlan >= total
        ? { id: `program-${plan.plan.id}`, title: 'A teljes program', detail: 'Minden edzés kész. Gratulálok!', done: true }
        : {
            id: `program-${plan.plan.id}`,
            title: 'A teljes program',
            detail: 'Minden edzés kész.',
            done: false,
            progress: { now: doneInPlan, goal: total },
          },
    );
  }

  out.push(
    ...ladder(
      'sorozat',
      sets,
      [100, 250, 500, 1000, 2500],
      (n) => `${fmt(n)} sorozat`,
      (n) => `${fmt(n)} rögzített sorozat.`,
    ),
  );

  out.push(
    ...ladder(
      'tonna',
      Math.floor(volume / 1000),
      [1, 5, 10, 25, 50, 100],
      (n) => `${fmt(n)} tonna`,
      (n) => `Összesen ${fmt(n)} tonnát mozgattál meg (súly × ismétlés).`,
    ),
  );

  if (byEx.size > 0) {
    out.push(
      ...ladder(
        'csucs',
        prs,
        [1, 5, 10],
        (n) => (n === 1 ? 'Első egyéni csúcs' : `${n} gyakorlatban erősebb`),
        (n) =>
          n === 1
            ? 'Egy gyakorlatban nagyobb súlyt mozgattál, mint az első alkalommal.'
            : `${n} gyakorlatban nagyobb súlyt mozgattál, mint az első alkalommal.`,
      ),
    );
  }

  if (weights.length > 0) {
    out.push(
      ...ladder(
        'meres',
        weights.length,
        [4, 12],
        (n) => `${n} testsúlymérés`,
        (n) => (n === 4 ? 'Egy hónapnyi heti mérés.' : 'Negyedévnyi heti mérés.'),
      ),
    );
  }

  return out;
}

const SEEN_KEY = 'tb_app_milestones_v1';

/** Az eddig már jelzett mérföldkövek (kódonként), hogy ugyanazt ne mutassuk kétszer. */
export function loadSeen(code: string): Set<string> | null {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as { code: string; ids: string[] };
    return v.code === code ? new Set(v.ids) : null;
  } catch {
    return null;
  }
}

export function saveSeen(code: string, ids: Set<string>) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify({ code, ids: [...ids] }));
  } catch {
    /* nincs tároló: legfeljebb újra megjelenik */
  }
}
