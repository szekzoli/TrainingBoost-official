// Naptár: mikor edzett az ügyfél. A napra koppintva látszanak az aznapi edzések, és megnyithatók.
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronLeft, ChevronRight, Flame } from 'lucide-react';
import type { PlanDay, WorkoutLog } from '../../lib/app-api';
import { useSession } from '../components/app/session';
import { isDayDone, setProgress } from '../components/app/plan-utils';
import { fmtDayLong, fromIso, isoDay, todayIso, workoutDate } from '../components/app/dates';
import { durationOf, fmtClock, fmtMinutes } from '../components/app/workout-time';

type Entry = { day: PlanDay; log: WorkoutLog; done: boolean };

const WEEKDAYS = ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'];

/** Hétfő-alapú hét kezdőnapja. */
function mondayOf(iso: string): string {
  const d = fromIso(iso);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return isoDay(d);
}

/** Hány egymást követő héten volt legalább egy kész edzés (a mostani vagy az előző héttől visszafelé). */
function weekStreak(doneDates: string[]): number {
  const weeks = new Set(doneDates.map(mondayOf));
  let cur = mondayOf(todayIso());
  if (!weeks.has(cur)) {
    const d = fromIso(cur);
    d.setDate(d.getDate() - 7);
    cur = isoDay(d);
  }
  let n = 0;
  while (weeks.has(cur)) {
    n++;
    const d = fromIso(cur);
    d.setDate(d.getDate() - 7);
    cur = isoDay(d);
  }
  return n;
}

