// Program-áttekintés: a terv napjai egyszer, hét kiválasztása nélkül.
// Egy kiinduló hét (ügyfélnél az aktuális, sablonnál az első) tartalmát mutatjuk, és jelezzük,
// ha a későbbi heteken egy sorban más gyakorlat szerepel, kimarad vagy új sor jelenik meg.
// Az ügyfél-app és az admin is ezt használja, ezért csak a közös mezőkre támaszkodik.

export type OverviewRow = {
  id: string;
  position: number;
  exercise: { id: string; name: string };
};

export type OverviewDay<R extends OverviewRow> = {
  id: string;
  week: number;
  day: number;
  title: string | null;
  exercises: R[];
};

/** A sor a megadott héttől ezt a gyakorlatot tartalmazza (null: a sor ettől a héttől kimarad). */
export type SlotChange = { week: number; name: string | null };

export type ProgramDay<R extends OverviewRow> = {
  day: number;
  title: string | null;
  /** A hét, amelynek a tartalmát mutatjuk ennél a napnál. */
  week: number;
  /** Az adott hét napja (pl. a gyakorlat részleteihez). */
  dayId: string;
  rows: { row: R; changes: SlotChange[] }[];
  /** A kiinduló héten nem szereplő, később megjelenő sorok. */
  extras: { changes: SlotChange[] }[];
  /** Ha a nap nem minden héten szerepel (a kiinduló héttől számítva): pl. "3–6., 9. hét". */
  onlyWeeks: string | null;
};

export type ProgramOverview<R extends OverviewRow> = {
  days: ProgramDay<R>[];
  /** A terv hetei a kiinduló héttől. */
  weeks: number[];
  refWeek: number | null;
};

const byPosition = <R extends OverviewRow>(a: R, b: R) => a.position - b.position;

/** Hetek listája tömör szövegként: [1,2,3,5,7,8] → "1–3., 5., 7–8." */
export function formatWeeks(weeks: number[]): string {
  const sorted = [...new Set(weeks)].sort((a, b) => a - b);
  const parts: string[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const start = sorted[i];
    while (i + 1 < sorted.length && sorted[i + 1] === sorted[i] + 1) i++;
    parts.push(start === sorted[i] ? `${start}.` : `${start}–${sorted[i]}.`);
  }
  return parts.join(', ');
}

/**
 * A program napjai a kiinduló héttől. A hetek közti összevetés a nap sorainak sorrendje szerint történik
 * (1. sor az 1. sorral stb.), és csak a gyakorlat változását jelezzük; a súly/ismétlés heti változása
 * (progresszió) természetes, azt nem.
 */
export function programOverview<R extends OverviewRow>(
  allDays: OverviewDay<R>[],
  refWeek: number | null | undefined,
): ProgramOverview<R> {
  const planWeeks = [...new Set(allDays.map((d) => d.week))].sort((a, b) => a - b);
  if (planWeeks.length === 0) return { days: [], weeks: [], refWeek: null };

  // A kiinduló hét: a kért hét, ha nincs ilyen, a következő létező, végül az utolsó.
  const ref = planWeeks.find((w) => w >= (refWeek ?? planWeeks[0])) ?? planWeeks[planWeeks.length - 1];
  const weeks = planWeeks.filter((w) => w >= ref);

  const dayNumbers = [...new Set(allDays.filter((d) => d.week >= ref).map((d) => d.day))].sort((a, b) => a - b);

  const days: ProgramDay<R>[] = dayNumbers.map((dayNo) => {
    const versions = allDays
      .filter((d) => d.day === dayNo && d.week >= ref)
      .sort((a, b) => a.week - b.week);
    const base = versions[0];
    const baseRows = [...base.exercises].sort(byPosition);
    const later = versions.slice(1).map((v) => ({ week: v.week, rows: [...v.exercises].sort(byPosition) }));

    const slotChanges = (slot: number, start: string | null): SlotChange[] => {
      const changes: SlotChange[] = [];
      let current = start;
      for (const v of later) {
        const name = v.rows[slot]?.exercise.name ?? null;
        const id = v.rows[slot]?.exercise.id ?? null;
        const key = id ?? null;
        if (key !== current) {
          changes.push({ week: v.week, name });
          current = key;
        }
      }
      return changes;
    };

    const rows = baseRows.map((row, i) => ({ row, changes: slotChanges(i, row.exercise.id) }));
    const maxLater = Math.max(0, ...later.map((v) => v.rows.length));
    const extras: { changes: SlotChange[] }[] = [];
    for (let i = baseRows.length; i < maxLater; i++) extras.push({ changes: slotChanges(i, null) });

    const dayWeeks = versions.map((v) => v.week);
    const onlyWeeks = dayWeeks.length === weeks.length ? null : formatWeeks(dayWeeks);

    return { day: dayNo, title: base.title, week: base.week, dayId: base.id, rows, extras, onlyWeeks };
  });

  return { days, weeks, refWeek: ref };
}

/** Egy sor változásainak rövid szövege: "8. héttől: Smith ferde nyomás · 11. héttől kimarad". */
export function describeChanges(changes: SlotChange[]): string {
  return changes.map((c) => (c.name ? `${c.week}. héttől: ${c.name}` : `${c.week}. héttől kimarad`)).join(' · ');
}

/** Szuperszett-jelölés: egymást követő, azonos nem üres group_label-ű sorok (legalább kettő) → "A1", "A2"… */
export function supersetTags(rows: { id: string; group_label: string | null }[]): Map<string, string> {
  const tags = new Map<string, string>();
  let i = 0;
  while (i < rows.length) {
    let j = i + 1;
    const label = rows[i].group_label;
    if (label) while (j < rows.length && rows[j].group_label === label) j++;
    if (label && j - i > 1) for (let k = i; k < j; k++) tags.set(rows[k].id, `${label}${k - i + 1}`);
    i = j;
  }
  return tags;
}
