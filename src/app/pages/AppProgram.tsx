import { Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useSession } from '../components/app/session';
import { isDayDone, isLoggable } from '../components/app/plan-utils';
import { describeChanges, programOverview, supersetTags } from '../../lib/program-overview';

// A program áttekintése: a napok és gyakorlataik egyszer, hét kiválasztása és beírás nélkül.
// Az aktuális hét tartalmát mutatja; ha később egy gyakorlat változik, azt kis jelzés mutatja.
export default function AppProgram() {
  const { plan, logs } = useSession();
  const [search, setSearch] = useSearchParams();
  if (!plan) return null;

  const next = [...plan.days]
    .sort((a, b) => a.week - b.week || a.day - b.day)
    .find((d) => !isDayDone(logs, d.id));
  const lastWeek = Math.max(...plan.days.map((d) => d.week));
  const ov = programOverview(plan.days, next?.week ?? lastWeek);
  const totalWeeks = new Set(plan.days.map((d) => d.week)).size;
  // Egyszerre egy nap látszik (telefonon a négy nap egymás alatt túl hosszú). A választott nap az URL-ben
  // marad (?nap=2), így a gyakorlat részleteiből visszalépve ugyanaz a nap nyílik meg.
  // Alapból a következő edzés napja.
  const wanted = Number(search.get('nap')) || next?.day;
  const selected = ov.days.find((d) => d.day === wanted) ?? ov.days[0];
  const backTo = selected ? `/app/program?nap=${selected.day}` : '/app/program';

  return (
    <div className="space-y-5">
      <div>
        <Link to="/app" className="-ml-1 inline-flex min-h-11 items-center pr-3 text-sm text-app-navy/70">
          <ChevronLeft className="size-4" /> Főoldal
        </Link>
        <h1 className="text-2xl font-bold leading-tight">A program</h1>
        <p className="mt-1 text-sm text-app-navy/70">
          {plan.plan.title} · heti {ov.days.length} edzés · {totalWeeks} hét
        </p>
        {ov.refWeek !== null && totalWeeks > 1 && (
          <p className="mt-1 text-xs text-app-muted">
            A(z) {ov.refWeek}. hét szerint{next ? ' (aktuális)' : ''}. Ha később egy gyakorlat változik, alatta jelezzük.
          </p>
        )}
      </div>

      {ov.days.length === 0 && <p className="text-sm text-app-navy/70">A tervben még nincs edzésnap.</p>}

      {ov.days.length > 1 && (
        <div className="-mx-4 overflow-x-auto px-4" role="tablist" aria-label="Edzésnapok">
          <div className="flex gap-2">
            {ov.days.map((d) => {
              const on = d.day === selected?.day;
              return (
                <button
                  key={d.day}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setSearch({ nap: String(d.day) }, { replace: true })}
                  className={`min-h-11 shrink-0 rounded-[10px] border px-4 text-sm font-semibold ${
                    on ? 'border-app-navy bg-app-navy text-white' : 'border-app-line bg-white text-app-navy'
                  }`}
                >
                  {d.title ?? `${d.day}. nap`}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {ov.days.filter((d) => d === selected).map((d) => {
        const tags = supersetTags(d.rows.map((r) => r.row));
        let lastSection: string | null | undefined;
        return (
          <section key={d.day} className="rounded-[14px] border border-app-line bg-white p-4">
            <p className="text-xs text-app-muted">
              {d.day}. nap{d.onlyWeeks ? ` · csak a(z) ${d.onlyWeeks} héten` : ''}
            </p>
            <h2 className="text-lg font-bold leading-tight">{d.title ?? `${d.day}. edzés`}</h2>

            <ul className="mt-3 space-y-1 border-t border-app-line pt-3">
              {d.rows.map(({ row, changes }) => {
                const showSection = row.section !== lastSection && !!row.section;
                lastSection = row.section;
                const tag = tags.get(row.id);
                const presc = [isLoggable(row) ? `${row.sets} × ${row.reps}` : null, row.resistance?.trim() || null]
                  .filter(Boolean)
                  .join(' · ');
                return (
                  <li key={row.id}>
                    {showSection && (
                      <p className="mb-1 mt-2 text-[10px] font-semibold uppercase tracking-wider text-app-teal first:mt-0">
                        {row.section}
                      </p>
                    )}
                    <Link
                      to={`/app/e/${d.week}/${d.day}/${row.id}`}
                      state={{ from: backTo }}
                      className={`-mx-2 flex min-h-10 items-center gap-2 rounded-lg px-2 py-1 text-sm active:bg-app-navy/5 ${
                        tag ? 'border-l-2 border-app-ink' : ''
                      }`}
                    >
                      {tag && <span className="shrink-0 text-xs font-bold text-app-ink">{tag}</span>}
                      <span className="min-w-0 flex-1 leading-snug">
                        {row.exercise.name}
                        {changes.length > 0 && (
                          <span className="mt-0.5 block text-xs text-app-teal">{describeChanges(changes)}</span>
                        )}
                      </span>
                      <span className="shrink-0 text-right text-xs text-app-muted">{presc}</span>
                      <ChevronRight className="size-4 shrink-0 text-app-navy/40" />
                    </Link>
                  </li>
                );
              })}
              {d.extras.map((x, i) => (
                <li key={`x${i}`} className="py-1 text-xs text-app-teal">
                  + {describeChanges(x.changes)}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
