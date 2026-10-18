import { Link, useParams } from 'react-router-dom';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSession } from '../components/app/session';
import { isDayDone } from '../components/app/plan-utils';

export default function AppWeek() {
  const { week } = useParams();
  const { plan, logs } = useSession();
  const days = plan?.days.filter((d) => String(d.week) === week) ?? [];

  return (
    <div className="space-y-5">
      <Link to="/app" className="inline-flex items-center text-sm text-app-navy/70">
        <ChevronLeft className="size-4" /> Vissza
      </Link>
      <h1 className="text-2xl font-bold">{week}. hét</h1>

      {days.length === 0 ? (
        <p className="text-sm text-app-navy/70">Ehhez a héthez nincs edzés.</p>
      ) : (
        <ul className="space-y-2">
          {days.map((d) => {
            const done = isDayDone(logs, d.id);
            return (
              <li key={d.id}>
                <Link
                  to={`/app/d/${d.week}/${d.day}`}
                  className="flex min-h-16 items-center justify-between border border-app-navy/15 px-4 py-3 active:bg-app-navy/5"
                >
                  <span>
                    <span className="block text-xs text-app-navy/60">{d.day}. nap</span>
                    <span className="font-semibold">{d.title ?? `${d.day}. edzés`}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    {done ? (
                      <span className="flex size-6 items-center justify-center rounded-full bg-app-teal text-white">
                        <Check className="size-4" aria-label="Kész" />
                      </span>
                    ) : (
                      <span className="size-6 rounded-full border border-app-navy/25" aria-label="Még nincs kész" />
                    )}
                    <ChevronRight className="size-4 text-app-navy/50" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
