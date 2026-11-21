import { useEffect, useMemo, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { api, errorMessage, type ClientWorkout, type PlanFull } from '../api';
import { buildPlanSummary, type SummarySet } from '../../../../src/lib/plan-summary';
import { downloadBlob, fileSlug, summaryToXlsx } from '../../../../src/lib/summary-xlsx';
import { btnGhost } from '../lib/util';

// Az ügyfél aktuális tervének összesítője: hetek oszlopokban, gyakorlatok sorokban, színezett progresszió.
export default function SummaryTable({
  planId,
  clientLabel,
  workouts,
}: {
  planId: string;
  clientLabel: string;
  workouts: ClientWorkout[];
}) {
  const [plan, setPlan] = useState<PlanFull | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .getPlan(planId)
      .then((p) => alive && setPlan(p))
      .catch((err) => alive && setError(errorMessage(err)));
    return () => {
      alive = false;
    };
  }, [planId]);

  const summary = useMemo(() => {
    if (!plan) return null;
    const sets: SummarySet[] = [];
    for (const w of workouts) {
      if (w.plan_id !== planId) continue;
      for (const s of w.sets) {
        sets.push({ week: w.week, day: w.day, position: s.position, set_number: s.set_number, weight_kg: s.weight_kg, reps: s.reps });
      }
    }
    return buildPlanSummary(plan.days, sets);
  }, [plan, workouts, planId]);

  if (error) return <p className="mt-4 text-sm text-danger">{error}</p>;
  if (!plan || !summary) return <p className="mt-4 text-sm text-muted">Betöltés…</p>;

  const today = new Date().toISOString().slice(0, 10);
  const download = async () => {
    setBusy(true);
    try {
      const blob = await summaryToXlsx(summary, `${clientLabel} – ${plan.plan.title}`, `Összesítő · ${today.replace(/-/g, '. ')}.`);
      downloadBlob(blob, `osszesito-${fileSlug(clientLabel)}-${today}.xlsx`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 space-y-3">
      <style>{`@media print { @page { size: landscape; margin: 10mm; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }`}</style>
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <p className="mr-auto text-sm text-muted">
          <span className="rounded bg-emerald-100 px-1 text-emerald-900">Zöld</span>: több, mint az előző naplózott
          héten, <span className="rounded bg-rose-100 px-1 text-rose-900">piros</span>: kevesebb. Halvány: előírás, még
          nincs napló.
        </p>
        <button type="button" className={`${btnGhost} inline-flex items-center gap-2`} disabled={busy} onClick={download}>
          <Download className="size-4" /> Excel
        </button>
        <button type="button" className={`${btnGhost} inline-flex items-center gap-2`} onClick={() => window.print()}>
          <Printer className="size-4" /> Nyomtatás
        </button>
      </div>
      <div className="overflow-x-auto rounded-[14px] border border-line bg-white">
        <table className="w-max min-w-full border-separate border-spacing-0 text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 min-w-[12rem] border-b border-line bg-white px-3 py-2 text-left font-semibold">
                Gyakorlat
              </th>
              {summary.weeks.map((w) => (
                <th key={w} className="min-w-[6rem] border-b border-line px-2 py-2 text-center font-semibold">
                  {w}. hét
                </th>
              ))}
              <th className="min-w-[5rem] border-b border-line px-2 py-2 text-center font-semibold">Változás</th>
            </tr>
          </thead>
          <tbody>
            {summary.days.map((g) => (
              <FragmentRows key={g.day} group={g} weeks={summary.weeks} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FragmentRows({
  group,
  weeks,
}: {
  group: ReturnType<typeof buildPlanSummary>['days'][number];
  weeks: number[];
}) {
  return (
    <>
      <tr>
        <td colSpan={weeks.length + 2} className="border-b border-line bg-canvas px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-teal">
          {group.title}
        </td>
      </tr>
      {group.rows.map((row) => (
        <tr key={row.key}>
          <th scope="row" className="sticky left-0 z-10 border-b border-line bg-white px-3 py-2 text-left align-top font-medium">
            {row.exerciseName}
          </th>
          {weeks.map((w) => {
            const c = row.cells.get(w);
            if (!c) return <td key={w} className="border-b border-l border-line bg-canvas" />;
            const cls = !c.text
              ? 'text-muted/60'
              : c.trend === 'up'
                ? 'bg-emerald-100 text-emerald-900'
                : c.trend === 'down'
                  ? 'bg-rose-100 text-rose-900'
                  : '';
            return (
              <td key={w} className={`whitespace-pre-line border-b border-l border-line px-2 py-2 text-center align-top tabular-nums ${cls}`}>
                {c.text || c.prescribed || '–'}
              </td>
            );
          })}
          <td
            className={`border-b border-l border-line px-2 py-2 text-center align-top font-semibold ${
              row.change.startsWith('+') ? 'text-emerald-700' : row.change.startsWith('−') ? 'text-rose-700' : 'text-muted'
            }`}
          >
            {row.change}
          </td>
        </tr>
      ))}
    </>
  );
}
