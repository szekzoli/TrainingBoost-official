// Ügyfél-oldal: összefoglaló, edzésnapló (súlyok, jegyzetek, értékelések) és gyakorlatonkénti haladás.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, errorMessage, type BodyWeight, type ClientRow, type ClientWorkout, type PlanSummary } from '../api';
import { DueBadge, ProgressCell, fmtDay, relDays } from '../components/ClientBits';
import { btn } from '../lib/util';
import { EditClientDialog } from './Clients';
import SummaryTable from '../components/SummaryTable';

export const RATING_LABELS = ['', 'nagyon könnyű', 'könnyű', 'pont jó', 'nehéz', 'nagyon nehéz'];

const fmtNum = (n: number | null) => (n === null ? '' : String(n).replace('.', ','));
const fmtSet = (w: number | null, r: number | null) =>
  w !== null && r !== null ? `${fmtNum(w)} kg × ${r}` : w !== null ? `${fmtNum(w)} kg` : `× ${r}`;

/** Egy rögzített sorozat: súly × ismétlés, pulzus, megjegyzés jele. */
const fmtLogged = (s: ClientWorkout['sets'][number]) =>
  `${fmtSet(s.weight_kg, s.reps)}${s.heart_rate ? ` ♥${s.heart_rate}` : ''}${s.note?.trim() ? ' ⚑' : ''}`;

/** Edzésidő percben, ha elindította és lezárta ugyanazon a napon (10 perc – 5 óra); különben null (utólag rögzítve). */
export function durationMinutes(w: ClientWorkout): number | null {
  if (!w.started_at || !w.completed_at) return null;
  const start = new Date(w.started_at);
  const day = start.toLocaleDateString('sv-SE');
  if (w.performed_on && w.performed_on.slice(0, 10) !== day) return null;
  const m = Math.round((new Date(w.completed_at).getTime() - start.getTime()) / 60000);
  return m >= 10 && m <= 300 ? m : null;
}
const fmtClock = (iso: string) => new Date(iso).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });

/** Mikor volt az edzés (beállított nap, különben a befejezés vagy az első naplózás napja). */
const dateOf = (w: ClientWorkout) => w.performed_on ?? w.completed_at ?? w.created_at;

