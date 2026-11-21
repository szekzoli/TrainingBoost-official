// Összesítő táblázat egy edzéstervhez: a gyakorlatok sorokban (naponként), a hetek oszlopokban.
// Minden cellában az adott heti teljesítés (vagy halványan az előírás, ha még nincs napló), és hogy az előző
// naplózott héthez képest nőtt-e. Az ügyfél-app és az admin is ezt használja, ezért csak egyszerű bemenetet vár.

export type SummaryDay = {
  week: number;
  day: number;
  title: string | null;
  exercises: {
    position: number;
    sets: number;
    reps: string;
    resistance: string | null;
    exercise: { id: string; name: string };
  }[];
};

/** Egy naplózott sorozat, a terv helyével azonosítva (hét, nap, a sor pozíciója a napon). */
export type SummarySet = {
  week: number;
  day: number;
  position: number;
  set_number: number;
  weight_kg: number | null;
  reps: number | null;
};

export type Trend = 'up' | 'same' | 'down' | null;

export type SummaryCell = {
  /** Az előírás röviden, pl. "3×8-10 · 40 kg". */
  prescribed: string;
  /** A naplózott sorozatok (sorozatszám szerint), üres, ha nincs napló. */
  sets: { weight: number | null; reps: number | null }[];
  /** A teljesítés röviden, pl. "40 kg · 10/10/8" vagy "40×10, 42,5×8". Üres, ha nincs napló. */
  text: string;
  /** Hasonlításhoz: a legnagyobb súly és az összes ismétlés. */
  topWeight: number | null;
  totalReps: number;
  trend: Trend;
};

export type SummaryRow = {
  key: string;
  exerciseName: string;
  /** hét → cella (ha az adott héten nincs ilyen sor a tervben: hiányzik) */
  cells: Map<number, SummaryCell>;
  /** Az első és az utolsó naplózott hét közti változás röviden, pl. "+7,5 kg" vagy "+4 ism.". */
  change: string;
};

export type SummaryDayGroup = { day: number; title: string; rows: SummaryRow[] };

export type PlanSummary = { weeks: number[]; days: SummaryDayGroup[] };

export const fmtNum = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',');

function prescription(ex: SummaryDay['exercises'][number]): string {
  const base = /[\p{L}\d]/u.test(ex.reps) ? `${ex.sets}×${ex.reps}` : '';
  return [base, ex.resistance?.trim() || ''].filter(Boolean).join(' · ');
}

/** Két sor: fent a súly (ha sorozatonként eltér: tartomány), alatta az ismétlések, pl. "40–42,5 kg\n10/10/8". */
function cellText(sets: SummaryCell['sets']): string {
  if (sets.length === 0) return '';
  const weights = sets.map((s) => s.weight).filter((w): w is number => w !== null);
  const reps = sets.every((s) => s.reps === null) ? '' : sets.map((s) => (s.reps ?? '–').toString()).join('/');
  let weight = '';
  if (weights.length) {
    const lo = Math.min(...weights);
    const hi = Math.max(...weights);
    weight = lo === hi ? `${fmtNum(lo)} kg` : `${fmtNum(lo)}–${fmtNum(hi)} kg`;
  }
  return [weight, reps].filter(Boolean).join('\n');
}

function compare(prev: SummaryCell, cur: SummaryCell): Trend {
  if (prev.topWeight !== null && cur.topWeight !== null && cur.topWeight !== prev.topWeight) {
    return cur.topWeight > prev.topWeight ? 'up' : 'down';
  }
  if (cur.totalReps !== prev.totalReps) return cur.totalReps > prev.totalReps ? 'up' : 'down';
  return 'same';
}

export function buildPlanSummary(days: SummaryDay[], logged: SummarySet[]): PlanSummary {
  const weeks = [...new Set(days.map((d) => d.week))].sort((a, b) => a - b);
  const dayNumbers = [...new Set(days.map((d) => d.day))].sort((a, b) => a - b);

  const setsAt = new Map<string, SummarySet[]>();
  for (const s of logged) {
    if (s.weight_kg === null && s.reps === null) continue;
    const k = `${s.week}|${s.day}|${s.position}`;
    const list = setsAt.get(k) ?? [];
    list.push(s);
    setsAt.set(k, list);
  }

  const groups: SummaryDayGroup[] = dayNumbers.map((dayNo) => {
    const versions = days.filter((d) => d.day === dayNo).sort((a, b) => a.week - b.week);
    const title = versions.find((v) => v.title)?.title ?? `${dayNo}. nap`;

    // Sorok: gyakorlatonként, az első előfordulás sorrendjében (pozíció, majd hét szerint).
    const rows = new Map<string, SummaryRow & { order: [number, number] }>();
    for (const v of versions) {
      const seenInDay = new Map<string, number>();
      for (const ex of [...v.exercises].sort((a, b) => a.position - b.position)) {
        // ugyanaz a gyakorlat egy napon többször is szerepelhet: n-edik előfordulás külön sor
        const nth = (seenInDay.get(ex.exercise.id) ?? 0) + 1;
        seenInDay.set(ex.exercise.id, nth);
        const key = `${dayNo}|${ex.exercise.id}|${nth}`;
        let row = rows.get(key);
        if (!row) {
          row = { key, exerciseName: ex.exercise.name, cells: new Map(), change: '', order: [ex.position, v.week] };
          rows.set(key, row);
        }
        const sets = (setsAt.get(`${v.week}|${dayNo}|${ex.position}`) ?? [])
          .sort((a, b) => a.set_number - b.set_number)
          .map((s) => ({ weight: s.weight_kg, reps: s.reps }));
        const weights = sets.map((s) => s.weight).filter((w): w is number => w !== null);
        row.cells.set(v.week, {
          prescribed: prescription(ex),
          sets,
          text: cellText(sets),
          topWeight: weights.length ? Math.max(...weights) : null,
          totalReps: sets.reduce((a, s) => a + (s.reps ?? 0), 0),
          trend: null,
        });
      }
    }

    const list = [...rows.values()].sort((a, b) => a.order[0] - b.order[0] || a.order[1] - b.order[1]);
    for (const row of list) {
      let prev: SummaryCell | null = null;
      let first: SummaryCell | null = null;
      for (const w of weeks) {
        const c = row.cells.get(w);
        if (!c || c.sets.length === 0) continue;
        if (prev) c.trend = compare(prev, c);
        if (!first) first = c;
        prev = c;
      }
      if (first && prev && first !== prev) {
        if (first.topWeight !== null && prev.topWeight !== null && prev.topWeight !== first.topWeight) {
          const d = prev.topWeight - first.topWeight;
          row.change = `${d > 0 ? '+' : '−'}${fmtNum(Math.abs(d))} kg`;
        } else if (prev.totalReps !== first.totalReps) {
          const d = prev.totalReps - first.totalReps;
          row.change = `${d > 0 ? '+' : '−'}${Math.abs(d)} ism.`;
        } else row.change = '=';
      }
    }
    return { day: dayNo, title, rows: list.map(({ order: _o, ...r }) => r) };
  });

  return { weeks, days: groups };
}
