import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Check, ChevronLeft } from 'lucide-react';
import { useSession } from '../components/app/session';
import ExerciseCard from '../components/app/ExerciseCard';
import { groupExercises } from '../components/app/plan-utils';

export default function AppDay() {
  const { week, day } = useParams();
  const { plan, logs, completeDay } = useSession();
  const planDay = plan?.days.find((d) => String(d.week) === week && String(d.day) === day);
  const log = planDay ? logs.find((l) => l.plan_day_id === planDay.id) : undefined;

  const [note, setNote] = useState(log?.note ?? '');
  const [busy, setBusy] = useState(false);

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
        <Link to={`/app/w/${planDay.week}`} className="inline-flex items-center text-sm text-app-navy/70">
          <ChevronLeft className="size-4" /> {planDay.week}. hét
        </Link>
        <h1 className="mt-2 text-2xl font-bold leading-tight">
          {planDay.title ?? `${planDay.day}. edzés`}
        </h1>
        <p className="mt-1 flex items-center gap-2 text-sm text-app-navy/60">
          {planDay.week}. hét · {planDay.day}. nap
          {done && (
            <span className="inline-flex items-center gap-1 font-semibold text-app-teal">
              <Check className="size-4" /> Kész
            </span>
          )}
        </p>
      </div>

      {sections.map((sec, si) => (
        <section key={`${sec.name}-${si}`} className="space-y-3">
          {sec.name && (
            <h2 className="text-xs font-semibold uppercase tracking-wider text-app-teal">{sec.name}</h2>
          )}
          {sec.blocks.map((block) =>
            block.label ? (
              <div key={block.items[0].id} className="space-y-3 border-l-2 border-app-teal pl-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-app-navy/60">
                  Szuperszett {block.label}
                </p>
                {block.items.map((it) => (
                  <ExerciseCard key={it.id} item={it} planDayId={planDay.id} plan={plan} logs={logs} />
                ))}
              </div>
            ) : (
              <ExerciseCard
                key={block.items[0].id}
                item={block.items[0]}
                planDayId={planDay.id}
                plan={plan}
                logs={logs}
              />
            ),
          )}
        </section>
      ))}

      <section className="space-y-3 border-t border-app-navy/15 pt-6">
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
          className="w-full rounded-md border border-app-navy/25 bg-white p-3 text-base text-app-navy placeholder:text-app-navy/30 focus:border-app-teal focus:outline-none focus:ring-1 focus:ring-app-teal"
        />
        <button
          type="button"
          onClick={finish}
          disabled={busy}
          className={`h-12 w-full rounded-lg text-base font-semibold transition disabled:opacity-50 ${
            done ? 'border border-app-teal text-app-teal' : 'bg-app-teal text-white'
          }`}
        >
          {busy ? 'Mentés…' : done ? 'Jegyzet mentése' : 'Edzés kész'}
        </button>
      </section>
    </div>
  );
}
