// Edzésidő: a kezdés (started_at) és a lezárás (completed_at) különbsége.
// Csak akkor számít, ha valódi edzés közbeni rögzítés volt: ugyanazon a napon kezdte, mint amire az edzés
// dátuma szól, és az időtartam életszerű (10 perc – 5 óra). Különben „utólag rögzítve”: csak a dátum számít.
import type { WorkoutLog } from '../../../lib/app-api';
import { isoDay } from './dates';

export const MIN_MINUTES = 10;
export const MAX_MINUTES = 300;
/** Ennyi óra után a lezáráskor rákérdezünk, mikor fejezte be (valószínűleg elfelejtette lezárni). */
export const ASK_AFTER_HOURS = 3;

export type Duration = { start: Date; end: Date; minutes: number };

export function durationOf(log: WorkoutLog | undefined): Duration | null {
  if (!log?.started_at || !log.completed_at) return null;
  const start = new Date(log.started_at);
  const end = new Date(log.completed_at);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  if (log.performed_on && log.performed_on.slice(0, 10) !== isoDay(start)) return null;
  const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
  if (minutes < MIN_MINUTES || minutes > MAX_MINUTES) return null;
  return { start, end, minutes };
}

/** Lezárt edzés, amelynek nincs érvényes időtartama (utólag rögzítve). */
export const isRetro = (log: WorkoutLog | undefined) => !!log?.completed_at && durationOf(log) === null;

/** "18:42" */
export const fmtClock = (d: Date) => d.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });

/** 56 → "56 perc", 75 → "1 ó 15 p" */
export function fmtMinutes(m: number): string {
  if (m < 60) return `${m} perc`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} ó ${r} p` : `${h} óra`;
}

/** Futó óra: 754 mp → "12:34", 3725 → "1:02:05". */
export function fmtElapsed(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** A naplóban az utolsó rögzített sorozat ideje (a lezárási idő javaslatához). */
export function lastSetAt(log: WorkoutLog | undefined): Date | null {
  const times = (log?.sets ?? []).filter((s) => s.weight_kg !== null || s.reps !== null).map((s) => s.logged_at);
  if (times.length === 0) return null;
  return new Date(times.sort().at(-1)!);
}

/** Folyamatban lévő edzés: elkezdte vagy rögzített már sorozatot, ma, és még nem zárta le. */
export function isInProgress(log: WorkoutLog, today: string): boolean {
  if (log.completed_at) return false;
  if (log.performed_on && log.performed_on.slice(0, 10) !== today) return false;
  if (log.started_at && isoDay(new Date(log.started_at)) === today) return true;
  const last = lastSetAt(log);
  return !!last && isoDay(last) === today;
}
