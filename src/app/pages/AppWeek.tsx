import { Fragment } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Check, ChevronLeft, ChevronRight, Printer } from 'lucide-react';
import type { PlanDay, WorkoutLog } from '../../lib/app-api';
import { useSession } from '../components/app/session';
import {
  groupExercises,
  isDayDone,
  isLoggable,
  isSuperset,
  setProgress,
  weeksOf,
} from '../components/app/plan-utils';

function DayCard({ day, done: dayDone, log }: { day: PlanDay; done: boolean; log: WorkoutLog | undefined }) {
  const sections = groupExercises(day.exercises);
  const progress = setProgress(day.exercises, log);
  const done = dayDone || (progress.total > 0 && progress.done === progress.total);

  return (
    <Link
      to={`/app/d/${day.week}/${day.day}`}
      className="block rounded-[14px] border border-[#D5DDE6] bg-white p-4 active:bg-app-navy/5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-[#5B6B7D]">{day.day}. nap</p>
          <h2 className="text-lg font-bold leading-tight">{day.title ?? `${day.day}. edzés`}</h2>
        </div>
        <div className="flex shrink-0 items-center gap-1 pt-0.5">
          {done ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-app-teal px-2 py-0.5 text-xs font-semibold text-app-teal">
              <Check className="size-3" strokeWidth={3} /> kész
            </span>
          ) : (
            progress.total > 0 && (
              <span className="text-xs text-[#5B6B7D]">
                {progress.done} / {progress.total} sorozat
              </span>
            )
          )}
          <ChevronRight className="size-4 text-app-navy/50" />
        </div>
      </div>

      {progress.total > 0 && (
        <div className="mt-3 h-1.5 w-full rounded-full bg-app-navy/10" aria-hidden="true">
          <div
            className="h-full rounded-full bg-app-teal"
            style={{ width: `${(progress.done / progress.total) * 100}%` }}
          />
        </div>
      )}

      <div className="mt-3 space-y-3 border-t border-[#D5DDE6] pt-3">
        {sections.map((sec, si) => (
          <div key={`${sec.name}-${si}`}>
            {sec.name && (
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-app-teal">
                {sec.name}
              </p>
            )}
            <ul className="space-y-1">
              {sec.blocks.map((block) => {
                const ss = isSuperset(block);
                return (
                  <Fragment key={block.items[0].id}>
                    {block.items.map((it, i) => (
                      <li
                        key={it.id}
                        className={`flex items-baseline gap-2 text-sm ${
                          ss ? 'border-l-2 border-[#0B7566] pl-2' : ''
                        }`}
                      >
                        {ss && (
                          <span className="shrink-0 text-xs font-bold text-[#0B7566]">{`${block.label}${i + 1}`}</span>
                        )}
                        <span className="min-w-0 flex-1 leading-snug">{it.exercise.name}</span>
                        <span className="shrink-0 text-right text-xs text-[#5B6B7D]">
                          {[
                            isLoggable(it) ? `${it.sets} × ${it.reps}` : null,
                            it.resistance?.trim() || null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </li>
                    ))}
                  </Fragment>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </Link>
  );
}

export default function AppWeek() {
  const { week } = useParams();
  const { plan, logs } = useSession();
  const days = (plan?.days.filter((d) => String(d.week) === week) ?? []).sort((a, b) => a.day - b.day);

  // Hétváltás: az előző / következő hét a terv tényleges hetei közül
  const weekNumbers = plan ? weeksOf(plan).map((w) => w.week) : [];
  const idx = weekNumbers.findIndex((w) => String(w) === week);
  const prevWeek = idx > 0 ? weekNumbers[idx - 1] : null;
  const nextWeek = idx >= 0 && idx < weekNumbers.length - 1 ? weekNumbers[idx + 1] : null;
  const navClass = 'flex size-11 items-center justify-center rounded-[10px] border border-[#D5DDE6]';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Link to="/app" className="-ml-1 inline-flex min-h-11 items-center pr-3 text-sm text-app-navy/70">
          <ChevronLeft className="size-4" /> Vissza
        </Link>
        {days.length > 0 && (
          <Link
            to={`/app/print/${week}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-[#D5DDE6] px-3 text-sm font-semibold text-app-navy"
          >
            <Printer className="size-4" /> PDF
          </Link>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        {prevWeek !== null ? (
          <Link to={`/app/w/${prevWeek}`} aria-label={`${prevWeek}. hét`} className={navClass}>
            <ChevronLeft className="size-5" />
          </Link>
        ) : (
          <span className={`${navClass} opacity-30`} aria-hidden="true">
            <ChevronLeft className="size-5" />
          </span>
        )}
        <h1 className="text-2xl font-bold">{week}. hét</h1>
        {nextWeek !== null ? (
          <Link to={`/app/w/${nextWeek}`} aria-label={`${nextWeek}. hét`} className={navClass}>
            <ChevronRight className="size-5" />
          </Link>
        ) : (
          <span className={`${navClass} opacity-30`} aria-hidden="true">
            <ChevronRight className="size-5" />
          </span>
        )}
      </div>

      {days.length === 0 ? (
        <p className="text-sm text-app-navy/70">Ehhez a héthez nincs edzés.</p>
      ) : (
        <ul className="space-y-3">
          {days.map((d) => (
            <li key={d.id}>
              <DayCard day={d} done={isDayDone(logs, d.id)} log={logs.find((l) => l.plan_day_id === d.id)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
