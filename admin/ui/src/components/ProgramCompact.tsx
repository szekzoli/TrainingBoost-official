import type { PlanDay } from '../api';
import { describeChanges, programOverview, supersetTags } from '../../../../src/lib/program-overview';

// A program tömör nézete: minden nap egyszer (az első hét szerint), a gyakorlatokkal.
// Ha egy későbbi héten egy sorban más gyakorlat van, kimarad vagy új sor jelenik meg, kis jelzés mutatja.
export default function ProgramCompact({ days }: { days: PlanDay[] }) {
  const ov = programOverview(days, null);
  if (ov.days.length === 0) return <p className="text-sm text-muted">A tervnek még nincs egyetlen napja sem.</p>;

  return (
    <div className="grid gap-4 md:grid-cols-2 print:grid-cols-2">
      {ov.days.map((d) => {
        const tags = supersetTags(d.rows.map((r) => r.row));
        let lastSection: string | null | undefined;
        return (
          <div key={d.day} className="break-inside-avoid overflow-hidden rounded-[14px] border border-line bg-white print:rounded-none">
            <div className="flex items-baseline justify-between gap-3 border-b border-line bg-canvas px-4 py-2 print:bg-white">
              <span className="text-sm font-bold">{d.title || `${d.day}. nap`}</span>
              <span className="text-xs text-muted">
                {d.day}. nap{d.onlyWeeks ? ` · csak ${d.onlyWeeks} hét` : ''}
              </span>
            </div>
            {d.rows.length === 0 ? (
              <p className="px-4 py-3 text-sm text-muted">Nincs gyakorlat.</p>
            ) : (
              <ul className="py-1 text-sm">
                {d.rows.map(({ row, changes }) => {
                  const showSection = !!row.section && row.section !== lastSection;
                  lastSection = row.section;
                  const tag = tags.get(row.id);
                  return (
                    <li key={row.id}>
                      {showSection && (
                        <p className="px-4 pb-0.5 pt-2 text-xs font-bold uppercase tracking-wider text-teal print:text-navy">
                          {row.section}
                        </p>
                      )}
                      <div className="flex items-baseline gap-2 px-4 py-1">
                        {tag && <b className="shrink-0 text-teal print:text-navy">{tag}</b>}
                        <span className="min-w-0 flex-1">
                          {row.exercise.name}
                          {changes.length > 0 && (
                            <span className="block text-xs text-teal print:text-navy">{describeChanges(changes)}</span>
                          )}
                        </span>
                        <span className="shrink-0 text-xs tabular-nums text-muted">
                          {[/[\p{L}\d]/u.test(row.reps) ? `${row.sets} × ${row.reps}` : null, row.resistance?.trim() || null]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </div>
                    </li>
                  );
                })}
                {d.extras.map((x, i) => (
                  <li key={`x${i}`} className="px-4 py-1 text-xs text-teal print:text-navy">
                    + {describeChanges(x.changes)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