export default function AppCalendar() {
  const { plan, logs } = useSession();
  const today = todayIso();

  const byDate = useMemo(() => {
    const map = new Map<string, Entry[]>();
    if (!plan) return map;
    for (const log of logs) {
      const day = plan.days.find((d) => d.id === log.plan_day_id);
      const date = workoutDate(log);
      if (!day || !date) continue;
      const entry = { day, log, done: isDayDone(logs, day.id) };
      map.set(date, [...(map.get(date) ?? []), entry]);
    }
    return map;
  }, [plan, logs]);

  const allDates = [...byDate.keys()].sort();
  const lastDate = allDates.at(-1) ?? null;
  const [month, setMonth] = useState(() => (lastDate ?? today).slice(0, 7));
  const [selected, setSelected] = useState<string | null>(() => (byDate.has(today) ? today : lastDate));

  if (!plan) return null;

  const [y, m] = month.split('-').map(Number);
  const first = new Date(y, m - 1, 1, 12);
  const lead = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(y, m, 0).getDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => isoDay(new Date(y, m - 1, i + 1, 12))),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const shift = (delta: number) => {
    const d = new Date(y, m - 1 + delta, 1, 12);
    setMonth(isoDay(d).slice(0, 7));
  };
  const monthTitle = first.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long' });
  const doneDates = allDates.filter((d) => byDate.get(d)!.some((e) => e.done));
  const monthCount = doneDates.filter((d) => d.startsWith(month)).length;
  const streak = weekStreak(doneDates);
  const next = plan.days.find((d) => !isDayDone(logs, d.id));
  const selectedEntries = selected ? byDate.get(selected) ?? [] : [];

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Naptár</h1>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-[14px] border border-app-line px-2 py-3">
          <div className="text-2xl font-bold tabular-nums">{monthCount}</div>
          <div className="text-xs text-app-muted">edzés ebben a hónapban</div>
        </div>
        <div className="rounded-[14px] border border-app-line px-2 py-3">
          <div className="text-2xl font-bold tabular-nums">{doneDates.length}</div>
          <div className="text-xs text-app-muted">edzésnap összesen</div>
        </div>
        <div className="rounded-[14px] border border-app-line px-2 py-3">
          <div className="flex items-center justify-center gap-1 text-2xl font-bold tabular-nums">
            {streak}
            {streak > 1 && <Flame className="size-5 text-orange-500" aria-hidden="true" />}
          </div>
          <div className="text-xs text-app-muted">hét egymás után</div>
        </div>
      </div>

      <section className="rounded-[14px] border border-app-line p-3">
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => shift(-1)}
            aria-label="Előző hónap"
            className="flex size-11 items-center justify-center rounded-[10px] border border-app-line"
          >
            <ChevronLeft className="size-5" />
          </button>
          <h2 className="text-base font-bold capitalize">{monthTitle}</h2>
          <button
            type="button"
            onClick={() => shift(1)}
            aria-label="Következő hónap"
            className="flex size-11 items-center justify-center rounded-[10px] border border-app-line"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center" role="grid" aria-label={monthTitle}>
          {WEEKDAYS.map((w) => (
            <div key={w} className="py-1 text-[11px] font-semibold uppercase text-app-muted" role="columnheader">
              {w}
            </div>
          ))}
          {cells.map((iso, i) => {
            if (!iso) return <div key={`e${i}`} />;
            const entries = byDate.get(iso);
            const anyDone = entries?.some((e) => e.done);
            const isSel = iso === selected;
            const isToday = iso === today;
            return (
              <button
                key={iso}
                type="button"
                onClick={() => setSelected(iso)}
                aria-pressed={isSel}
                aria-label={`${fmtDayLong(iso)}${entries ? `, ${entries.length} edzés` : ''}`}
                className={`relative flex aspect-square flex-col items-center justify-center rounded-[10px] text-sm tabular-nums ${
                  isSel ? 'bg-app-navy font-bold text-white' : anyDone ? 'bg-app-mint font-semibold text-app-ink' : ''
                } ${isToday && !isSel ? 'ring-1 ring-app-teal' : ''}`}
              >
                {Number(iso.slice(8))}
                {entries && (
                  <span
                    className={`mt-0.5 size-1.5 rounded-full ${
                      anyDone ? (isSel ? 'bg-white' : 'bg-app-teal') : 'border border-app-teal'
                    }`}
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </div>
        <p className="mt-2 flex items-center gap-3 text-[11px] text-app-muted">
          <span className="inline-flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-app-teal" /> kész edzés
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-1.5 rounded-full border border-app-teal" /> elkezdett
          </span>
        </p>
      </section>

      {selected && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-app-teal">{fmtDayLong(selected)}</h2>
          {selectedEntries.length === 0 ? (
            <p className="text-sm text-app-muted">Ezen a napon nincs rögzített edzés.</p>
          ) : (
            <ul className="space-y-2">
              {selectedEntries.map(({ day, log, done }) => {
                const p = setProgress(day.exercises, log);
                return (
                  <li key={day.id}>
                    <Link
                      to={`/app/d/${day.week}/${day.day}`}
                      className="flex min-h-14 items-center justify-between gap-3 rounded-[14px] border border-app-line px-4 py-3"
                    >
                      <span className="min-w-0">
                        <span className="block font-semibold">{day.title ?? `${day.day}. edzés`}</span>
                        <span className="block text-xs text-app-muted">
                          {day.week}. hét · {p.done} / {p.total} sorozat
                          {(() => {
                            const d = durationOf(log);
                            return d ? ` · ${fmtClock(d.start)}–${fmtClock(d.end)} (${fmtMinutes(d.minutes)})` : '';
                          })()}
                          {log.note ? ` · „${log.note.slice(0, 40)}${log.note.length > 40 ? '…' : ''}”` : ''}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-app-teal">
                        {done && (
                          <>
                            <Check className="size-4" /> kész
                          </>
                        )}
                        <ChevronRight className="size-4 text-app-navy/50" />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {next && (
        <Link
          to={`/app/d/${next.week}/${next.day}`}
          className="flex h-12 items-center justify-center rounded-lg bg-app-navy text-base font-semibold text-white"
        >
          Következő: {next.week}. hét · {next.title ?? `${next.day}. nap`}
        </Link>
      )}
    </div>
  );
}
