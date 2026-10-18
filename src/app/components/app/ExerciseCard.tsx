import { useState } from 'react';
import { toast } from 'sonner';
import { ChevronDown, Play } from 'lucide-react';
import type { PlanData, PlanExercise, SetLog, WorkoutLog } from '../../../lib/app-api';
import { getVideoEmbedUrl } from '../../../lib/video';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { useSession } from './session';
import { previousSets } from './plan-utils';

const fmtWeight = (n: number | null | undefined) =>
  n === null || n === undefined ? '' : String(n).replace('.', ',');

function parseWeight(s: string): number | null | 'invalid' {
  const t = s.trim().replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 && n < 10000 ? n : 'invalid';
}

function parseReps(s: string): number | null | 'invalid' {
  const t = s.trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isInteger(n) && n >= 0 && n <= 1000 ? n : 'invalid';
}

function SetRow({
  dayExerciseId,
  setNumber,
  saved,
  prev,
}: {
  dayExerciseId: string;
  setNumber: number;
  saved: SetLog | undefined;
  prev: SetLog | undefined;
}) {
  const { logSet } = useSession();
  const [weight, setWeight] = useState(fmtWeight(saved?.weight_kg));
  const [reps, setReps] = useState(saved?.reps?.toString() ?? '');
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>(saved ? 'saved' : 'idle');

  const commit = async () => {
    const w = parseWeight(weight);
    const r = parseReps(reps);
    if (w === 'invalid' || r === 'invalid') {
      toast.error('Érvénytelen érték: súlyhoz szám, ismétléshez egész szám kell.');
      return;
    }
    if (w === (saved?.weight_kg ?? null) && r === (saved?.reps ?? null)) return;
    if (!saved && w === null && r === null) return;

    setState('saving');
    try {
      const ok = await logSet(dayExerciseId, setNumber, w, r);
      if (ok) {
        setState('saved');
      } else {
        // hozzájárulás nélkül nem mentünk: visszaállítjuk az utolsó mentett értéket
        setWeight(fmtWeight(saved?.weight_kg));
        setReps(saved?.reps?.toString() ?? '');
        setState(saved ? 'saved' : 'idle');
      }
    } catch {
      setState('idle');
      toast.error('Nem sikerült menteni. Ellenőrizd a kapcsolatot, és próbáld újra.');
    }
  };

  const inputClass =
    'h-11 w-full rounded-md border border-app-navy/25 bg-white px-3 text-base text-app-navy placeholder:text-app-navy/30 focus:border-app-teal focus:outline-none focus:ring-1 focus:ring-app-teal';

  return (
    <div className="grid grid-cols-[2.5rem_1fr_1fr_1.25rem] items-center gap-2">
      <span className="text-sm text-app-navy/60">{setNumber}.</span>
      <input
        inputMode="decimal"
        aria-label={`${setNumber}. szet súly (kg)`}
        placeholder={prev?.weight_kg != null ? `${fmtWeight(prev.weight_kg)}` : 'kg'}
        value={weight}
        onChange={(e) => {
          setWeight(e.target.value);
          setState('idle');
        }}
        onBlur={commit}
        className={inputClass}
      />
      <input
        inputMode="numeric"
        aria-label={`${setNumber}. szet ismétlés`}
        placeholder={prev?.reps != null ? `${prev.reps}` : 'ism.'}
        value={reps}
        onChange={(e) => {
          setReps(e.target.value);
          setState('idle');
        }}
        onBlur={commit}
        className={inputClass}
      />
      <span className="text-xs text-app-teal" aria-live="polite">
        {state === 'saved' ? '✓' : state === 'saving' ? '…' : ''}
      </span>
    </div>
  );
}

export default function ExerciseCard({
  item,
  planDayId,
  plan,
  logs,
}: {
  item: PlanExercise;
  planDayId: string;
  plan: PlanData;
  logs: WorkoutLog[];
}) {
  const [videoOpen, setVideoOpen] = useState(false);
  const embed = getVideoEmbedUrl(item.exercise.video_url);
  const currentLog = logs.find((l) => l.plan_day_id === planDayId);
  const prev = previousSets(plan, logs, planDayId, item.exercise.id);
  // Pl. a nyújtás ("–") nem naplózható szetekből áll
  const loggable = /[\p{L}\d]/u.test(item.reps);

  return (
    <article className="border border-app-navy/15 bg-white p-4">
      <h3 className="text-base font-semibold leading-snug">{item.exercise.name}</h3>
      <p className="mt-1 text-sm text-app-navy/70">
        {item.sets} × {item.reps}
        {item.rest_seconds ? ` · pihenő ${item.rest_seconds} mp` : ''}
      </p>
      {item.note && <p className="mt-2 text-sm leading-relaxed text-app-navy/80">{item.note}</p>}
      {item.exercise.technique_note && (
        <p className="mt-2 text-sm leading-relaxed text-app-navy/60">{item.exercise.technique_note}</p>
      )}

      {embed && (
        <Collapsible open={videoOpen} onOpenChange={setVideoOpen} className="mt-3">
          <CollapsibleTrigger className="flex h-10 items-center gap-2 text-sm font-semibold text-app-teal">
            <Play className="size-4" /> Videó
            <ChevronDown className={`size-4 transition-transform ${videoOpen ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 aspect-video w-full overflow-hidden border border-app-navy/15">
              {/* Csak nyitáskor töltődik be. A YouTube a beágyazáshoz kér origin-referrert; teljes URL nem megy ki. */}
              <iframe
                src={embed}
                title={`${item.exercise.name} videó`}
                className="size-full"
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                allow="encrypted-media; picture-in-picture"
                allowFullScreen
              />
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {loggable && (
        <div className="mt-3 space-y-2">
          {Array.from({ length: item.sets }, (_, i) => i + 1).map((n) => (
            <SetRow
              key={n}
              dayExerciseId={item.id}
              setNumber={n}
              saved={currentLog?.sets.find((s) => s.day_exercise_id === item.id && s.set_number === n)}
              prev={prev.get(n)}
            />
          ))}
          {prev.size > 0 && (
            <p className="text-xs text-app-navy/50">A halvány értékek az előző alkalomról valók.</p>
          )}
        </div>
      )}
    </article>
  );
}
