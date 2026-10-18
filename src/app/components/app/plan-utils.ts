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
