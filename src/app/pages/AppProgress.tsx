// Haladás: mérföldkövek, testsúly és gyakorlatonként az eddigi eredmények (legjobb sorozat, alkalmak, grafikon).
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Table2, Trophy } from 'lucide-react';
import type { PlanData, SetLog, WorkoutLog } from '../../lib/app-api';
import { useSession } from '../components/app/session';
import { formatSet, isSetDone } from '../components/app/plan-utils';
import { fmtDayShort, workoutDate } from '../components/app/dates';
import { BodyWeightCard } from '../components/app/BodyWeightCard';
import { MilestoneList } from '../components/app/Milestones';

type Session = { date: string; dayTitle: string; week: number; sets: SetLog[] };
type ExerciseHistory = { id: string; name: string; sessions: Session[] };

/** Egy alkalom fő értéke a grafikonhoz: a legnagyobb súly, ha van, különben a legtöbb ismétlés. */
const topWeight = (s: Session) => Math.max(...s.sets.map((x) => x.weight_kg ?? -1));
const topReps = (s: Session) => Math.max(...s.sets.map((x) => x.reps ?? -1));

function histories(plan: PlanData, logs: WorkoutLog[]): ExerciseHistory[] {
  const rowInfo = new Map<string, { exId: string; name: string; dayTitle: string; week: number }>();
  for (const d of plan.days) {
    for (const e of d.exercises) {
      rowInfo.set(e.id, { exId: e.exercise.id, name: e.exercise.name, dayTitle: d.title ?? `${d.day}. edzés`, week: d.week });
    }
  }
  const map = new Map<string, ExerciseHistory>();
  for (const log of logs) {
    const date = workoutDate(log);
    if (!date) continue;
    const byEx = new Map<string, Session>();
    for (const s of log.sets) {
      if (!isSetDone(s)) continue;
      const info = rowInfo.get(s.day_exercise_id);
      if (!info) continue;
      let sess = byEx.get(info.exId);
      if (!sess) {
        sess = { date, dayTitle: info.dayTitle, week: info.week, sets: [] };
        byEx.set(info.exId, sess);
      }
      sess.sets.push(s);
      if (!map.has(info.exId)) map.set(info.exId, { id: info.exId, name: info.name, sessions: [] });
    }
    for (const [exId, sess] of byEx) {
      sess.sets.sort((a, b) => a.set_number - b.set_number);
      map.get(exId)!.sessions.push(sess);
    }
  }
  for (const h of map.values()) h.sessions.sort((a, b) => a.date.localeCompare(b.date));
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'hu'));
}

function best(h: ExerciseHistory): { label: string; date: string } | null {
  let top: { s: SetLog; date: string } | null = null;
  for (const sess of h.sessions) {
    for (const s of sess.sets) {
      const better =
        !top ||
        (s.weight_kg ?? -1) > (top.s.weight_kg ?? -1) ||
        ((s.weight_kg ?? -1) === (top.s.weight_kg ?? -1) && (s.reps ?? -1) > (top.s.reps ?? -1));
      if (better) top = { s, date: sess.date };
    }
  }
  return top ? { label: formatSet(top.s), date: top.date } : null;
}

