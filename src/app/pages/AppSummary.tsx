// Összesítő táblázat: a gyakorlatok sorokban (naponként), a hetek oszlopokban, színezett progresszióval.
// Letölthető Excelben, megosztható a telefon menüjével, és nyomtatható (PDF-be is).
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ChevronLeft, Download, Printer, Share2 } from 'lucide-react';
import { useSession } from '../components/app/session';
import { isDayDone } from '../components/app/plan-utils';
import { buildPlanSummary, type SummarySet } from '../../lib/plan-summary';
import { downloadBlob, fileSlug, shareOrDownload, summaryToXlsx } from '../../lib/summary-xlsx';
import { todayIso } from '../components/app/dates';

const trendClass = (t: string | null) =>
  t === 'up' ? 'bg-emerald-100 text-emerald-900' : t === 'down' ? 'bg-rose-100 text-rose-900' : '';

export default function AppSummary() {
  const { plan, logs } = useSession();
  const [busy, setBusy] = useState(false);

  const summary = useMemo(() => {
    if (!plan) return null;
    const where = new Map<string, { week: number; day: number; position: number }>();
    for (const d of plan.days) for (const e of d.exercises) where.set(e.id, { week: d.week, day: d.day, position: e.position });
    const sets: SummarySet[] = [];
    for (const log of logs) {
      for (const s of log.sets) {
        const w = where.get(s.day_exercise_id);
        if (w) sets.push({ ...w, set_number: s.set_number, weight_kg: s.weight_kg, reps: s.reps });
      }
    }
    return buildPlanSummary(plan.days, sets);
  }, [plan, logs]);

  if (!plan || !summary) return null;

  const next = [...plan.days].sort((a, b) => a.week - b.week || a.day - b.day).find((d) => !isDayDone(logs, d.id));
  const currentWeek = next?.week ?? null;
  const fileName = `osszesito-${fileSlug(plan.plan.title)}-${todayIso()}.xlsx`;

  const makeFile = async () => {
    setBusy(true);
    try {
      return await summaryToXlsx(summary, plan.plan.title, `Összesítő · ${todayIso().replace(/-/g, '. ')}.`);
    } catch {
      toast.error('Nem sikerült elkészíteni a fájlt.');
      return null;
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    const blob = await makeFile();
    if (!blob) return;
    const res = await shareOrDownload(blob, fileName, `${plan.plan.title} – összesítő`);
    if (res === 'downloaded') toast.success('Letöltve.');
  };

  const download = async () => {
    const blob = await makeFile();
    if (blob) downloadBlob(blob, fileName);
  };

  return (
    <div className="space-y-5">
      <style>{`@media print {
        @page { size: landscape; margin: 10mm; }
        header, .summary-actions, .summary-back { display: none !important; }
        .summary-scroll { overflow: visible !important; }
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }`}</style>

      <div>
        <Link to="/app/haladas" className="summary-back -ml-1 inline-flex min-h-11 items-center pr-3 text-sm text-app-navy/70">
          <ChevronLeft className="size-4" /> Haladás
        </Link>
        <h1 className="text-2xl font-bold leading-tight">Összesítő</h1>
        <p className="mt-1 text-sm text-app-navy/70">{plan.plan.title}</p>
        <p className="mt-1 text-xs text-app-muted">
          Hetek oszlopokban. <span className="rounded bg-emerald-100 px-1 text-emerald-900">Zöld</span>: több, mint az
          előző alkalommal, <span className="rounded bg-rose-100 px-1 text-rose-900">piros</span>: kevesebb. Halvány: az
          előírás, ahol még nincs napló.
        </p>
      </div>

      <div className="summary-actions flex flex-wrap gap-2">
        <button
          type="button"
          onClick={share}
          disabled={busy}
          className="inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-app-teal px-4 text-sm font-semibold text-white disabled:opacity-60"
        >
          <Share2 className="size-4" /> Megosztás
        </button>
        <button
          type="button"
          onClick={download}
          disabled={busy}
          className="inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-app-line bg-white px-4 text-sm font-semibold disabled:opacity-60"
        >
          <Download className="size-4" /> Excel
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-app-line bg-white px-4 text-sm font-semibold"
        >
          <Printer className="size-4" /> Nyomtatás / PDF
        </button>
      </div>

      <div className="summary-scroll -mx-4 overflow-x-auto px-4">
        <table className="w-max min-w-full border-separate border-spacing-0 text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 min-w-[8.5rem] max-w-[10rem] border-b border-app-line bg-white px-2 py-2 text-left font-semibold">
                Gyakorlat
              </th>
              {summary.weeks.map((w) => (
                <th
                  key={w}
                  className={`min-w-[5.25rem] border-b border-app-line px-2 py-2 text-center font-semibold ${
                    w === currentWeek ? 'text-app-teal' : ''
                  }`}
                >
                  {w}. hét{w === currentWeek ? ' ●' : ''}
                </th>
              ))}
              <th className="min-w-[4.5rem] border-b border-app-line px-2 py-2 text-center font-semibold">Változás</th>
            </tr>
          </thead>
          <tbody>
            {summary.days.map((g) => (
              <SummaryDayRows key={g.day} group={g} weeks={summary.weeks} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryDayRows({
  group,
  weeks,
}: {
  group: ReturnType<typeof buildPlanSummary>['days'][number];
  weeks: number[];
}) {
  return (
    <>
      <tr>
        <td
          colSpan={weeks.length + 2}
          className="sticky left-0 border-b border-app-line bg-app-mint px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-app-ink"
        >
          {group.title}
        </td>
      </tr>
      {group.rows.map((row) => (
        <tr key={row.key}>
          <th
            scope="row"
            className="sticky left-0 z-10 max-w-[10rem] border-b border-app-line bg-white px-2 py-2 text-left align-top font-medium leading-snug"
          >
            {row.exerciseName}
          </th>
          {weeks.map((w) => {
            const c = row.cells.get(w);
            if (!c) return <td key={w} className="border-b border-app-line bg-app-navy/[0.03]" />;
            return (
              <td
                key={w}
                className={`whitespace-pre-line border-b border-l border-app-line px-1.5 py-2 text-center align-top leading-snug tabular-nums ${
                  c.text ? trendClass(c.trend) : 'text-app-navy/35'
                }`}
              >
                {c.text || c.prescribed || '–'}
              </td>
            );
          })}
          <td
            className={`border-b border-l border-app-line px-2 py-2 text-center align-top font-semibold ${
              row.change.startsWith('+') ? 'text-emerald-700' : row.change.startsWith('−') ? 'text-rose-700' : 'text-app-muted'
            }`}
          >
            {row.change}
          </td>
        </tr>
      ))}
    </>
  );
}
