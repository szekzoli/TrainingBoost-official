import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Check, Info, Play } from 'lucide-react';
import type { PlanData, PlanExercise, SetLog, WorkoutLog } from '../../../lib/app-api';
import { getVideoEmbedUrl } from '../../../lib/video';
import PrescriptionBar from './PrescriptionBar';
import { useSession } from './session';
import {
  formatSet,
  isLoggable,
  isSetDone,
  previousSets,
  repsPlaceholder,
  weightPlaceholder,
} from './plan-utils';

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

const inputClass =
  'h-11 w-full rounded-[10px] border border-[#D5DDE6] bg-white px-1 text-center text-base text-app-navy placeholder:text-app-navy/30 focus:border-app-teal focus:outline-none focus:ring-1 focus:ring-app-teal';

function SetRow({
  dayExerciseId,
  setNumber,
  saved,
  prev,
  weightPh,
  repsPh,
}: {
  dayExerciseId: string;
  setNumber: number;
  saved: SetLog | undefined;
  prev: SetLog | undefined;
  weightPh: string;
  repsPh: string;
}) {
  const { logSet } = useSession();
  const [weight, setWeight] = useState(fmtWeight(saved?.weight_kg));
  const [reps, setReps] = useState(saved?.reps?.toString() ?? '');
  const [saving, setSaving] = useState(false);
  const done = isSetDone(saved);

  const restore = () => {
    setWeight(fmtWeight(saved?.weight_kg));
    setReps(saved?.reps?.toString() ?? '');
  };

  /** Mentés; a (null, null) pár a sor visszavonását jelenti (nincs külön RPC). */
  const save = async (w: number | null, r: number | null) => {
    setSaving(true);
    try {
      const ok = await logSet(dayExerciseId, setNumber, w, r);
      if (!ok) restore(); // hozzájárulás nélkül nem mentünk
    } catch {
      restore();
      toast.error('Nem sikerült menteni. Ellenőrizd a kapcsolatot, és próbáld újra.');
    } finally {
      setSaving(false);
    }
  };

  const toggle = async () => {
    if (saving) return;
    if (done) {
      setWeight('');
      setReps('');
      await save(null, null);
      return;
    }
    let w = parseWeight(weight);
    let r = parseReps(reps);
    if (w === 'invalid' || r === 'invalid') {
      toast.error('Érvénytelen érték: súlyhoz szám, ismétléshez egész szám kell.');
      return;
    }
    if (w === null && r === null) {
      // üres sor: az előírás értékével töltjük ki
      w = parseWeight(weightPh) as number | null;
      r = parseReps(repsPh) as number | null;
      if (w === null && r === null) {
        toast.info('Írd be a súlyt vagy az ismétlést.');
        return;
      }
      setWeight(fmtWeight(w));
      setReps(r?.toString() ?? '');
    }
    await save(w, r);
  };

  // Kész sor módosítása: blur-ra mentünk. Nem kész sort csak a pipa ment.
  const commitEdit = async () => {
    if (!done || saving) return;
    const w = parseWeight(weight);
    const r = parseReps(reps);
    if (w === 'invalid' || r === 'invalid') {
      toast.error('Érvénytelen érték: súlyhoz szám, ismétléshez egész szám kell.');
      restore();
      return;
    }
    if (w === saved.weight_kg && r === saved.reps) return;
    await save(w, r);
  };

  return (
    <div
      className={`grid grid-cols-[1.25rem_minmax(0,1fr)_4.25rem_3.75rem_2.75rem] items-center gap-1.5 rounded-[10px] border px-1.5 py-1 ${
        done ? 'border-app-teal/40 bg-[#EAF6F3]' : 'border-transparent'
      }`}
    >
      <span className="text-sm font-semibold text-[#5B6B7D]">{setNumber}</span>
      <span className="text-[11px] leading-tight text-[#5B6B7D]">{prev ? formatSet(prev) : '–'}</span>
      <input
        inputMode="decimal"
        aria-label={`${setNumber}. sorozat súly (kg)`}
        placeholder={weightPh}
        value={weight}
        onChange={(e) => setWeight(e.target.value)}
        onBlur={commitEdit}
        className={inputClass}
      />
      <input
        inputMode="numeric"
        aria-label={`${setNumber}. sorozat ismétlés`}
        placeholder={repsPh}
        value={reps}
        onChange={(e) => setReps(e.target.value)}
        onBlur={commitEdit}
        className={inputClass}
      />
      <button
        type="button"
        onClick={toggle}
        disabled={saving}
        aria-pressed={done}
        aria-label={done ? `${setNumber}. sorozat kész, visszavonás` : `${setNumber}. sorozat kész`}
        className={`flex size-11 items-center justify-center rounded-[10px] border transition disabled:opacity-50 ${
          done ? 'border-app-teal bg-app-teal text-white' : 'border-[#D5DDE6] bg-white text-app-navy/30'
        }`}
      >
        <Check className="size-5" strokeWidth={3} />
      </button>
    </div>
  );
}