function Sparkline({ values, className = '' }: { values: number[]; className?: string }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const w = 100;
  const h = 32;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - 3 - ((v - min) / span) * (h - 6)}`);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={className} aria-hidden="true">
      <polyline points={pts.join(' ')} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      {pts.map((p, i) => {
        const [x, y] = p.split(',');
        return <circle key={i} cx={x} cy={y} r="2.2" fill="currentColor" vectorEffect="non-scaling-stroke" />;
      })}
    </svg>
  );
}

function seriesOf(h: ExerciseHistory): { values: number[]; unit: string } {
  const weights = h.sessions.map(topWeight);
  if (weights.some((w) => w > 0)) return { values: weights.filter((w) => w >= 0), unit: 'kg' };
  return { values: h.sessions.map(topReps).filter((r) => r >= 0), unit: 'ism.' };
}

function ExerciseDetail({ h }: { h: ExerciseHistory }) {
  const b = best(h);
  const { values, unit } = seriesOf(h);
  const first = values[0];
  const last = values.at(-1);
  const diff = first !== undefined && last !== undefined ? last - first : 0;
  return (
    <div className="space-y-5">
      <div>
        <Link to="/app/haladas" className="-ml-1 inline-flex min-h-11 items-center pr-3 text-sm text-app-navy/70">
          <ChevronLeft className="size-4" /> Haladás
        </Link>
        <h1 className="mt-1 text-2xl font-bold leading-tight">{h.name}</h1>
        <p className="mt-1 text-sm text-app-muted">{h.sessions.length} alkalom</p>
      </div>

      {b && (
        <div className="flex items-center gap-3 rounded-[14px] border border-app-teal/40 bg-app-mint p-4">
          <Trophy className="size-6 shrink-0 text-app-ink" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-app-ink">Legjobb sorozat</p>
            <p className="text-lg font-bold">{b.label}</p>
            <p className="text-xs text-app-muted">{fmtDayShort(b.date)}</p>
          </div>
        </div>
      )}

      {values.length >= 2 && (
        <section className="rounded-[14px] border border-app-line p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-app-teal">
              Alkalmankénti csúcs ({unit})
            </h2>
            <span className={`text-sm font-semibold ${diff > 0 ? 'text-app-teal' : 'text-app-muted'}`}>
              {diff > 0 ? '+' : ''}
              {String(Math.round(diff * 100) / 100).replace('.', ',')} {unit}
            </span>
          </div>
          <Sparkline values={values} className="mt-3 h-24 w-full text-app-teal" />
          <div className="mt-1 flex justify-between text-[11px] text-app-muted">
            <span>{fmtDayShort(h.sessions[0].date)}</span>
            <span>{fmtDayShort(h.sessions.at(-1)!.date)}</span>
          </div>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-app-teal">Alkalmak</h2>
        <ul className="space-y-2">
          {[...h.sessions].reverse().map((s, i) => (
            <li key={`${s.date}-${i}`} className="rounded-[14px] border border-app-line p-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold">{fmtDayShort(s.date)}</span>
                <span className="truncate text-xs text-app-muted">
                  {s.week}. hét · {s.dayTitle}
                </span>
              </div>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {s.sets.map((x) => (
                  <li key={x.set_number} className="rounded-[8px] border border-app-line px-2 py-1 text-xs text-app-muted">
                    {x.set_number} · {formatSet(x)}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default function AppProgress() {
  const { exerciseId } = useParams();
  const { plan, logs } = useSession();
  if (!plan) return null;
  const all = histories(plan, logs);

  if (exerciseId) {
    const h = all.find((x) => x.id === exerciseId);
    if (h) return <ExerciseDetail h={h} />;
    return (
      <div className="space-y-4">
        <Link to="/app/haladas" className="-ml-1 inline-flex min-h-11 items-center pr-3 text-sm text-app-navy/70">
          <ChevronLeft className="size-4" /> Haladás
        </Link>
        <p className="text-sm text-app-muted">Ennél a gyakorlatnál még nincs rögzített sorozat.</p>
      </div>
    );
  }

  const totalSets = all.reduce((n, h) => n + h.sessions.reduce((m, s) => m + s.sets.length, 0), 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Haladás</h1>
        <p className="mt-1 text-sm text-app-muted">
          {all.length === 0
            ? 'Amint rögzíted az első sorozatokat, itt látod gyakorlatonként, hogyan fejlődsz.'
            : `${all.length} gyakorlat · ${totalSets} rögzített sorozat`}
        </p>
      </div>

      <Link
        to="/app/osszesito"
        className="flex min-h-14 items-center gap-3 rounded-[14px] border border-app-teal/40 bg-app-mint px-4 py-3"
      >
        <Table2 className="size-5 shrink-0 text-app-ink" />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">Összesítő táblázat</span>
          <span className="block text-xs text-app-muted">Hetek egymás mellett · Excel, megosztás, nyomtatás</span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-app-navy/50" />
      </Link>

      <MilestoneList />

      <BodyWeightCard />

      {all.length > 0 && (
        <h2 className="text-xs font-semibold uppercase tracking-wider text-app-teal">Gyakorlatok</h2>
      )}
      {all.length > 0 && (
        <ul className="space-y-2">
          {all.map((h) => {
            const b = best(h);
            const { values } = seriesOf(h);
            return (
              <li key={h.id}>
                <Link
                  to={`/app/haladas/${h.id}`}
                  className="flex min-h-16 items-center gap-3 rounded-[14px] border border-app-line px-4 py-3"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold leading-snug">{h.name}</span>
                    <span className="block text-xs text-app-muted">
                      {h.sessions.length} alkalom{b ? ` · legjobb: ${b.label}` : ''}
                    </span>
                  </span>
                  <Sparkline values={values} className="h-8 w-16 shrink-0 text-app-teal" />
                  <ChevronRight className="size-4 shrink-0 text-app-navy/50" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
