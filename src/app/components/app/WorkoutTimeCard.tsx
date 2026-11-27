// Edzésidő a Haladás oldalon: átlag és oszlopdiagram az utolsó edzésekről.
// Csak az edzés közben rögzített (elindított és lezárt) edzések számítanak, az utólag rögzítettek nem.
import { Clock } from 'lucide-react';
import { useSession } from './session';
import { fmtDayShort, isoDay } from './dates';
import { durationOf, fmtMinutes } from './workout-time';

const SHOW = 12;

export function WorkoutTimeCard() {
  const { plan, logs } = useSession();
  if (!plan) return null;
  const titleOf = new Map(plan.days.map((d) => [d.id, d.title ?? `${d.week}. hét, ${d.day}. edzés`]));
  const items = logs
    .map((l) => ({ log: l, d: durationOf(l) }))
    .filter((x): x is { log: typeof x.log; d: NonNullable<typeof x.d> } => x.d !== null)
    .sort((a, b) => a.d.start.getTime() - b.d.start.getTime());
  const retro = logs.filter((l) => l.completed_at && durationOf(l) === null).length;
  if (items.length === 0) {
    return (
      <section className="space-y-1 rounded-[14px] border border-app-line p-4">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-app-teal">
          <Clock className="size-4" /> Edzésidő
        </h2>
        <p className="text-sm text-app-muted">
          Indítsd el az edzést az edzésnap tetején (vagy pipáld ki az első sorozatot), és zárd le a végén: itt látod majd,
          mennyi ideig edzettél.
        </p>
      </section>
    );
  }
  const recent = items.slice(-SHOW);
  const last10 = items.slice(-10);
  const avg = Math.round(last10.reduce((n, x) => n + x.d.minutes, 0) / last10.length);
  const max = Math.max(...recent.map((x) => x.d.minutes), avg);
  const h = 96;

  return (
    <section className="space-y-3 rounded-[14px] border border-app-line p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-app-teal">
          <Clock className="size-4" /> Edzésidő
        </h2>
        <span className="text-sm text-app-muted">
          átlag <strong className="text-base text-app-navy">{fmtMinutes(avg)}</strong>
          {last10.length < items.length ? ' (utolsó 10)' : ''}
        </span>
      </div>
      <div className="relative" style={{ height: h }} role="img" aria-label={`Edzésidők, átlag ${avg} perc`}>
        {/* Átlag-vonal */}
        <div
          className="absolute inset-x-0 border-t border-dashed border-app-navy/30"
          style={{ bottom: (avg / max) * (h - 4) }}
          aria-hidden
        />
        <div className="absolute inset-0 flex items-end gap-1">
          {recent.map((x, i) => (
            <div key={i} className="flex h-full max-w-7 flex-1 flex-col justify-end" title={`${fmtDayShort(isoDay(x.d.start))}: ${x.d.minutes} perc`}>
              <div
                className="w-full rounded-t-[4px] bg-app-teal"
                style={{ height: Math.max(3, (x.d.minutes / max) * (h - 4)) }}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-between text-[11px] text-app-muted">
        <span>{fmtDayShort(isoDay(recent[0].d.start))}</span>
        <span>{fmtDayShort(isoDay(recent.at(-1)!.d.start))}</span>
      </div>
      <ul className="space-y-1 text-sm">
        {[...recent].reverse().slice(0, 3).map((x, i) => (
          <li key={i} className="flex justify-between gap-2">
            <span className="truncate text-app-muted">
              {fmtDayShort(isoDay(x.d.start))} · {titleOf.get(x.log.plan_day_id) ?? ''}
            </span>
            <span className="shrink-0 font-semibold">{fmtMinutes(x.d.minutes)}</span>
          </li>
        ))}
      </ul>
      {retro > 0 && <p className="text-[11px] text-app-muted">{retro} utólag rögzített edzés nem számít bele.</p>}
    </section>
  );
}
