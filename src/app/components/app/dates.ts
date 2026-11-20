import type { WorkoutLog } from '../../../lib/app-api';

const pad = (n: number) => String(n).padStart(2, '0');

/** Helyi dátum ÉÉÉÉ-HH-NN formában. */
export function isoDay(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const todayIso = () => isoDay(new Date());

/** ÉÉÉÉ-HH-NN -> Date (helyi dél, hogy az időzóna ne csússzon át másik napra). */
export const fromIso = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00`);

/** "nov. 18., kedd" */
export function fmtDayLong(iso: string): string {
  return fromIso(iso).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric', weekday: 'long' });
}

/** "2026. nov. 18." */
export function fmtDayShort(iso: string): string {
  return fromIso(iso).toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Melyik napon volt az edzés: a beállított dátum, különben a befejezés napja, különben az utolsó
 * rögzített sorozat napja. null, ha még semmi nem történt.
 */
export function workoutDate(log: WorkoutLog | undefined): string | null {
  if (!log) return null;
  if (log.performed_on) return log.performed_on.slice(0, 10);
  if (log.completed_at) return isoDay(new Date(log.completed_at));
  const times = log.sets.filter((s) => s.weight_kg !== null || s.reps !== null).map((s) => s.logged_at);
  if (times.length === 0) return null;
  return isoDay(new Date(times.sort().at(-1)!));
}
