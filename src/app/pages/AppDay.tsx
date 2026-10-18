import { Fragment, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowDown, Check, ChevronDown, ChevronLeft, ChevronRight, Printer } from 'lucide-react';
import { useSession } from '../components/app/session';
import ExerciseCard from '../components/app/ExerciseCard';
import { groupExercises, isSuperset, setProgress } from '../components/app/plan-utils';

export default function AppDay() {
  const { week, day } = useParams();
  const { plan, logs, completeDay } = useSession();
  const planDay = plan?.days.find((d) => String(d.week) === week && String(d.day) === day);
  const log = planDay ? logs.find((l) => l.plan_day_id === planDay.id) : undefined;

  const [note, setNote] = useState(log?.note ?? '');
  const [busy, setBusy] = useState(false);
  // Szakaszok összecsukása: csak helyi állapot (szakasz sorszáma → zárva)
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});

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

  const finish = async () => {
    setBusy(true);
    try {
      const ok = await completeDay(planDay.id, note.trim() === '' ? null : note.trim());
      if (ok) toast.success(done ? 'Jegyzet frissítve.' : 'Edzés kész, szép munka!');
    } catch {
      toast.error('Nem sikerült menteni. Próbáld újra.');
    } finally {
      setBusy(false);
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
            className="inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-[#D5DDE6] px-3 text-sm font-semibold text-app-navy"
          >
            <Printer className="size-4" /> PDF
          </Link>
        </div>
        <h1 className="mt-1 text-2xl font-bold leading-tight">
          {planDay.title ?? `${planDay.day}. edzés`}
        </h1>
        <p className="mt-1 flex items-center gap-2 text-sm text-[#5B6B7D]">
          {planDay.week}. hét · {planDay.day}. nap
          {done && (
            <span className="inline-flex items-center gap-1 font-semibold text-app-teal">
              <Check className="size-4" /> Kész
            </span>
          )}
        </p>
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
                    <span className="text-xs text-[#5B6B7D]">
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
                      className="overflow-hidden rounded-[14px] border-[1.5px] border-[#0B7566] bg-white"
                    >
                      <div className="flex items-center justify-between gap-3 bg-[#0B7566] px-3 py-2 text-white">
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
                            <div className="flex items-center gap-2 border-t border-dashed border-[#0B7566] bg-[#EAF6F3] px-3 py-2 text-xs font-semibold text-[#0B7566]">
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
                            marker={`${block.label}${i + 1}`}
                            embedded
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
                      />
                    ))
                  ),
                )}
              </div>
            )}
          </section>
        );
      })}

      <section className="space-y-3 border-t border-[#D5DDE6] pt-6">
        <label htmlFor="day-note" className="text-sm font-semibold">
          Jegyzet az edzéshez
        </label>
        <textarea
          id="day-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={2000}
          rows={3}
          placeholder="Hogy ment? Fájdalom, nehézség, megjegyzés…"
          className="w-full rounded-[10px] border border-[#D5DDE6] bg-white p-3 text-base text-app-navy placeholder:text-app-navy/30 focus:border-app-teal focus:outline-none focus:ring-1 focus:ring-app-teal"
        />
        <button
          type="button"
          onClick={finish}
          disabled={busy}
          className={`h-12 w-full rounded-[12px] text-base font-semibold transition disabled:opacity-50 ${
            done ? 'border border-app-teal text-app-teal' : 'bg-app-teal text-white'
          }`}
        >
          {busy ? 'Mentés…' : done ? 'Jegyzet mentése' : 'Edzés kész'}
        </button>
      </section>
    </div>
  );
}
