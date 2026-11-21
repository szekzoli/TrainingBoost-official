import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Printer } from 'lucide-react';
import { api, errorMessage, type PlanFull } from '../api';
import ProgramCompact from '../components/ProgramCompact';
import { btn, btnGhost } from '../lib/util';

// Az összes sablon egy oldalon, egymás alatt, heti edzésszám szerint sorba rendezve (heti 2, 3, 4… nap).
// Csak olvasható; nyomtatható.
export default function TemplatesOverview() {
  const [items, setItems] = useState<PlanFull[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const list = await api.listPlans(true);
      const full = await Promise.all(list.map((p) => api.getPlan(p.id)));
      const daysPerWeek = (p: PlanFull) => new Set(p.days.map((d) => d.day)).size;
      full.sort((a, b) => daysPerWeek(a) - daysPerWeek(b) || a.plan.title.localeCompare(b.plan.title, 'hu'));
      setItems(full);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 print:hidden">
        <Link to="/sablonok" className="text-sm font-semibold text-teal hover:underline">
          ← Sablonok
        </Link>
        <h1 className="mr-auto text-2xl font-bold">Sablonok áttekintése</h1>
        <button type="button" className={`${btnGhost} inline-flex items-center gap-2`} onClick={() => window.print()}>
          <Printer className="size-4" /> Nyomtatás
        </button>
      </div>
      <p className="mt-2 text-sm text-muted print:hidden">
        Minden sablon napjai egyszer, az első hét szerint. Ha egy gyakorlat később változik, alatta jelezzük.
      </p>

      {error ? (
        <div className="mt-6 text-sm">
          <p role="alert" className="text-danger">
            {error}
          </p>
          <button type="button" className={`${btn} mt-3`} onClick={() => void load()}>
            Újrapróbálom
          </button>
        </div>
      ) : items === null ? (
        <p className="mt-6 text-sm text-muted">Betöltés…</p>
      ) : items.length === 0 ? (
        <p className="mt-6 text-sm text-muted">Még nincs sablon.</p>
      ) : (
        <>
          <nav className="mt-4 flex flex-wrap gap-2 print:hidden" aria-label="Sablonok">
            {items.map((p) => (
              <a key={p.plan.id} href={`#sablon-${p.plan.id}`} className={`${btn} inline-flex items-center`}>
                {p.plan.title}
              </a>
            ))}
          </nav>
          {items.map((p, i) => {
            const days = new Set(p.days.map((d) => d.day)).size;
            const weeks = new Set(p.days.map((d) => d.week)).size;
            return (
              <section key={p.plan.id} id={`sablon-${p.plan.id}`} className={`mt-8 scroll-mt-4 ${i > 0 ? 'print:break-before-page' : 'print:mt-0'}`}>
                <div className="mb-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <h2 className="text-xl font-bold">{p.plan.title}</h2>
                  <span className="text-sm text-muted">
                    heti {days} nap · {weeks} hét
                  </span>
                  <Link to={`/terv/${p.plan.id}`} className="ml-auto text-sm font-semibold text-teal hover:underline print:hidden">
                    Szerkesztés
                  </Link>
                </div>
                {p.plan.description && <p className="mb-3 text-sm text-muted">{p.plan.description}</p>}
                <ProgramCompact days={p.days} />
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}
