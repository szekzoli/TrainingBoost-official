// Edzés utáni összefoglaló: lezáráskor felugrik, később a nap oldaláról újra megnyitható.
import { useEffect, type ReactNode } from 'react';
import { Clock, Flame, ListChecks, Trophy, TrendingUp, X } from 'lucide-react';
import type { PlanData, PlanDay, WorkoutLog } from '../../../lib/app-api';
import { ShareButton } from './ShareButton';
import { buildWorkoutCard, buildWorkoutSummary } from './workout-summary';
import { todayIso, workoutDate } from './dates';
import { fmtMinutes } from './workout-time';

export function WorkoutSummaryDialog({
  plan,
  logs,
  planDay,
  log,
  onClose,
}: {
  plan: PlanData;
  logs: WorkoutLog[];
  planDay: PlanDay;
  log: WorkoutLog;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const s = buildWorkoutSummary(plan, logs, planDay, log);
  const date = workoutDate(log) ?? todayIso();
  const allSets = s.setsTotal > 0 && s.setsDone >= s.setsTotal;
  const hint = s.firstTime
    ? 'Ez volt az első alkalom: mostantól ehhez méred magad.'
    : s.records.length === 0 && s.improved.length === 0 && s.compared > 0
      ? 'Hozod a múltkori szintet. Következő alkalommal próbálj meg egy kicsit többet.'
      : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="summary-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center print:hidden"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[18px] bg-white p-5 text-app-navy shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-app-teal">
              {planDay.title ?? `${planDay.week}. hét · ${planDay.day}. nap`}
            </p>
            <h2 id="summary-title" className="mt-1 text-2xl font-bold">
              Edzés kész, szép munka!
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Bezárás"
            className="-mr-2 -mt-1 flex size-11 shrink-0 items-center justify-center rounded-full text-app-muted active:bg-app-navy/5"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Stat icon={<Clock className="size-4" />} label="edzésidő" value={s.minutes ? fmtMinutes(s.minutes) : '–'} />
          <Stat
            icon={<ListChecks className="size-4" />}
            label={allSets ? 'minden sorozat kész' : 'sorozat'}
            value={s.setsTotal > 0 ? `${s.setsDone} / ${s.setsTotal}` : '–'}
          />
        </div>

        {s.records.length > 0 && (
          <section className="mt-5">
            <h3 className="flex items-center gap-1.5 text-sm font-bold text-app-ink">
              <Trophy className="size-4" /> {s.records.length > 1 ? `${s.records.length} új rekord` : 'Új rekord'}
            </h3>
            <ul className="mt-2 space-y-1.5">
              {s.records.map((r) => (
                <li key={r.name} className="flex items-baseline justify-between gap-3 rounded-[10px] bg-app-mint px-3 py-2 text-sm">
                  <span className="font-semibold">{r.name}</span>
                  <span className="shrink-0 text-right">
                    <b className="text-app-ink">{r.now}</b>
                    {r.before && <span className="block text-xs text-app-muted">múltkor {r.before}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {s.improved.length > 0 && (
          <section className="mt-5">
            <h3 className="flex items-center gap-1.5 text-sm font-bold">
              <TrendingUp className="size-4 text-app-teal" /> Jobb, mint legutóbb
            </h3>
            <ul className="mt-2 divide-y divide-app-line rounded-[10px] border border-app-line text-sm">
              {s.improved.map((r) => (
                <li key={r.name} className="flex items-baseline justify-between gap-3 px-3 py-2">
                  <span>{r.name}</span>
                  <span className="shrink-0 text-right text-app-muted">
                    {r.before} → <b className="text-app-navy">{r.now}</b>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {hint && <p className="mt-5 text-sm text-app-muted">{hint}</p>}

        {(s.workoutsThisWeek > 0 || s.streakWeeks > 1) && (
          <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold">
            <Flame className="size-4 text-app-teal" />
            {[
              s.workoutsThisWeek > 0 ? `${s.workoutsThisWeek}. edzés ezen a héten` : null,
              s.streakWeeks > 1 ? `${s.streakWeeks} hét egymás után` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        )}

        <div className="mt-5 grid gap-2">
          <div className="flex justify-center">
            <ShareButton
              label="Megosztom az edzést"
              filename="trainingboost-edzes.png"
              makeCard={() => buildWorkoutCard(s, date)}
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-12 w-full rounded-[12px] bg-app-teal text-base font-semibold text-white"
          >
            Rendben
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-[12px] border border-app-line px-3 py-2.5">
      <p className="text-xl font-bold tabular-nums">{value}</p>
      <p className="mt-0.5 flex items-center gap-1 text-xs text-app-muted">
        <span className="text-app-teal">{icon}</span> {label}
      </p>
    </div>
  );
}
