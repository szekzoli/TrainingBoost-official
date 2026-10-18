import { Printer } from 'lucide-react';
import type { PlanFull } from '../api';
import { groupTags, sectionsOf } from '../lib/blocks';
import { btnGhost } from '../lib/util';

// Csak olvasható, tömör áttekintő a teljes tervről; nyomtatható (a böngésző "Nyomtatás / Mentés PDF-ként" funkciójával).
export default function Overview({ data }: { data: PlanFull }) {
  const weeks = [...new Set(data.days.map((d) => d.week))].sort((a, b) => a - b);

  return (
    <div>
      <div className="flex items-center gap-4 print:hidden">
        <p className="mr-auto text-sm text-muted">Csak olvasható összefoglaló. Szerkeszteni a Szerkesztés fülön lehet.</p>
        <button type="button" className={`${btnGhost} inline-flex items-center gap-2`} onClick={() => window.print()}>
          <Printer className="size-4" /> Nyomtatás
        </button>
      </div>

      <div className="mt-2 hidden print:block">
        <h1 className="text-xl font-bold">{data.plan.title}</h1>
        {data.plan.description && <p className="text-sm">{data.plan.description}</p>}
      </div>

      {weeks.length === 0 && <p className="mt-6 text-sm text-muted">A tervnek még nincs egyetlen napja sem.</p>}

      {weeks.map((w) => (
        <section key={w} className="mt-6">
          <h2 className="mb-2 text-lg font-bold">{w}. hét</h2>
          <div className="space-y-4">
            {data.days
              .filter((d) => d.week === w)
              .map((d) => {
                const tags = groupTags(d.exercises);
                return (
                  <div key={d.id} className="break-inside-avoid overflow-hidden rounded-[14px] border border-line bg-white print:rounded-none">
                    <div className="border-b border-line bg-canvas px-4 py-2 text-sm font-bold print:bg-white">
                      {d.title || `${d.day}. nap`}
                    </div>
                    {d.exercises.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-muted">Nincs gyakorlat.</p>
                    ) : (
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-muted">
                            <th className="px-4 py-2 font-semibold">Gyakorlat</th>
                            <th className="w-28 px-2 py-2 font-semibold">Sorozat × ism.</th>
                            <th className="w-32 px-2 py-2 font-semibold">Ellenállás</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sectionsOf(d.exercises).map((sec, si) => (
                            <SectionRows key={si} title={sec.section ?? ''}>
                              {sec.rows.map((r) => (
                                <tr key={r.id} className="border-b border-line last:border-b-0">
                                  <td className="px-4 py-1.5">
                                    {tags.get(r.id) && <b className="mr-2 text-teal print:text-navy">{tags.get(r.id)}</b>}
                                    {r.exercise.name}
                                  </td>
                                  <td className="px-2 py-1.5 tabular-nums">
                                    {r.sets} × {r.reps}
                                  </td>
                                  <td className="px-2 py-1.5">{r.resistance ?? '–'}</td>
                                </tr>
                              ))}
                            </SectionRows>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                );
              })}
          </div>
        </section>
      ))}
    </div>
  );
}

function SectionRows({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      {title && (
        <tr className="border-b border-line bg-canvas print:bg-white">
          <td colSpan={3} className="px-4 py-1 text-xs font-bold uppercase tracking-wider text-teal print:text-navy">
            {title}
          </td>
        </tr>
      )}
      {children}
    </>
  );
}
