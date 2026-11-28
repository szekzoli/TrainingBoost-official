// Edzés utáni összefoglaló: idő, sorozatok, új rekordok, összevetés a múltkorival, heti sorozat.
// Mindent a meglévő naplóból számol, szerver nélkül.
import type { PlanData, PlanDay, SetLog, WorkoutLog } from '../../../lib/app-api';
import { formatSet, isBodyweight, isFlagged, isLoggable, isSetDone, setProgress, timedSpec } from './plan-utils';
import { doneDates } from './share-data';
import { fmtDayLong, mondayOf, weekStreak, workoutDate } from './dates';
import type { WorkoutCard } from './share-card';
import { durationOf } from './workout-time';

/** Mi számít „jobbnak”: súlyos gyakorlatnál a súly, időre menőnél az idő, egyébként az ismétlés. */
type Metric = 'weight' | 'time' | 'reps';

export type ExerciseResult = {
  name: string;
  /** A mostani legjobb sorozat szövege, pl. „22,5 kg × 10”. */
  now: string;
  /** A legutóbbi alkalom legjobb sorozata; null, ha most csinálta először. */
  before: string | null;
  record: boolean;
  better: boolean;
};

export type WorkoutSummary = {
  minutes: number | null;
  setsDone: number;
  setsTotal: number;
  /** Új egyéni rekordok (volt már korábbi eredmény, és most jobb lett). */
  records: ExerciseResult[];
  /** Jobb, mint a legutóbbi alkalom (a rekordok nélkül). */
  improved: ExerciseResult[];
  /** Hány gyakorlatnál volt mihez hasonlítani. */
  compared: number;
  /** Egyik gyakorlatnál sincs korábbi eredmény (első edzés). */
  firstTime: boolean;
  workoutsThisWeek: number;
  streakWeeks: number;
};

const clean = (s: SetLog): SetLog => ({ ...s, note: null, heart_rate: null });

/** Rendezési kulcs: [fő érték, másodlagos]. Súlynál azonos súlyon a több ismétlés a jobb. */
function score(s: SetLog, metric: Metric): [number, number] {
  if (metric === 'weight') return [s.weight_kg ?? -Infinity, s.reps ?? 0];
  return [s.reps ?? -Infinity, metric === 'time' ? 0 : (s.weight_kg ?? 0)];
}

function cmp(a: [number, number], b: [number, number]): number {
  return a[0] !== b[0] ? a[0] - b[0] : a[1] - b[1];
}

function top(sets: SetLog[], metric: Metric): SetLog | null {
  let best: SetLog | null = null;
  for (const s of sets) if (!best || cmp(score(s, metric), score(best, metric)) > 0) best = s;
  return best;
}

export function buildWorkoutSummary(
  plan: PlanData,
  logs: WorkoutLog[],
  planDay: PlanDay,
  log: WorkoutLog,
): WorkoutSummary {
  const exerciseOf = new Map<string, string>();
  for (const d of plan.days) for (const e of d.exercises) exerciseOf.set(e.id, e.exercise.id);
  const others = logs.filter((l) => l !== log);

  const records: ExerciseResult[] = [];
  const improved: ExerciseResult[] = [];
  let compared = 0;
  let anyHistory = false;
  const seen = new Set<string>();

  for (const item of [...planDay.exercises].sort((a, b) => a.position - b.position)) {
    const exId = item.exercise.id;
    if (!isLoggable(item) || seen.has(exId)) continue;
    seen.add(exId);
    // Ugyanaz a gyakorlat a napon többször is szerepelhet: együtt nézzük
    const sameItems = new Set(planDay.exercises.filter((e) => e.exercise.id === exId).map((e) => e.id));
    const nowSets = log.sets.filter((s) => sameItems.has(s.day_exercise_id) && isSetDone(s) && !isFlagged(s));
    if (nowSets.length === 0) continue;

    const timed = timedSpec(item.reps) !== null;
    const bodyweight = isBodyweight(item);
    const metric: Metric = timed
      ? 'time'
      : nowSets.some((s) => s.weight_kg !== null && (!bodyweight || s.weight_kg > 0))
        ? 'weight'
        : 'reps';
    const usable = (s: SetLog) =>
      metric === 'weight' ? s.weight_kg !== null : s.reps !== null;

    const nowTop = top(nowSets.filter(usable), metric);
    if (!nowTop) continue;

    // Korábbi eredmények: minden más alkalom, ugyanerre a gyakorlatra
    const history = others.map((l) => ({
      log: l,
      sets: l.sets.filter(
        (s) => exerciseOf.get(s.day_exercise_id) === exId && isSetDone(s) && !isFlagged(s) && usable(s),
      ),
    })).filter((h) => h.sets.length > 0);
    if (history.length > 0) anyHistory = true;

    const allBefore = top(history.flatMap((h) => h.sets), metric);
    // A legutóbbi alkalom: amelyiknél a legkésőbbi a rögzítés
    const last = history.reduce<(typeof history)[number] | null>((acc, h) => {
      const t = h.sets.reduce((m, s) => (s.logged_at > m ? s.logged_at : m), '');
      const ta = acc ? acc.sets.reduce((m, s) => (s.logged_at > m ? s.logged_at : m), '') : '';
      return !acc || t > ta ? h : acc;
    }, null);
    const lastTop = last ? top(last.sets, metric) : null;

    const opts = { timed, bodyweight };
    const res: ExerciseResult = {
      name: item.exercise.name,
      now: formatSet(clean(nowTop), opts),
      before: lastTop ? formatSet(clean(lastTop), opts) : null,
      // Rekord: a fő érték nagyobb, mint eddig bármikor
      record: !!allBefore && score(nowTop, metric)[0] > score(allBefore, metric)[0],
      better: !!lastTop && cmp(score(nowTop, metric), score(lastTop, metric)) > 0,
    };
    if (lastTop) compared++;
    if (res.record) records.push(res);
    else if (res.better) improved.push(res);
  }

  const progress = setProgress(planDay.exercises, log);
  const date = workoutDate(log);
  const dates = doneDates(plan, logs);
  const mon = date ? mondayOf(date) : null;
  const workoutsThisWeek = mon
    ? logs.filter((l) => l.completed_at && (() => {
        const d = workoutDate(l);
        return !!d && mondayOf(d) === mon;
      })()).length
    : 0;

  return {
    minutes: durationOf(log)?.minutes ?? null,
    setsDone: progress.done,
    setsTotal: progress.total,
    records,
    improved,
    compared,
    firstTime: !anyHistory,
    workoutsThisWeek,
    streakWeeks: weekStreak(dates),
  };
}

/** Megosztható kép az összefoglalóból (személyes adat és a terv címe nélkül). */
export function buildWorkoutCard(s: WorkoutSummary, date: string): WorkoutCard {
  return {
    kind: 'workout',
    date: fmtDayLong(date),
    minutes: s.minutes,
    sets: s.setsDone,
    records: s.records.map((r) => ({ name: r.name, value: r.now })),
    improved: s.improved.length,
    workoutsThisWeek: s.workoutsThisWeek,
    streakWeeks: s.streakWeeks,
  };
}
