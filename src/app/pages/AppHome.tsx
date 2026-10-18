import { Link } from 'react-router-dom';
import { Check, ChevronRight } from 'lucide-react';
import { useSession } from '../components/app/session';
import { isDayDone, weeksOf } from '../components/app/plan-utils';

export default function AppHome() {
  const { plan, logs } = useSession();
  if (!plan) return null;

  const weeks = weeksOf(plan);
  const total = plan.days.length;
  const done = plan.days.filter((d) => isDayDone(logs, d.id)).length;
  const next = plan.days.find((d) => !isDayDone(logs, d.id));

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-bold leading-tight">{plan.plan.title}</h1>
        {plan.plan.description && (
          <p className="mt-2 text-sm leading-relaxed text-app-navy/70">{plan.plan.description}</p>
        )}
      </section>

      <section className="border border-app-navy/15 p-4">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-semibold">Haladás</span>
          <span className="text-app-navy/70">
            {done} / {total} edzés kész
          </span>
        </div>
        <div
          className="mt-3 h-1.5 w-full bg-app-navy/10"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={done}
        >
          <div
            className="h-full bg-app-teal transition-all"
            style={{ width: total ? `${(done / total) * 100}%` : '0%' }}
          />
        </div>
        {next && (
          <Link
            to={`/app/d/${next.week}/${next.day}`}
            className="mt-4 flex h-12 items-center justify-center rounded-lg bg-app-navy text-base font-semibold text-white"
          >
            Következő: {next.week}. hét · {next.title ?? `${next.day}. nap`}
          </Link>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-app-teal">Hetek</h2>
        <ul className="space-y-2">
          {weeks.map(({ week, days }) => {
            const weekDone = days.filter((d) => isDayDone(logs, d.id)).length;
            const complete = weekDone === days.length;
            return (
              <li key={week}>
                <Link
                  to={`/app/w/${week}`}
                  className="flex min-h-14 items-center justify-between border border-app-navy/15 px-4 py-3 active:bg-app-navy/5"
                >
                  <span className="font-semibold">{week}. hét</span>
                  <span className="flex items-center gap-2 text-sm text-app-navy/70">
                    {complete && <Check className="size-4 text-app-teal" aria-label="Kész" />}
                    {weekDone} / {days.length}
                    <ChevronRight className="size-4" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