export default function ExerciseCard({
  item,
  planDayId,
  plan,
  logs,
  detailsHref,
  marker,
  embedded = false,
}: {
  item: PlanExercise;
  planDayId: string;
  plan: PlanData;
  logs: WorkoutLog[];
  detailsHref: string;
  /** Szuperszett jelölő (A1, A2…), a gyakorlat neve előtt. */
  marker?: string;
  /** Szuperszett-csoporton belül: nincs saját keret és sugár, a csoport közös kerete veszi körül. */
  embedded?: boolean;
}) {
  const currentLog = logs.find((l) => l.plan_day_id === planDayId);
  const prev = previousSets(plan, logs, planDayId, item.exercise.id);
  const hasVideo = getVideoEmbedUrl(item.exercise.video_url) !== null;
  const hasDetails = hasVideo || !!item.note?.trim() || !!item.exercise.technique_note?.trim();
  const weightPh = weightPlaceholder(item.resistance);
  const repsPh = repsPlaceholder(item.reps);

  return (
    <article className={embedded ? 'bg-white' : 'overflow-hidden rounded-[14px] border border-[#D5DDE6] bg-white'}>
      <div className="flex items-center gap-3 px-3 py-3">
        {hasVideo && (
          <Link
            to={detailsHref}
            aria-label={`${item.exercise.name} videó`}
            className="flex size-[52px] shrink-0 items-center justify-center rounded-[10px] border border-app-teal/40 bg-[#EAF6F3] text-app-teal"
          >
            <Play className="size-5 fill-current" />
          </Link>
        )}
        {marker && (
          <span className="flex size-[30px] shrink-0 items-center justify-center rounded-lg border border-[#0B7566] text-sm font-bold text-[#0B7566]">
            {marker}
          </span>
        )}
        <h3 className="min-w-0 flex-1 text-base font-semibold leading-snug">{item.exercise.name}</h3>
        {hasDetails && (
          <Link
            to={detailsHref}
            aria-label={`${item.exercise.name} részletei`}
            className="-mr-1 flex size-11 shrink-0 items-center justify-center rounded-[10px] text-app-navy/60"
          >
            <Info className="size-5" />
          </Link>
        )}
      </div>

      <PrescriptionBar item={item} />

      {isLoggable(item) && (
        <div className="space-y-1 px-3 py-3">
          <div className="grid grid-cols-[1.25rem_minmax(0,1fr)_4.25rem_3.75rem_2.75rem] gap-1.5 px-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#5B6B7D]">
            <span>Sor</span>
            <span>Előző</span>
            <span className="text-center">Kg</span>
            <span className="text-center">Ism.</span>
            <span className="text-center">✓</span>
          </div>
          {Array.from({ length: item.sets }, (_, i) => i + 1).map((n) => (
            <SetRow
              key={n}
              dayExerciseId={item.id}
              setNumber={n}
              saved={currentLog?.sets.find((s) => s.day_exercise_id === item.id && s.set_number === n)}
              prev={prev.get(n)}
              weightPh={weightPh}
              repsPh={repsPh}
            />
          ))}
        </div>
      )}
    </article>
  );
}
