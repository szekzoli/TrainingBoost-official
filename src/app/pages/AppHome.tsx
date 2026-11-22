import { Link, useLocation } from 'react-router-dom';
import { CalendarDays, Check, ChevronRight, ClipboardList, TrendingUp } from 'lucide-react';
import { useSession } from '../components/app/session';
import { isDayDone, weeksOf } from '../components/app/plan-utils';
import { fmtDayShort, workoutDate } from '../components/app/dates';
import { InAppBrowserNote } from '../components/app/InAppBrowserNote';
import { inAppBrowser } from '../components/app/install-prompt';

export default function AppHome() {
  const { plan, logs, code } = useSession();
  const installMode = new URLSearchParams(useLocation().search).has('telepites');
  if (!plan) return null;

  const weeks = weeksOf(plan);
  const total = plan.days.length;
  const done = plan.days.filter((d) => isDayDone(logs, d.id)).length;
  const next = plan.days.find((d) => !isDayDone(logs, d.id));
  const lastDone = logs
    .filter((l) => l.completed_at)
    .map((l) => workoutDate(l))
    .filter((d): d is string => !!d)
    .sort()
    .at(-1);
  // Melyik héten tart: a következő edzés hete (ha minden kész, az utolsó hét)
  const currentWeek = next?.week ?? weeks.at(-1)?.week;

  return (
    <div className="space-y-6">
      {installMode && (
        <section className="space-y-2 rounded-[14px] border border-app-teal bg-app-mint p-4 text-sm text-app-navy">
          <p className="font-semibold text-app-ink">Most add hozzá a főképernyőhöz</p>
          {inAppBrowser() && code ? (
            <InAppBrowserNote link={`${window.location.origin}/app/t/${code}?telepites=1`} />
          ) : (
            <p>
              Koppints alul a <strong>Megosztás</strong> gombra (négyzet felfelé nyíllal), görgess le, és válaszd a{' '}
              <strong>Főképernyőhöz adás</strong> lehetőséget. Az ikonról mindig a saját tervedet nyitod meg.
            </p>
          )}
          <Link to="/app" className="inline-block font-semibold text-app-ink underline">
            Kész, vissza
          </Link>
        </section>
      )}
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
        {lastDone && <p className="mt-2 text-xs text-app-navy/60">Utolsó edzés: {fmtDayShort(lastDone)}</p>}
        {next ? (
          <Link
            to={`/app/d/${next.week}/${next.day}`}
            className="mt-4 flex h-12 items-center justify-center rounded-lg bg-app-navy text-base font-semibold text-white"
          >
            Következő: {next.week}. hét · {next.title ?? `${next.day}. nap`}
          </Link>
        ) : (
          total > 0 && (
            <p className="mt-4 rounded-lg border border-app-teal px-4 py-3 text-center text-sm font-semibold text-app-teal">
              Minden edzést teljesítettél. Gratulálok! Hamarosan jön az új terv.
            </p>
          )
        )}
      </section>

      <Link to="/app/program" className="flex min-h-14 items-center gap-3 border border-app-navy/15 px-4 active:bg-app-navy/5">
        <ClipboardList className="size-5 text-app-teal" />
        <span className="flex-1 font-semibold">A program áttekintése</span>
        <ChevronRight className="size-4 text-app-navy/50" />
      </Link>

      <section className="-mt-4 grid grid-cols-2 gap-2">
        <Link to="/app/naptar" className="flex min-h-14 items-center gap-3 border border-app-navy/15 px-4 active:bg-app-navy/5">
          <CalendarDays className="size-5 text-app-teal" />
          <span className="font-semibold">Naptár</span>
        </Link>
        <Link to="/app/haladas" className="flex min-h-14 items-center gap-3 border border-app-navy/15 px-4 active:bg-app-navy/5">
          <TrendingUp className="size-5 text-app-teal" />
          <span className="font-semibold">Haladás</span>
        </Link>
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
                  className={`flex min-h-14 items-center justify-between border px-4 py-3 active:bg-app-navy/5 ${
                    week === currentWeek && !complete ? 'border-app-teal' : 'border-app-navy/15'
                  }`}
                >
                  <span className="font-semibold">
                    {week}. hét
                    {week === currentWeek && !complete && (
                      <span className="ml-2 text-xs font-semibold text-app-teal">aktuális</span>
                    )}
                  </span>
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
