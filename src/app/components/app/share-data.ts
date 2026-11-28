// A megosztható képek adatai a tervből és a naplóból.
import type { PlanData, WorkoutLog } from '../../../lib/app-api';
import { fromIso, isoDay, mondayOf, weekStreak, workoutDate } from './dates';
import { durationOf } from './workout-time';
import type { MilestoneCard, MonthCard, ProgramCard, WeekCard } from './share-card';
import type { Milestone } from './milestones';

const WEEKDAYS = ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'];

/** A tervhez tartozó, lezárt edzések a dátumukkal. */
function completedEntries(plan: PlanData, logs: WorkoutLog[]) {
  const days = new Map(plan.days.map((d) => [d.id, d]));
  return logs
    .filter((l) => l.completed_at && days.has(l.plan_day_id))
    .map((l) => ({ log: l, day: days.get(l.plan_day_id)!, date: workoutDate(l) }))
    .filter((e): e is typeof e & { date: string } => !!e.date);
}

/** Az összes lezárt edzés napja (a sorozathoz). */
export function doneDates(plan: PlanData, logs: WorkoutLog[]): string[] {
  return [...new Set(completedEntries(plan, logs).map((e) => e.date))].sort();
}

/** Van-e lezárt edzés a megadott napot tartalmazó héten. */
export function weekHasWorkouts(plan: PlanData, logs: WorkoutLog[], anyDay: string): boolean {
  const mon = mondayOf(anyDay);
  return completedEntries(plan, logs).some((e) => mondayOf(e.date) === mon);
}

/** „Ez a hetem”: a megadott napot tartalmazó hét (hétfő–vasárnap). */
export function buildWeekCard(plan: PlanData, logs: WorkoutLog[], anyDay: string): WeekCard {
  const mon = fromIso(mondayOf(anyDay));
  const isoDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(d.getDate() + i);
    return isoDay(d);
  });
  const entries = completedEntries(plan, logs).filter((e) => isoDays.includes(e.date));
  const days = isoDays.map((iso, i) => {
    const mine = entries.filter((e) => e.date === iso);
    const mins = mine.map((e) => durationOf(e.log)?.minutes ?? null);
    const valid = mins.filter((m): m is number => m !== null);
    return { label: WEEKDAYS[i], done: mine.length > 0, minutes: valid.length ? valid.reduce((a, b) => a + b, 0) : null };
  });
  const first = fromIso(isoDays[0]);
  const last = fromIso(isoDays[6]);
  const month = (d: Date) => d.toLocaleDateString('hu-HU', { month: 'short' });
  const range =
    first.getMonth() === last.getMonth()
      ? `${month(first)} ${first.getDate()}–${last.getDate()}.`
      : `${month(first)} ${first.getDate()}. – ${month(last)} ${last.getDate()}.`;
  const totalWeeks = Math.max(0, ...plan.days.map((d) => d.week));
  const programWeekNow = entries.length ? Math.max(...entries.map((e) => e.day.week)) : 0;
  return {
    kind: 'week',
    range,
    days,
    workouts: entries.length,
    minutes: days.reduce((a, d) => a + (d.minutes ?? 0), 0),
    programWeek: programWeekNow > 0 && totalWeeks > 1 ? { now: programWeekNow, total: totalWeeks } : null,
    streakWeeks: weekStreak(doneDates(plan, logs)),
  };
}

/** Havi naptár: a megadott hónap (ÉÉÉÉ-HH). */
export function buildMonthCard(plan: PlanData, logs: WorkoutLog[], month: string): MonthCard {
  const [y, m] = month.split('-').map(Number);
  const first = new Date(y, m - 1, 1, 12);
  const name = first.toLocaleDateString('hu-HU', { month: 'long' });
  const done = doneDates(plan, logs)
    .filter((d) => d.startsWith(month))
    .map((d) => Number(d.slice(8, 10)));
  return {
    kind: 'month',
    month: name.charAt(0).toUpperCase() + name.slice(1),
    year: y,
    lead: (first.getDay() + 6) % 7,
    daysInMonth: new Date(y, m, 0).getDate(),
    doneDays: [...new Set(done)],
    streakWeeks: weekStreak(doneDates(plan, logs)),
  };
}

/** „Program teljesítve”. */
export function buildProgramCard(plan: PlanData, logs: WorkoutLog[]): ProgramCard {
  const entries = completedEntries(plan, logs);
  return {
    kind: 'program',
    weeks: new Set(plan.days.map((d) => d.week)).size,
    workouts: entries.length,
    minutes: entries.reduce((a, e) => a + (durationOf(e.log)?.minutes ?? 0), 0),
  };
}

/** Elért mérföldkő képe. Az „első teljes hét” saját szöveget kap. */
export function buildMilestoneCard(m: Milestone): MilestoneCard {
  if (m.id === 'het-1') return { kind: 'milestone', title: 'Az első hetem megvan', detail: 'Egy teljes hét, minden edzés kész.', icon: 'check' };
  return { kind: 'milestone', title: m.title, detail: m.detail, icon: 'medal' };
}
