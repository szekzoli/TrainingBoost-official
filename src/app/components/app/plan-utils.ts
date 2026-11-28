import type { PlanDay, PlanExercise, PlanData, SetLog, WorkoutLog } from '../../../lib/app-api';

export const isDayDone = (logs: WorkoutLog[], dayId: string) =>
  logs.some((l) => l.plan_day_id === dayId && l.completed_at);

export function weeksOf(plan: PlanData): { week: number; days: PlanDay[] }[] {
  const map = new Map<number, PlanDay[]>();
  for (const d of plan.days) map.set(d.week, [...(map.get(d.week) ?? []), d]);
  return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([week, days]) => ({ week, days }));
}

export type ExerciseBlock = { label: string | null; items: PlanExercise[] };
export type Section = { name: string | null; blocks: ExerciseBlock[] };

/** Szakaszok (megjelenési sorrendben), azon belül az egymást követő, azonos group_label-ű gyakorlatok egy blokkban. */
export function groupExercises(exercises: PlanExercise[]): Section[] {
  const sorted = [...exercises].sort((a, b) => a.position - b.position);
  const sections: Section[] = [];
  for (const ex of sorted) {
    let sec = sections[sections.length - 1];
    if (!sec || sec.name !== ex.section) {
      sec = { name: ex.section, blocks: [] };
      sections.push(sec);
    }
    const last = sec.blocks[sec.blocks.length - 1];
    if (ex.group_label && last && last.label === ex.group_label) last.items.push(ex);
    else sec.blocks.push({ label: ex.group_label, items: [ex] });
  }
  return sections;
}

/** Szuperszett: legalább két, egymást követő, azonos nem üres group_label-ű gyakorlat. */
export const isSuperset = (block: ExerciseBlock) => !!block.label && block.items.length >= 2;

/** Pl. a nyújtás ("–") nem naplózható szetekből áll. */
export const isLoggable = (item: PlanExercise) => /[\p{L}\d]/u.test(item.reps);

/** Egy sor akkor kész, ha van mentett súlya vagy ismétlése (a pipa levétele üres értéket ment). */
export const isSetDone = (s: SetLog | undefined): s is SetLog =>
  !!s && (s.weight_kg !== null || s.reps !== null);

export function setsOf(log: WorkoutLog | undefined, dayExerciseId: string): SetLog[] {
  return log?.sets.filter((s) => s.day_exercise_id === dayExerciseId && isSetDone(s)) ?? [];
}

/** Kész / összes sorozat a megadott gyakorlatokra (csak a naplózható gyakorlatok számítanak). */
export function setProgress(items: PlanExercise[], log: WorkoutLog | undefined) {
  let done = 0;
  let total = 0;
  for (const it of items) {
    if (!isLoggable(it)) continue;
    total += it.sets;
    done += setsOf(log, it.id).filter((s) => s.set_number <= it.sets).length;
  }
  return { done, total };
}

/**
 * A kg mező placeholderje az ellenállásból, tizedesponttal: csak ha kilóban van megadva, vagy puszta szám.
 * "22,5 kg" → "22.5", "+15 kg" → "15", "10-10 kg" → "10" (kezenként), "35-40 kg" → "35", "60" → "60";
 * "7-es ellenállás", "sárga gumikötél", "francia rúd + 15 kg" → "" (nem súly, vagy nem a súllyal kezdődik).
 */
export function weightPlaceholder(resistance: string | null): string {
  const r = resistance?.trim() ?? '';
  const m =
    r.match(/^\+?\s*(\d+(?:[.,]\d+)?)(?:\s*[-–]\s*\d+(?:[.,]\d+)?)?\s*kg\b/i) ?? r.match(/^\+?\s*(\d+(?:[.,]\d+)?)$/);
  return m ? m[1].replace(',', '.') : '';
}

/** Az ismétlés mező placeholderje: az előírás első egész száma. */
export function repsPlaceholder(reps: string): string {
  return reps.match(/\d+/)?.[0] ?? '';
}

// ---------------------------------------------------------------------------
// Gyakorlat-típusok: saját testsúlyos, súly nélküli, időre menő
// ---------------------------------------------------------------------------