function RatingBadge({ rating }: { rating: number | null }) {
  if (!rating) return null;
  const tone =
    rating >= 5
      ? 'border-danger/40 bg-danger-soft text-danger'
      : rating === 4
        ? 'border-amber-400 bg-amber-50 text-amber-900'
        : 'border-teal/40 bg-teal-soft text-teal';
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${tone}`}>
      {rating}/5 · {RATING_LABELS[rating]}
    </span>
  );
}

type ExerciseRow = {
  id: string;
  name: string;
  sessions: { date: string; top: { w: number | null; r: number | null }; sets: string }[];
};

function byExercise(workouts: ClientWorkout[]): ExerciseRow[] {
  const map = new Map<string, ExerciseRow>();
  for (const w of [...workouts].reverse()) {
    const groups = new Map<string, ClientWorkout['sets']>();
    for (const s of w.sets) groups.set(s.exercise_id, [...(groups.get(s.exercise_id) ?? []), s]);
    for (const [exId, sets] of groups) {
      let row = map.get(exId);
      if (!row) {
        row = { id: exId, name: sets[0].exercise_name, sessions: [] };
        map.set(exId, row);
      }
      const top = sets.reduce(
        (best, s) =>
          (s.weight_kg ?? -1) > (best.w ?? -1) || ((s.weight_kg ?? -1) === (best.w ?? -1) && (s.reps ?? -1) > (best.r ?? -1))
            ? { w: s.weight_kg, r: s.reps }
            : best,
        { w: null as number | null, r: null as number | null },
      );
      row.sessions.push({ date: dateOf(w), top, sets: sets.map(fmtLogged).join(', ') });
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'hu'));
}

function WorkoutCard({ w }: { w: ClientWorkout }) {
  const groups: { name: string; prescribed: string; sets: string[] }[] = [];
  for (const s of w.sets) {
    let g = groups.find((x) => x.name === s.exercise_name);
    if (!g) {
      g = {
        name: s.exercise_name,
        prescribed: [`${s.prescribed_sets} × ${s.prescribed_reps}`, s.prescribed_resistance].filter(Boolean).join(' · '),
        sets: [],
      };
      groups.push(g);
    }
    g.sets.push(fmtLogged(s));
  }
  const notes = w.sets.filter((s) => s.note?.trim());
  const minutes = durationMinutes(w);
  return (
    <li className="rounded-[14px] border border-line bg-white p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-bold">{fmtDay(dateOf(w))}</span>
        <span className="text-sm text-muted">
          {w.week}. hét · {w.day_title ?? `${w.day}. nap`}
        </span>
        {w.completed_at ? (
          <span className="rounded-full border border-teal px-2 py-0.5 text-xs font-semibold text-teal">kész</span>
        ) : (
          <span className="rounded-full border border-line px-2 py-0.5 text-xs font-semibold text-muted">elkezdett</span>
        )}
        <RatingBadge rating={w.rating} />
        {minutes !== null && w.started_at && w.completed_at ? (
          <span className="text-xs text-muted">
            {fmtClock(w.started_at)}–{fmtClock(w.completed_at)} · {minutes} perc
          </span>
        ) : (
          w.completed_at && <span className="text-xs text-muted">utólag rögzítve</span>
        )}
        <span className="ml-auto text-xs text-muted">{w.plan_title}</span>
      </div>
      {w.note && (
        <p className="mt-2 rounded-[10px] border border-line bg-canvas px-3 py-2 text-sm">
          <span className="font-semibold">Jegyzet:</span> {w.note}
        </p>
      )}
      {groups.length > 0 ? (
        <table className="mt-3 w-full text-sm">
          <tbody>
            {groups.map((g) => (
              <tr key={g.name} className="border-t border-line align-top">
                <td className="w-1/3 py-1.5 pr-3 font-semibold">{g.name}</td>
                <td className="w-1/4 py-1.5 pr-3 text-xs text-muted">{g.prescribed}</td>
                <td className="py-1.5 tabular-nums">{g.sets.join(' · ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="mt-2 text-sm text-muted">Nincs rögzített sorozat.</p>
      )}
      {notes.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-sm">
          {notes.map((s) => (
            <li key={`${s.exercise_id}-${s.set_number}`}>
              ⚑ <span className="font-semibold">{s.exercise_name}</span>, {s.set_number}. sorozat: {s.note}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

/** Testsúly: utolsó mérés, változás az első óta, kis grafikon és az utolsó mérések. */
function WeightPanel({ weights }: { weights: BodyWeight[] }) {
  const first = weights[0];
  const last = weights[weights.length - 1];
  const diff = Math.round((last.weight_kg - first.weight_kg) * 10) / 10;
  const kg = (n: number) => n.toLocaleString('hu-HU', { maximumFractionDigits: 1 });
  const v = weights.map((w) => w.weight_kg);
  const min = Math.min(...v);
  const span = Math.max(...v) - min || 1;
  const pts = v.map((x, i) => `${v.length === 1 ? 50 : (i / (v.length - 1)) * 100},${28 - ((x - min) / span) * 24}`).join(' ');
  return (
    <div className="flex flex-wrap items-center gap-6 rounded-[14px] border border-line bg-white p-4">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-muted">Testsúly</div>
        <div className="mt-1 text-2xl font-bold tabular-nums">{kg(last.weight_kg)} kg</div>
        <div className="text-xs text-muted">
          {fmtDay(last.measured_on)}
          {weights.length > 1 && ` · ${diff > 0 ? '+' : diff < 0 ? '−' : '±'}${kg(Math.abs(diff))} kg ${fmtDay(first.measured_on)} óta`}
        </div>
      </div>
      {weights.length > 1 && (
        <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="h-12 w-40 text-teal" aria-hidden>
          <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </svg>
      )}
      <div className="flex flex-wrap gap-1.5">
        {weights.slice(-8).reverse().map((w) => (
          <span key={w.measured_on} className="rounded-[8px] border border-line px-2 py-0.5 text-xs tabular-nums text-muted">
            {fmtDay(w.measured_on)}: {kg(w.weight_kg)}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function ClientDetail() {
  const { id = '' } = useParams();
  const [client, setClient] = useState<ClientRow | null>(null);
  const [workouts, setWorkouts] = useState<ClientWorkout[] | null>(null);
  const [weights, setWeights] = useState<BodyWeight[]>([]);
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'workouts' | 'exercises' | 'summary'>('workouts');
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [d, p] = await Promise.all([api.getClientDetail(id), api.listPlans(false)]);
      setClient(d.client);
      setWorkouts(d.workouts);
      setWeights(d.weights ?? []);
      setPlans(p);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const exercises = useMemo(() => byExercise(workouts ?? []), [workouts]);

  if (error) {
    return (
      <div className="rounded-[14px] border border-line bg-white p-6 text-sm">
        <p role="alert" className="text-danger">
          {error}
        </p>
        <button type="button" className={`${btn} mt-3`} onClick={() => void load()}>
          Újrapróbálom
        </button>
      </div>
    );
  }
  if (!client || !workouts) return <p className="text-sm text-muted">Betöltés…</p>;

  const timed = workouts.map(durationMinutes).filter((m): m is number => m !== null).slice(0, 10);
  const avgMinutes = timed.length ? Math.round(timed.reduce((n, m) => n + m, 0) / timed.length) : null;
  const rated = workouts.filter((w) => w.rating).slice(0, 5);
  const avg = rated.length ? rated.reduce((n, w) => n + (w.rating ?? 0), 0) / rated.length : null;
  const tabClass = (on: boolean) =>
    `border-b-2 px-4 py-2 text-sm font-semibold ${on ? 'border-teal text-teal' : 'border-transparent text-muted hover:text-navy'}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Link to="/ugyfelek" className="text-sm font-semibold text-teal">
          ‹ Ügyfelek
        </Link>
        <h1 className="mr-auto text-2xl font-bold">{client.label}</h1>
        {client.revoked_at && (
          <span className="rounded-full border border-danger/40 px-2 py-0.5 text-xs font-semibold text-danger">visszavont</span>
        )}
        <button type="button" className={btn} onClick={() => setEditing(true)}>
          Szerkesztés
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-[14px] border border-line bg-white p-4 md:col-span-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted">Terv</div>
          <Link to={`/terv/${client.plan_id}`} className="mt-1 block font-semibold hover:text-teal hover:underline">
            {client.plan_title}
          </Link>
          <div className="mt-1 text-xs text-muted">
            {client.plan_weeks} hét · kezdés: {fmtDay(client.plan_started_on ?? client.created_at)}
          </div>
          <div className="mt-3">
            <ProgressCell client={client} />
          </div>
        </div>
        <div className="rounded-[14px] border border-line bg-white p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted">Új terv</div>
          <div className="mt-2">
            <DueBadge client={client} />
          </div>
          <div className="mt-3 text-xs font-semibold uppercase tracking-wider text-muted">Utolsó edzés</div>
          <div className="mt-1 text-sm">{relDays(client.last_performed_on ?? client.last_activity)}</div>
          <div className="mt-3 text-xs font-semibold uppercase tracking-wider text-muted">Átlagos edzésidő</div>
          <div className="mt-1 text-sm">
            {avgMinutes !== null ? `${avgMinutes} perc (utolsó ${timed.length} mért edzés)` : '–'}
          </div>
        </div>
        <div className="rounded-[14px] border border-line bg-white p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted">Érzés (utolsó 5 értékelés)</div>
          <div className="mt-1 text-2xl font-bold tabular-nums">{avg ? `${String(avg.toFixed(1)).replace('.', ',')}/5` : '–'}</div>
          <div className="text-xs text-muted">{avg ? RATING_LABELS[Math.round(avg)] : 'még nem értékelt'}</div>
        </div>
      </div>

      {weights.length > 0 && <WeightPanel weights={weights} />}

      {client.coach_note && (
        <div className="rounded-[14px] border border-line bg-white p-4 text-sm">
          <span className="font-semibold">Belső jegyzet:</span> <span className="whitespace-pre-line">{client.coach_note}</span>
        </div>
      )}

      <div>
        <div className="flex border-b border-line" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'workouts'} className={tabClass(tab === 'workouts')} onClick={() => setTab('workouts')}>
            Edzések ({workouts.length})
          </button>
          <button type="button" role="tab" aria-selected={tab === 'exercises'} className={tabClass(tab === 'exercises')} onClick={() => setTab('exercises')}>
            Gyakorlatonként ({exercises.length})
          </button>
          <button type="button" role="tab" aria-selected={tab === 'summary'} className={tabClass(tab === 'summary')} onClick={() => setTab('summary')}>
            Összesítő
          </button>
        </div>

        {tab === 'summary' ? (
          <SummaryTable planId={client.plan_id} clientLabel={client.label} workouts={workouts} />
        ) : tab === 'workouts' ? (
          workouts.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Még nincs naplózott edzés.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {workouts.map((w) => (
                <WorkoutCard key={w.plan_day_id} w={w} />
              ))}
            </ul>
          )
        ) : exercises.length === 0 ? (
          <p className="mt-4 text-sm text-muted">Még nincs rögzített sorozat.</p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-[14px] border border-line bg-white">
            <table className="w-full border-collapse text-sm">
              <thead className="border-b border-line">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">Gyakorlat</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">Első</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">Utolsó</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">Alkalmak (csúcs sorozat)</th>
                </tr>
              </thead>
              <tbody>
                {exercises.map((e) => {
                  const first = e.sessions[0];
                  const last = e.sessions.at(-1)!;
                  const up = (last.top.w ?? 0) > (first.top.w ?? 0);
                  return (
                    <tr key={e.id} className="border-b border-line align-top last:border-b-0">
                      <td className="px-4 py-3 font-semibold">{e.name}</td>
                      <td className="px-4 py-3 tabular-nums">{fmtSet(first.top.w, first.top.r)}</td>
                      <td className={`px-4 py-3 tabular-nums ${up ? 'font-semibold text-teal' : ''}`}>
                        {fmtSet(last.top.w, last.top.r)}
                        {up && ' ↑'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {e.sessions.map((s, i) => (
                            <span key={i} title={s.sets} className="rounded-[8px] border border-line px-2 py-0.5 text-xs tabular-nums text-muted">
                              {fmtDay(s.date).slice(6)} {fmtSet(s.top.w, s.top.r)}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <EditClientDialog
          client={client}
          plans={plans}
          onClose={() => setEditing(false)}
          onSaved={async () => {
            setEditing(false);
            await load();
          }}
        />
      )}
    </div>
  );
}
