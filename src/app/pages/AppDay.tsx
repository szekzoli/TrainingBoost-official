import { Fragment, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowDown, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Clock, Play, Printer, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../components/ui/alert-dialog';
import { AppApiError } from '../../lib/app-api';
import { useSession } from '../components/app/session';
import { useRestTimer } from '../components/app/RestTimer';
import ExerciseCard from '../components/app/ExerciseCard';
import { groupExercises, isSuperset, setProgress } from '../components/app/plan-utils';
import { fmtDayLong, isoDay, todayIso, workoutDate } from '../components/app/dates';
import {
  ASK_AFTER_HOURS,
  durationOf,
  fmtClock,
  fmtElapsed,
  fmtMinutes,
  isRetro,
  lastSetAt,
} from '../components/app/workout-time';

/** Futó óra az edzés kezdete óta (másodpercenként frissül). */
function Elapsed({ since }: { since: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return <span className="tabular-nums">{fmtElapsed((now - new Date(since).getTime()) / 1000)}</span>;
}

const RATINGS = [
  { value: 1, label: 'nagyon könnyű' },
  { value: 2, label: 'könnyű' },
  { value: 3, label: 'pont jó' },
  { value: 4, label: 'nehéz' },
  { value: 5, label: 'nagyon nehéz' },
];

export default function AppDay() {
  const { week, day } = useParams();
  const { plan, logs, completeDay, setWorkoutDate, rateWorkout, startWorkout, deleteWorkout } = useSession();
  const timer = useRestTimer();
  const [deleting, setDeleting] = useState(false);
  const [search] = useSearchParams();
  const jumpTo = search.get('sor');
  const planDay = plan?.days.find((d) => String(d.week) === week && String(d.day) === day);
  const log = planDay ? logs.find((l) => l.plan_day_id === planDay.id) : undefined;

  const [note, setNote] = useState(log?.note ?? '');
  const [busy, setBusy] = useState(false);
  const [date, setDate] = useState(() => workoutDate(log) ?? todayIso());
  const [dateBusy, setDateBusy] = useState(false);
  // Szakaszok összecsukása: csak helyi állapot (szakasz sorszáma → zárva)
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});
  // Lezáráskor, ha rég kezdte: rákérdezünk, mikor fejezte be
  const [askEnd, setAskEnd] = useState(false);

  // A számláló-sávról vagy az „Edzés folyamatban” sávról érkezve: a megadott gyakorlat első nem kész sorához görgetünk
  useEffect(() => {
    if (!jumpTo) return;
    const id = window.setTimeout(() => {
      const rows = Array.from(document.querySelectorAll<HTMLElement>(`[data-set-row][data-ex="${CSS.escape(jumpTo)}"]`));
      const row = rows.find((r) => r.dataset.done !== 'true') ?? rows.at(-1);
      row?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
    return () => window.clearTimeout(id);
  }, [jumpTo]);

  if (!plan || !planDay) {
    return (
      <div className="space-y-4">
        <Link to="/app" className="inline-flex items-center text-sm text-app-navy/70">
          <ChevronLeft className="size-4" /> Vissza
        </Link>
        <p className="text-sm text-app-navy/70">Ez az edzés nem található.</p>
      </div>
    );
  }

  const done = !!log?.completed_at;
  const sections = groupExercises(planDay.exercises);
  const progress = setProgress(planDay.exercises, log);
  const hrefOf = (exerciseId: string) => `/app/e/${planDay.week}/${planDay.day}/${exerciseId}`;

  const savedDate = workoutDate(log);

  // A dátum azonnal mentődik, ha már van naplója a napnak; különben az "Edzés kész" menti.
  const changeDate = async (value: string) => {
    setDate(value);
    if (!log || !value || value === log.performed_on) return;
    setDateBusy(true);
    try {
      const ok = await setWorkoutDate(planDay.id, value);
      if (ok) toast.success('Dátum mentve.');
    } catch {
      toast.error('A dátumot nem sikerült menteni.');
      setDate(savedDate ?? todayIso());
    } finally {
      setDateBusy(false);
    }
  };

  const rate = async (value: number) => {
    const next = log?.rating === value ? null : value; // ugyanarra koppintva törli
    try {
      await rateWorkout(planDay.id, next);
    } catch {
      toast.error('Az értékelést nem sikerült menteni.');
    }
  };

  const startedAt = log?.started_at ?? null;
  const duration = durationOf(log);
  const lastSet = lastSetAt(log);
  const hasSets = !!lastSet;
  const dayHref = `/app/d/${planDay.week}/${planDay.day}`;

  const start = async () => {
    try {
      await startWorkout(planDay.id, new Date().toISOString());
    } catch {
      toast.error('Nem sikerült menteni. Próbáld újra.');
    }
  };

  /** Lezárás. Ha a kezdés óta több mint 3 óra telt el, előbb rákérdezünk a befejezés idejére. */
  const finish = async (endAt?: Date) => {
    if (
      !done &&
      !endAt &&
      startedAt &&
      date === isoDay(new Date(startedAt)) &&
      Date.now() - new Date(startedAt).getTime() > ASK_AFTER_HOURS * 3600_000
    ) {
      setAskEnd(true);
      return;
    }
    setAskEnd(false);
    setBusy(true);
    try {
      // Már lezárt edzésnél csak a jegyzet változik: a befejezés ideje marad
      const at = done && log?.completed_at ? log.completed_at : (endAt ?? new Date()).toISOString();
      const ok = await completeDay(planDay.id, note.trim() === '' ? null : note.trim(), at);
      if (ok && date && date !== todayIso() && date !== log?.performed_on) await setWorkoutDate(planDay.id, date);
      if (ok) toast.success(done ? 'Jegyzet frissítve.' : 'Edzés kész, szép munka!');
    } catch {
      toast.error('Nem sikerült menteni. Próbáld újra.');
    } finally {
      setBusy(false);
    }
  };

  /** Az edzés törlése (megerősítés után). Net kell hozzá, és nem lehet várakozó módosítás. */
  const removeWorkout = async () => {
    setDeleting(true);
    try {
      timer.stop(); // egy futó időmérés ne mentsen bele az éppen törölt edzésbe
      await deleteWorkout(planDay.id);
      setNote('');
      setDate(todayIso());
      setAskEnd(false);
      toast.success('Az edzés törölve.');
    } catch (e) {
      const kind = e instanceof AppApiError ? e.kind : 'other';
      toast.error(
        kind === 'network'
          ? 'Az edzés törléséhez internet kell (és hogy minden korábbi módosítás felmenjen). Próbáld újra kicsit később.'
          : kind === 'missing_function'
            ? 'A törlés a szerveren még nincs bekapcsolva (010-es SQL).'
            : 'Nem sikerült törölni. Próbáld újra.',
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <Link
            to={`/app/w/${planDay.week}`}
            className="-ml-1 inline-flex min-h-11 items-center pr-3 text-sm text-app-navy/70"
          >
            <ChevronLeft className="size-4" /> {planDay.week}. hét
          </Link>
          <Link
            to={`/app/print/${planDay.week}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-app-line px-3 text-sm font-semibold text-app-navy"
          >
            <Printer className="size-4" /> PDF
          </Link>
        </div>
        <h1 className="mt-1 text-2xl font-bold leading-tight">
          {planDay.title ?? `${planDay.day}. edzés`}
        </h1>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-app-muted">
          {planDay.week}. hét · {planDay.day}. nap
          {done && (
            <span className="inline-flex items-center gap-1 font-semibold text-app-teal">
              <Check className="size-4" /> Kész{savedDate ? ` · ${fmtDayLong(savedDate)}` : ''}
            </span>
          )}
        </p>
        {done && duration && (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-app-muted">
            <Clock className="size-4" /> {fmtClock(duration.start)}–{fmtClock(duration.end)} · {fmtMinutes(duration.minutes)}
          </p>
        )}
        {done && isRetro(log) && <p className="mt-1 text-xs text-app-muted">Utólag rögzítve (edzésidő nélkül)</p>}
        {!done && startedAt && (
          <p className="mt-3 flex items-center gap-2 rounded-[10px] border border-app-teal/40 bg-app-mint px-3 py-2 text-sm text-app-ink">
            <Clock className="size-4 shrink-0" />
            <span className="flex-1">
              Edzés folyamatban · {fmtClock(new Date(startedAt))} óta
            </span>
            <strong className="text-base">
              <Elapsed since={startedAt} />
            </strong>
          </p>
        )}
        {!done && !startedAt && !hasSets && date === todayIso() && (
          <button
            type="button"
            onClick={() => void start()}
            className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[12px] bg-app-teal text-base font-semibold text-white"
          >
            <Play className="size-4 fill-current" /> Edzés indítása
          </button>
        )}
        {progress.total > 0 && (
          <div className="mt-4">
            <p className="text-sm font-semibold">
              {progress.done} / {progress.total} sorozat
            </p>
            <div
              className="mt-2 h-1.5 w-full rounded-full bg-app-navy/10"
              role="progressbar"
              aria-label="Elvégzett sorozatok"
              aria-valuemin={0}
              aria-valuemax={progress.total}
              aria-valuenow={progress.done}
            >
              <div
                className="h-full rounded-full bg-app-teal transition-all"
                style={{ width: `${(progress.done / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {sections.map((sec, si) => {
        const secProgress = setProgress(
          sec.blocks.flatMap((b) => b.items),
          log,
        );
        const secDone = secProgress.total > 0 && secProgress.done === secProgress.total;
        const open = !sec.name || !collapsed[si];
        const bodyId = `section-${si}`;

        return (
          <section key={`${sec.name}-${si}`} className="space-y-3">
            {sec.name && (
              <button
                type="button"
                aria-expanded={open}
                aria-controls={bodyId}
                onClick={() => setCollapsed((c) => ({ ...c, [si]: open }))}
                className="flex min-h-11 w-full items-center gap-1 text-left"
              >
                {open ? (
                  <ChevronDown className="size-5 shrink-0 text-app-teal" />
                ) : (
                  <ChevronRight className="size-5 shrink-0 text-app-teal" />
                )}
                <span className="flex-1 text-xs font-semibold uppercase tracking-wider text-app-teal">
                  {sec.name}
                </span>
                {secDone ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-app-teal px-2 py-0.5 text-xs font-semibold text-app-teal">
                    <Check className="size-3" strokeWidth={3} /> kész
                  </span>
                ) : (
                  secProgress.total > 0 && (
                    <span className="text-xs text-app-muted">
                      {secProgress.done} / {secProgress.total} sorozat
                    </span>
                  )
                )}
              </button>
            )}

            {open && (
              <div id={bodyId} className="space-y-3">
                {sec.blocks.map((block) =>
                  isSuperset(block) ? (
                    <div
                      key={block.items[0].id}
                      className="overflow-hidden rounded-[14px] border-[1.5px] border-app-ink bg-white"
                    >
                      <div className="flex items-center justify-between gap-3 bg-app-ink px-3 py-2 text-white">
                        <span className="text-xs font-bold uppercase tracking-wider">
                          Szuperszett {block.label}
                        </span>
                        <span className="text-right text-[11px] leading-tight">
                          {block.items.length} gyakorlat · szünet nélkül váltogasd
                        </span>
                      </div>
                      {block.items.map((it, i) => (
                        <Fragment key={it.id}>
                          {i > 0 && (
                            <div className="flex items-center gap-2 border-t border-dashed border-app-ink bg-app-mint px-3 py-2 text-xs font-semibold text-app-ink">
                              <ArrowDown className="size-4 shrink-0" />
                              {`${block.label}${i} után azonnal ${block.label}${i + 1}${
                                i === block.items.length - 1 ? ', utána pihenő' : ''
                              }`}
                            </div>
                          )}
                          <ExerciseCard
                            item={it}
                            planDayId={planDay.id}
                            plan={plan}
                            logs={logs}
                            detailsHref={hrefOf(it.id)}
                            dayHref={dayHref}
                            marker={`${block.label}${i + 1}`}
                            embedded
                            groupKey={block.items[0].id}
                          />
                        </Fragment>
                      ))}
                    </div>
                  ) : (
                    block.items.map((it) => (
                      <ExerciseCard
                        key={it.id}
                        item={it}
                        planDayId={planDay.id}
                        plan={plan}
                        logs={logs}
                        detailsHref={hrefOf(it.id)}
                        dayHref={dayHref}
                      />
                    ))
                  ),
                )}
              </div>
            )}
          </section>
        );
      })}

      <section className="space-y-3 border-t border-app-line pt-6">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="day-date" className="flex items-center gap-2 text-sm font-semibold">
            <CalendarDays className="size-4 text-app-teal" /> Edzés napja
          </label>
          <input
            id="day-date"
            type="date"
            value={date}
            max={todayIso()}
            min="2020-01-01"
            disabled={dateBusy}
            onChange={(e) => void changeDate(e.target.value)}
            className="h-11 rounded-[10px] border border-app-line bg-white px-3 text-base text-app-navy focus:border-app-teal focus:outline-none focus:ring-1 focus:ring-app-teal disabled:opacity-50"
          />
        </div>
        <fieldset>
          <legend className="text-sm font-semibold">Milyen nehéz volt?</legend>
          <div className="mt-2 grid grid-cols-5 gap-1.5">
            {RATINGS.map((r) => {
              const on = log?.rating === r.value;
              return (
                <button
                  key={r.value}
                  type="button"
                  aria-pressed={on}
                  onClick={() => void rate(r.value)}
                  className={`flex min-h-14 flex-col items-center justify-center rounded-[10px] border px-1 text-center ${
                    on ? 'border-app-teal bg-app-mint text-app-ink' : 'border-app-line text-app-navy/80'
                  }`}
                >
                  <span className="text-base font-bold">{r.value}</span>
                  <span className="text-[10px] leading-tight">{r.label}</span>
                </button>
              );
            })}
          </div>
        </fieldset>
        <label htmlFor="day-note" className="block text-sm font-semibold">
          Jegyzet az edzéshez
        </label>
        <textarea
          id="day-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={2000}
          rows={3}
          placeholder="Hogy ment? Fájdalom, nehézség, megjegyzés…"
          className="w-full rounded-[10px] border border-app-line bg-white p-3 text-base text-app-navy placeholder:text-app-navy/30 focus:border-app-teal focus:outline-none focus:ring-1 focus:ring-app-teal"
        />
        {askEnd && startedAt && (
          <div role="alert" className="space-y-2 rounded-[12px] border border-app-teal/40 bg-app-mint p-3 text-sm text-app-ink">
            <p className="font-semibold">
              {fmtClock(new Date(startedAt))} óta tart az edzés. Mikor fejezted be?
            </p>
            <div className="grid gap-2">
              {lastSet && lastSet.getTime() > new Date(startedAt).getTime() && (
                <button
                  type="button"
                  onClick={() => void finish(lastSet)}
                  className="h-11 rounded-[10px] bg-app-teal px-3 font-semibold text-white"
                >
                  Az utolsó sorozatnál ({fmtClock(lastSet)})
                </button>
              )}
              <button
                type="button"
                onClick={() => void finish(new Date())}
                className="h-11 rounded-[10px] border border-app-line bg-white px-3 font-semibold"
              >
                Most ({fmtClock(new Date())})
              </button>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={() => void finish()}
          disabled={busy}
          className={`h-12 w-full rounded-[12px] text-base font-semibold transition disabled:opacity-50 ${
            done ? 'border border-app-teal text-app-teal' : 'bg-app-teal text-white'
          }`}
        >
          {busy ? 'Mentés…' : done ? 'Jegyzet mentése' : 'Edzés kész'}
        </button>
        {log && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                disabled={deleting}
                className="mx-auto flex min-h-11 items-center gap-1.5 px-3 text-sm font-semibold text-red-700 disabled:opacity-50 dark:text-red-400"
              >
                <Trash2 className="size-4" /> {deleting ? 'Törlés…' : 'Edzés törlése'}
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Törlöd ezt az edzést?</AlertDialogTitle>
                <AlertDialogDescription>
                  A nap összes rögzített sorozata, a kezdés és a lezárás ideje, a nehézség és a jegyzet is törlődik. Ez
                  nem visszavonható. A terv nem változik, a napot újra elvégezheted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Mégsem</AlertDialogCancel>
                <AlertDialogAction onClick={() => void removeWorkout()}>Igen, törlöm</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </section>
    </div>
  );
}