/** Saját testsúlyos gyakorlat: a KG mező a plusz súly (+10) vagy a segítség (−20); üresen = csak testsúly. */
export const isBodyweight = (item: PlanExercise) => item.exercise.equipment?.trim() === 'Saját testsúly';

/** Eszközök, amelyeknél nincs súly (nem kérdezünk rá, ha üres a KG). */
const NO_WEIGHT_EQUIPMENT = new Set(['Saját testsúly', 'Gumikötél / miniband', 'TRX', 'Fitball / BOSU', 'Egyéb', 'Kardió gép']);

/**
 * Kell-e súly ennél a gyakorlatnál (ha üres, rákérdezünk). Ha a gyakorlattár nem mondja meg az eszközt
 * (pl. a 009-es SQL előtt), az előírt ellenállás dönt: ha van benne szám, súlyos gyakorlat.
 */
export function expectsWeight(item: PlanExercise): boolean {
  const eq = item.exercise.equipment?.trim();
  if (eq) return !NO_WEIGHT_EQUIPMENT.has(eq);
  return weightPlaceholder(item.resistance) !== '';
}

/** Időre menő gyakorlat előírása. phases: a visszaszámlálás szakaszai; üres = stopper (max idő). */
export type TimedSpec = { phases: { label: string; seconds: number }[]; sided: boolean };

const TIME_UNIT = /(\d+(?:[.,]\d+)?)?\s*(mp|másodperc|sec|s|perc|min)\b/i;

/**
 * Az ismétlés-előírásból: időre megy-e, és milyen szakaszokkal.
 *   „30 mp” → [30]; „30-30 mp” → bal 30, jobb 30; „2 × 30-30 mp” → bal, jobb, bal, jobb;
 *   „1 perc” → [60]; „30-45 mp” → [45] (tartomány: a felső érték); „max mp”, „max idő” → stopper.
 * A „30 m” (méter) nem idő. null, ha nem időre megy.
 */
export function timedSpec(reps: string): TimedSpec | null {
  const r = reps.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!r) return null;
  const unit = r.match(TIME_UNIT);
  if (!unit && !/max(imum)? ?idő/.test(r)) return null;
  if (/\d+\s*m\b(?!p)/.test(r) && !unit) return null;
  const mult = unit && /perc|min/.test(unit[2]) ? 60 : 1;
  // Körök: „2 ×”, „2x”
  const roundsM = r.match(/^(\d+)\s*[×x*]\s*/);
  const rounds = roundsM ? Math.min(10, Number(roundsM[1])) : 1;
  const body = roundsM ? r.slice(roundsM[0].length) : r;
  const pair = body.match(/^(\d+(?:[.,]\d+)?)\s*[-–]\s*(\d+(?:[.,]\d+)?)/);
  const single = body.match(/^(\d+(?:[.,]\d+)?)/);
  const num = (x: string) => Math.round(Number(x.replace(',', '.')) * mult);
  const perSideWord = /oldalank[eé]nt|oldalt[oó]l/.test(r);
  if (pair) {
    const a = num(pair[1]);
    const b = num(pair[2]);
    if (a === b && a > 0) {
      const phases = [];
      for (let i = 0; i < rounds; i++) phases.push({ label: 'Bal oldal', seconds: a }, { label: 'Jobb oldal', seconds: a });
      return { phases, sided: true };
    }
    const top = Math.max(a, b);
    return top > 0 ? { phases: Array.from({ length: rounds }, (_, i) => ({ label: rounds > 1 ? `${i + 1}. kör` : 'Munka', seconds: top })), sided: false } : null;
  }
  if (single) {
    const a = num(single[1]);
    if (!(a > 0)) return null;
    if (perSideWord) {
      const phases = [];
      for (let i = 0; i < rounds; i++) phases.push({ label: 'Bal oldal', seconds: a }, { label: 'Jobb oldal', seconds: a });
      return { phases, sided: true };
    }
    return { phases: Array.from({ length: rounds }, (_, i) => ({ label: rounds > 1 ? `${i + 1}. kör` : 'Munka', seconds: a })), sided: false };
  }
  // Szám nélkül („max mp”, „max idő”): stopper
  return { phases: [], sided: false };
}

