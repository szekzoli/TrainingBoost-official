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

/** A kg mező placeholderje: az ellenállás elején álló szám, tizedesponttal ("22,5 kg" → "22.5"). */
export function weightPlaceholder(resistance: string | null): string {
  const m = resistance?.trim().match(/^\d+(?:[.,]\d+)?/);
  return m ? m[0].replace(',', '.') : '';
}

/** Az ismétlés mező placeholderje: az előírás első egész száma. */
export function repsPlaceholder(reps: string): string {
  return reps.match(/\d+/)?.[0] ?? '';
}

/** Rögzített sorozat rövid szövege: "10 kg × 10". */
export function formatSet(s: SetLog): string {
  const w = s.weight_kg !== null ? `${String(s.weight_kg).replace('.', ',')} kg` : null;
  if (w && s.reps !== null) return `${w} × ${s.reps}`;
  if (w) return w;
  return `× ${s.reps}`;
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
