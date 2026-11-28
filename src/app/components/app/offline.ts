// Offline működés: a terv és a napló helyi másolata, és a net nélkül rögzített műveletek várólistája.
// Minden a böngésző localStorage-ában van, a személyes kódhoz kötve (másik kóddal belépve nem keveredik).
import type { PlanData, WorkoutLog } from '../../../lib/app-api';

const CACHE_KEY = 'tb_app_cache_v1';
const OUTBOX_KEY = 'tb_app_outbox_v1';
const WEIGHTS_KEY = 'tb_app_weights_v1';

// attempt: a nap hányadik alkalmára vonatkozik (a művelet létrehozásakor). A szerver mindig a nap
// legutóbbi alkalmát írja, és a várólista sorrendben megy fel, így ez csak a kulcsokhoz kell: két
// különböző alkalom azonos művelete ne írja felül egymást a várólistán. (Régi várólistában hiányozhat = 1.)
export type Op =
  | {
      t: 'set';
      dayExerciseId: string;
      setNumber: number;
      weight: number | null;
      reps: number | null;
      note?: string | null;
      hr?: number | null;
      at: string;
      attempt?: number;
    }
  | { t: 'start'; planDayId: string; at: string | null; attempt?: number }
  | { t: 'complete'; planDayId: string; note: string | null; at: string; attempt?: number }
  | { t: 'date'; planDayId: string; date: string | null; attempt?: number }
  | { t: 'rate'; planDayId: string; rating: number | null; attempt?: number }
  /** „Újra elvégzem”: új alkalom (attempt = az új alkalom sorszáma). */
  | { t: 'repeat'; planDayId: string; attempt: number; at: string };

/** Ugyanarra a dologra vonatkozó újabb művelet felülírja a régit (pl. egy sorozat kétszer átírva). */
export function opKey(op: Op): string {
  const a = op.attempt ?? 1;
  return op.t === 'set' ? `set|${op.dayExerciseId}|${op.setNumber}|${a}` : `${op.t}|${op.planDayId}|${a}`;
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* tele vagy tiltott tároló: offline mód nélkül működünk tovább */
  }
}

export function loadCache(code: string): { plan: PlanData; logs: WorkoutLog[] } | null {
  const c = read<{ code: string; plan: PlanData; logs: WorkoutLog[] }>(CACHE_KEY);
  return c && c.code === code && c.plan ? { plan: c.plan, logs: c.logs ?? [] } : null;
}

export function saveCache(code: string, plan: PlanData, logs: WorkoutLog[]) {
  write(CACHE_KEY, { code, plan, logs, at: new Date().toISOString() });
}

export function loadOutbox(code: string): Op[] {
  const o = read<{ code: string; ops: Op[] }>(OUTBOX_KEY);
  return o && o.code === code && Array.isArray(o.ops) ? o.ops : [];
}

export function saveOutbox(code: string, ops: Op[]) {
  if (ops.length === 0) {
    try {
      localStorage.removeItem(OUTBOX_KEY);
    } catch {
      /* nincs teendő */
    }
    return;
  }
  write(OUTBOX_KEY, { code, ops });
}

export function clearOffline() {
  try {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(OUTBOX_KEY);
    localStorage.removeItem(WEIGHTS_KEY);
  } catch {
    /* nincs teendő */
  }
}

/** Új művelet a sor végére; az azonos kulcsú régebbit kivesszük. */
export function enqueue(ops: Op[], op: Op): Op[] {
  const k = opKey(op);
  return [...ops.filter((o) => opKey(o) !== k), op];
}

/** Testsúly-mérések helyi másolata (net nélkül is látszik a grafikon). */
export function loadWeights(code: string): { measured_on: string; weight_kg: number }[] {
  const c = read<{ code: string; items: { measured_on: string; weight_kg: number }[] }>(WEIGHTS_KEY);
  return c && c.code === code ? c.items : [];
}

export function saveWeights(code: string, items: { measured_on: string; weight_kg: number }[]) {
  write(WEIGHTS_KEY, { code, items });
}
