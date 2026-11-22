import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Check, History, Info, Play, TrendingUp } from 'lucide-react';
import type { PlanData, PlanExercise, SetLog, WorkoutLog } from '../../../lib/app-api';
import { getVideoEmbedUrl } from '../../../lib/video';
import PrescriptionBar from './PrescriptionBar';
import { useRestTimer } from './RestTimer';
import { usePrefs } from './prefs';
import { useSession } from './session';
import {
  bestWeight,
  formatSet,
  progressionTip,
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

/**
 * Automatikus továbblépés: egy sorozat kipipálása után a következő, még nem kész sorozat sorát a képernyő
 * közepére görgeti, és egy pillanatra kiemeli. A sorrend: blokkonként (szuperszett vagy egy gyakorlat),
 * azon belül körönként (sorozatszám), azon belül a gyakorlatok sorrendjében. Így szuperszettnél A1 → A2 → A1…
 * Billentyűzetet nem nyit (fókusz nélkül), hogy a pihenő-számláló látható maradjon.
 */
/** A sorozat-sorok edzési sorrendben: blokk, sorozatszám, majd a szuperszetten belüli helyük szerint. */
function orderedSetRows(): HTMLElement[] {
  const rows = Array.from(document.querySelectorAll<HTMLElement>('[data-set-row]'));
  const groupOrder = new Map<string, number>();
  const posInGroup = new Map<string, number>();
  for (const r of rows) {
    const g = r.dataset.group!;
    if (!groupOrder.has(g)) groupOrder.set(g, groupOrder.size);
    const key = `${g}|${r.dataset.ex}`;
    if (!posInGroup.has(key)) posInGroup.set(key, [...posInGroup.keys()].filter((k) => k.startsWith(`${g}|`)).length);
  }
  const rank = (r: HTMLElement) => [
    groupOrder.get(r.dataset.group!)!,
    Number(r.dataset.set),
    posInGroup.get(`${r.dataset.group}|${r.dataset.ex}`)!,
  ];
  const cmp = (a: number[], b: number[]) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
  return [...rows].sort((a, b) => cmp(rank(a), rank(b)));
}

function goToNextSet(current: HTMLElement) {
  const sorted = orderedSetRows();
  const i = sorted.indexOf(current);
  const next = sorted.slice(i + 1).find((r) => r.dataset.done !== 'true');
  if (!next) return;
  next.scrollIntoView({ behavior: 'smooth', block: 'center' });
  next.classList.add('ring-2', 'ring-app-teal');
  window.setTimeout(() => next.classList.remove('ring-2', 'ring-app-teal'), 1600);
}

/** Szuperszett/kör közepe: a következő sor ugyanannak a blokknak ugyanabban a körében van (ilyenkor nincs pihenő). */
function isMidRound(current: HTMLElement): boolean {
  const sorted = orderedSetRows();
  const next = sorted[sorted.indexOf(current) + 1];
  return !!next && next.dataset.group === current.dataset.group && next.dataset.set === current.dataset.set;
}

const inputClass =
  'h-11 w-full rounded-[10px] border border-app-line bg-white px-1 text-center text-base text-app-navy placeholder:text-app-navy/30 focus:border-app-teal focus:outline-none focus:ring-1 focus:ring-app-teal';

function SetRow({
  dayExerciseId,
  setNumber,
  saved,
  prev,
  weightPh,
  repsPh,
  restSeconds,
  exerciseName,
  bestBefore,
  groupKey,
  fillTick,
}: {
  groupKey: string;
  /** A „Mint múltkor” gomb jelzése: ha nő, az üres, nem kész sort kitöltjük az előző heti értékkel. */
  fillTick: number;
  dayExerciseId: string;
  setNumber: number;
  saved: SetLog | undefined;
  prev: SetLog | undefined;
  weightPh: string;
  repsPh: string;
  restSeconds: number | null;
  exerciseName: string;
  /** Az eddigi legnagyobb súly ennél a gyakorlatnál (ezt a sorozatot nem számítva). */
  bestBefore: number | null;
}) {
  const { logSet } = useSession();
  const timer = useRestTimer();
  const { defaultRest } = usePrefs();
  const [weight, setWeight] = useState(fmtWeight(saved?.weight_kg));
  const [reps, setReps] = useState(saved?.reps?.toString() ?? '');
  const [saving, setSaving] = useState(false);
  const done = isSetDone(saved);

  useEffect(() => {
    if (fillTick === 0 || done || !prev || weight !== '' || reps !== '') return;
    setWeight(fmtWeight(prev.weight_kg));
    setReps(prev.reps?.toString() ?? '');
    // csak a jelzésre reagálunk
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fillTick]);

  const restore = () => {
    setWeight(fmtWeight(saved?.weight_kg));
    setReps(saved?.reps?.toString() ?? '');
  };

  /** Mentés; a (null, null) pár a sor visszavonását jelenti (nincs külön RPC). */
  const save = async (w: number | null, r: number | null, startRest = false, rowEl?: HTMLElement | null) => {
    setSaving(true);
    try {
      const ok = await logSet(dayExerciseId, setNumber, w, r);
      if (!ok) restore(); // hozzájárulás nélkül nem mentünk
      else {
        if (startRest && restSeconds) timer.start(restSeconds, `${exerciseName}, ${setNumber}. sorozat után`);
        // Ha az edző nem adott meg pihenőt: az ügyfél saját alapértéke (szuperszett közepén nincs pihenő)
        else if (startRest && defaultRest > 0 && !(rowEl && isMidRound(rowEl)))
          timer.start(defaultRest, `${exerciseName}, ${setNumber}. sorozat után`);
        if (startRest && rowEl) window.setTimeout(() => goToNextSet(rowEl), 150);
        // Új egyéni rekord: nagyobb súly, mint eddig bármikor (és volt már korábbi súly)
        if (w !== null && bestBefore !== null && w > bestBefore) {
          toast.success(`Új rekord: ${fmtWeight(w)} kg! 💪`, { description: exerciseName });
        }
      }
    } catch {
      restore();
      toast.error('Nem sikerült menteni. Ellenőrizd a kapcsolatot, és próbáld újra.');
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (e: React.MouseEvent<HTMLButtonElement>) => {
    const rowEl = e.currentTarget.closest<HTMLElement>('[data-set-row]');
    if (saving) return;
    if (done) {
      setWeight('');
      setReps('');
      timer.stop();
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
    await save(w, r, true, rowEl);
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
      data-set-row
      data-group={groupKey}
      data-ex={dayExerciseId}
      data-set={setNumber}
      data-done={done ? 'true' : 'false'}
      className={`grid grid-cols-[1.25rem_minmax(0,1fr)_4.25rem_3.75rem_2.75rem] items-center gap-1.5 rounded-[10px] border px-1.5 py-1 transition-shadow ${
        done ? 'border-app-teal/40 bg-app-mint' : 'border-transparent'
      }`}
    >
      <span className="text-sm font-semibold text-app-muted">{setNumber}</span>
      {prev && !done ? (
        <button
          type="button"
          onClick={() => {
            setWeight(fmtWeight(prev.weight_kg));
            setReps(prev.reps?.toString() ?? '');
          }}
          aria-label={`${setNumber}. sorozat kitöltése a múltkori értékkel: ${formatSet(prev)}`}
          className="-my-1 min-h-11 rounded-md text-left text-[11px] leading-tight text-app-muted underline decoration-dotted underline-offset-2"
        >
          {formatSet(prev)}
        </button>
      ) : (
        <span className="text-[11px] leading-tight text-app-muted">{prev ? formatSet(prev) : '–'}</span>
      )}
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
          done ? 'border-app-teal bg-app-teal text-white' : 'border-app-line bg-white text-app-navy/30'
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
  groupKey,
}: {
  /** A blokk azonosítója (szuperszettnél közös), az automatikus továbblépés sorrendjéhez. */
  groupKey?: string;
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
  const image = item.exercise.image_url?.trim() || null;
  const [imageOk, setImageOk] = useState(true);
  const hasDetails = hasVideo || !!image || !!item.note?.trim() || !!item.exercise.technique_note?.trim();
  const tip = progressionTip(item, prev);
  // Ha legutóbb megvolt minden sorozat a felső ismétlésszámmal, a súly javaslata a megemelt érték
  const weightPh = tip ? fmtWeight(tip.to) : weightPlaceholder(item.resistance);
  const repsPh = repsPlaceholder(item.reps);
  const [fillTick, setFillTick] = useState(0);
  const hasPrev = prev.size > 0;
  const openSets = Array.from({ length: item.sets }, (_, i) => i + 1).filter(
    (n) => !isSetDone(currentLog?.sets.find((s) => s.day_exercise_id === item.id && s.set_number === n)),
  );

  return (
    <article className={embedded ? 'bg-white' : 'overflow-hidden rounded-[14px] border border-app-line bg-white'}>
      <div className="flex items-center gap-3 px-3 py-3">
        {image && imageOk ? (
          <Link
            to={detailsHref}
            aria-label={`${item.exercise.name} ${hasVideo ? 'videó' : 'kép'}`}
            className="relative block size-[52px] shrink-0 overflow-hidden rounded-[10px] border border-app-line bg-app-mint"
          >
            <img
              src={image}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setImageOk(false)}
              className="size-full object-cover"
            />
            {hasVideo && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/25 text-white">
                <Play className="size-5 fill-current" />
              </span>
            )}
          </Link>
        ) : (
          hasVideo && (
            <Link
              to={detailsHref}
              aria-label={`${item.exercise.name} videó`}
              className="flex size-[52px] shrink-0 items-center justify-center rounded-[10px] border border-app-teal/40 bg-app-mint text-app-teal"
            >
              <Play className="size-5 fill-current" />
            </Link>
          )
        )}
        {marker && (
          <span className="flex size-[30px] shrink-0 items-center justify-center rounded-lg border border-app-ink text-sm font-bold text-app-ink">
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

      {isLoggable(item) && tip && (
        <p className="mx-3 mt-3 flex items-start gap-2 rounded-[10px] border border-app-teal/40 bg-app-mint px-3 py-2 text-xs text-app-ink">
          <TrendingUp className="mt-0.5 size-4 shrink-0" />
          <span>
            Múltkor minden sorozat megvolt a felső ismétlésszámmal ({fmtWeight(tip.from)} kg). Próbáld meg{' '}
            <strong>{fmtWeight(tip.to)} kg</strong>-mal, ha a technika rendben van.
          </span>
        </p>
      )}

      {isLoggable(item) && (
        <div className="space-y-1 px-3 py-3">
          {hasPrev && openSets.length > 0 && (
            <div className="flex justify-end pb-1">
              <button
                type="button"
                onClick={() => setFillTick((t) => t + 1)}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-app-line px-3 text-xs font-semibold text-app-navy active:bg-app-navy/5"
              >
                <History className="size-3.5" /> Mint múltkor
              </button>
            </div>
          )}
          <div className="grid grid-cols-[1.25rem_minmax(0,1fr)_4.25rem_3.75rem_2.75rem] gap-1.5 px-1.5 text-[10px] font-semibold uppercase tracking-wider text-app-muted">
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
              restSeconds={item.rest_seconds}
              exerciseName={item.exercise.name}
              bestBefore={bestWeight(plan, logs, item.exercise.id, { dayExerciseId: item.id, setNumber: n })}
              groupKey={groupKey ?? item.id}
              fillTick={fillTick}
            />
          ))}
        </div>
      )}
    </article>
  );
}