/** Időtartam rövid szövege: 45 → „45 mp”, 90 → „1:30”. */
export function fmtSeconds(sec: number): string {
  if (sec < 60) return `${sec} mp`;
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

/** A sorozathoz írt megjegyzés szerint nem szabályos (nem számít rekordnak). */
export const isFlagged = (s: SetLog) => /nem szabályos/i.test(s.note ?? '');

/** Rögzített sorozat rövid szövege: "10 kg × 10", saját testsúlynál "TS × 8" / "+10 kg × 8", időnél "45 mp". */
export function formatSet(s: SetLog, opts: { timed?: boolean; bodyweight?: boolean } = {}): string {
  const kg = (n: number) => `${String(n).replace('.', ',').replace('-', '−')} kg`;
  let w: string | null = null;
  if (s.weight_kg !== null && s.weight_kg !== undefined) {
    w = opts.bodyweight && s.weight_kg > 0 ? `+${kg(s.weight_kg)}` : kg(Number(s.weight_kg));
  } else if (opts.bodyweight && !opts.timed) w = 'TS';
  const r = s.reps === null ? null : opts.timed ? fmtSeconds(s.reps) : String(s.reps);
  let out: string;
  if (w && r !== null) out = opts.timed ? `${w} · ${r}` : `${w} × ${r}`;
  else if (w) out = w;
  else out = opts.timed ? (r ?? '') : `× ${r}`;
  if (s.heart_rate) out += ` · ♥${s.heart_rate}`;
  if (s.note?.trim()) out += ' ⚑';
  return out;
}

/** Az adott gyakorlat legutóbbi, MÁS napon rögzített szetjei (szetszám szerint). */
export function previousSets(
  plan: PlanData,
  logs: WorkoutLog[],
  currentDayId: string,
  exerciseId: string,
): Map<number, SetLog> {
  const exerciseOf = new Map<string, string>();
  for (const d of plan.days) for (const e of d.exercises) exerciseOf.set(e.id, e.exercise.id);

  const result = new Map<number, SetLog>();
  for (const log of logs) {
    if (log.plan_day_id === currentDayId) continue;
    for (const s of log.sets) {
      if (exerciseOf.get(s.day_exercise_id) !== exerciseId) continue;
      if (s.weight_kg === null && s.reps === null) continue;
      const cur = result.get(s.set_number);
      if (!cur || s.logged_at > cur.logged_at) result.set(s.set_number, s);
    }
  }
  return result;
}

/** Az ismétlés-előírás felső értéke ("8-12" → 12, "10" → 10, "10-10" → 10). Csak tiszta számos
 *  előírásnál (idő, távolság, "bukásig" esetén null). */
export function topReps(reps: string): number | null {
  const m = reps.trim().match(/^(\d+)(?:\s*[-–]\s*(\d+))?$/);
  if (!m) return null;
  const a = Number(m[1]);
  const b = m[2] ? Number(m[2]) : null;
  return b !== null && b > a ? b : a;
}

/** Az adott gyakorlat eddigi legnagyobb súlya, a megadott (sor, sorozat) kihagyásával. */
export function bestWeight(
  plan: PlanData,
  logs: WorkoutLog[],
  exerciseId: string,
  except?: { dayExerciseId: string; setNumber: number },
): number | null {
  const exerciseOf = new Map<string, string>();
  for (const d of plan.days) for (const e of d.exercises) exerciseOf.set(e.id, e.exercise.id);
  let best: number | null = null;
  for (const log of logs) {
    for (const s of log.sets) {
      if (s.weight_kg === null || exerciseOf.get(s.day_exercise_id) !== exerciseId) continue;
      if (isFlagged(s)) continue; // a „nem szabályos” sorozat nem rekord
      if (except && s.day_exercise_id === except.dayExerciseId && s.set_number === except.setNumber) continue;
      if (best === null || s.weight_kg > best) best = s.weight_kg;
    }
  }
  return best;
}
