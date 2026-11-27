import { Link, useLocation, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { useSession } from '../components/app/session';
import ExerciseMedia from '../components/app/ExerciseMedia';
import PrescriptionBar from '../components/app/PrescriptionBar';
import { formatSet, isBodyweight, previousSets, timedSpec } from '../components/app/plan-utils';

export default function AppExercise() {
  const { week, day, dayExerciseId } = useParams();
  const { plan, logs } = useSession();
  // A program-áttekintőből érkezve oda vigyen vissza a vissza-link (és ne az edzésnapra).
  const from = (useLocation().state as { from?: string } | null)?.from;
  const fromProgram = typeof from === 'string' && from.startsWith('/app/program') ? from : null;
  const planDay = plan?.days.find((d) => String(d.week) === week && String(d.day) === day);
  const item = planDay?.exercises.find((e) => e.id === dayExerciseId);

  if (!plan || !planDay || !item) {
    return (
      <div className="space-y-4">
        <Link to="/app" className="inline-flex min-h-11 items-center text-sm text-app-navy/70">
          <ChevronLeft className="size-4" /> Vissza
        </Link>
        <p className="text-sm text-app-navy/70">Ez a gyakorlat nem található.</p>
      </div>
    );
  }

  const prev = [...previousSets(plan, logs, planDay.id, item.exercise.id).values()].sort(
    (a, b) => a.set_number - b.set_number,
  );
  const note = item.note?.trim();
  const technique = item.exercise.technique_note?.trim();
  const sectionTitle = 'text-xs font-semibold uppercase tracking-wider text-app-teal';

  return (
    <div className="space-y-5">
      <div>
        <Link
          to={fromProgram ?? `/app/d/${planDay.week}/${planDay.day}`}
          className="-ml-1 inline-flex min-h-11 items-center pr-3 text-sm text-app-navy/70"
        >
          <ChevronLeft className="size-4" /> {fromProgram ? 'A program' : (planDay.title ?? `${planDay.day}. edzés`)}
        </Link>
        {item.section && <p className={`mt-1 ${sectionTitle}`}>{item.section}</p>}
        <h1 className="mt-1 text-2xl font-bold leading-tight">{item.exercise.name}</h1>
      </div>

      <ExerciseMedia name={item.exercise.name} videoUrl={item.exercise.video_url} imageUrl={item.exercise.image_url} />

      <div className="overflow-hidden rounded-[14px] border border-app-line">
        <PrescriptionBar item={item} />
      </div>

      {note && (
        <section className="space-y-2 rounded-[14px] border border-app-line p-4">
          <h2 className={`flex items-center gap-2 ${sectionTitle}`}>
            <Info className="size-4" /> Edzői megjegyzés
          </h2>
          <p className="text-sm leading-relaxed">{note}</p>
        </section>
      )}

      {technique && (
        <section className="space-y-2 rounded-[14px] border border-app-line p-4">
          <h2 className={sectionTitle}>Technika</h2>
          <p className="whitespace-pre-line text-sm leading-relaxed">{technique}</p>
        </section>
      )}

      {prev.length > 0 && (
        <section className="space-y-2">
          <h2 className={sectionTitle}>Előző alkalom</h2>
          <ul className="flex flex-wrap gap-2">
            {prev.map((s) => (
              <li
                key={s.set_number}
                className="rounded-[10px] border border-app-line px-3 py-1.5 text-sm text-app-muted"
              >
                {s.set_number} · {formatSet(s, { timed: !!timedSpec(item.reps), bodyweight: isBodyweight(item) })}
              </li>
            ))}
          </ul>
        </section>
      )}

      <Link
        to={`/app/haladas/${item.exercise.id}`}
        className="flex min-h-12 items-center justify-between rounded-[14px] border border-app-line px-4 text-sm font-semibold"
      >
        Összes eddigi eredmény ennél a gyakorlatnál
        <ChevronRight className="size-4 text-app-navy/50" />
      </Link>
    </div>
  );
}
