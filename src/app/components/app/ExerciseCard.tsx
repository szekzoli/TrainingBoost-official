import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Check, History, Info, Play } from 'lucide-react';
import type { PlanData, PlanExercise, SetLog, WorkoutLog } from '../../../lib/app-api';
import { getVideoEmbedUrl } from '../../../lib/video';
import PrescriptionBar from './PrescriptionBar';
import { useRestTimer } from './RestTimer';
import { usePrefs } from './prefs';
import { useSession } from './session';
import { todayIso } from './dates';
import {
  bestWeight,
  expectsWeight,
  formatSet,
  isBodyweight,
  isFlagged,
  isLoggable,
  isSetDone,
  previousSets,
  repsPlaceholder,
  timedSpec,
  weightPlaceholder,
  type TimedSpec,
} from './plan-utils';

const fmtWeight = (n: number | null | undefined) =>
  n === null || n === undefined ? '' : String(n).replace('.', ',');

/** Súly: üres = null. Saját testsúlynál negatív is lehet (segítség, pl. −20). */
function parseWeight(s: string, allowNegative = false): number | null | 'invalid' {
  const t = s.trim().replace(',', '.').replace('−', '-').replace(/^\+/, '');
  if (t === '') return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n >= 10000) return 'invalid';
  if (n < 0 && !(allowNegative && n > -500)) return 'invalid';
  return n;
}

function parseReps(s: string): number | null | 'invalid' {
  const t = s.trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isInteger(n) && n >= 0 && n <= 10000 ? n : 'invalid';
}

function parseHr(s: string): number | null | 'invalid' {
  const t = s.trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isInteger(n) && n >= 30 && n <= 250 ? n : 'invalid';
}

/** Gyors címkék a sorozat-megjegyzéshez. */
const NOTE_TAGS = ['nem szabályos', 'segítséggel', 'fájt'];

/** Címke be/ki a megjegyzés szövegében (vesszővel elválasztva). */
function toggleTag(note: string, tag: string): string {
  const parts = note
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  const has = parts.some((p) => p.toLowerCase() === tag);
  const next = has ? parts.filter((p) => p.toLowerCase() !== tag) : [...parts, tag];
  return next.join(', ');
}

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

/**
 * Automatikus továbblépés: egy sorozat kipipálása után a következő, még nem kész sorozat sorát a képernyő
 * közepére görgeti, és egy pillanatra kiemeli. Szuperszettnél A1 → A2 → A1… Billentyűzetet nem nyit.
 */
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

const inputBase =
  'h-11 w-full rounded-[10px] border bg-white px-1 text-center text-base text-app-navy placeholder:text-app-navy/30 focus:border-app-teal focus:outline-none focus:ring-1 focus:ring-app-teal';
const inputClass = (missing: boolean) => `${inputBase} ${missing ? 'border-red-500 ring-1 ring-red-500' : 'border-app-line'}`;

/** A gyakorlat egészére érvényes beállítások (minden sorozat-sor ugyanazt kapja). */
type RowConfig = {
  dayExerciseId: string;
  exerciseName: string;
  restSeconds: number | null;
  groupKey: string;
  /** Az edzésnap linkje ehhez a sorhoz (a számláló-sávról ide visz vissza). */
  href: string;
  timed: TimedSpec | null;
  bodyweight: boolean;
  expectsWeight: boolean;
  showHr: boolean;
  /** Az előírásból (vagy a súlyemelési javaslatból) számolt szürke érték; üres, ha a terv nem ad meg. */
  planWeight: string;
  planReps: string;
  grid: string;
  /** Az első rögzített sorozatnál hívódik (az edzés kezdési idejéhez). */
  onLogged: () => void;
};

function SetRow({
  cfg,
  setNumber,
  saved,
  prev,
  prevToday,
  bestBefore,
  fillTick,
  prevDone,
  nextDone,
}: {
  cfg: RowConfig;
  setNumber: number;
  /** Az előző sorozat kész-e (az elsőnél mindig igaz): csak sorban lehet kipipálni, lyuk nélkül. */
  prevDone: boolean;
  /** A következő sorozat kész-e: ilyenkor ez a sor nem vonható vissza (különben lyuk maradna). */
  nextDone: boolean;
  saved: SetLog | undefined;
  /** A múltkori alkalom ugyanezen sorozata. */
  prev: SetLog | undefined;
  /** Az aznapi előző sorozat (ugyanennél a gyakorlatnál), ha kész. */
  prevToday: SetLog | undefined;
  /** Az eddigi legnagyobb súly ennél a gyakorlatnál (ezt a sorozatot nem számítva). */
  bestBefore: number | null;
  /** A „Mint múltkor” gomb jelzése: ha nő, az üres, nem kész sort kitöltjük az előző heti értékkel. */
  fillTick: number;
}) {
  const { logSet } = useSession();
  const timer = useRestTimer();
  const { defaultRest } = usePrefs();
  const [weight, setWeight] = useState(fmtWeight(saved?.weight_kg));
  const [reps, setReps] = useState(saved?.reps?.toString() ?? '');
  const [hr, setHr] = useState(saved?.heart_rate?.toString() ?? '');
  const [note, setNote] = useState(saved?.note ?? '');
  const [noteOpen, setNoteOpen] = useState(false);
  const [missing, setMissing] = useState<{ w?: boolean; r?: boolean }>({});
  const [askNoWeight, setAskNoWeight] = useState(false);
  const [saving, setSaving] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);
  const weightRef = useRef<HTMLInputElement>(null);
  const repsRef = useRef<HTMLInputElement>(null);
  const done = isSetDone(saved);
  const fmtOpts = { timed: !!cfg.timed, bodyweight: cfg.bodyweight };

  // Szürke érték: a terv szerinti, ha van; különben az aznapi előző sorozat; különben a múltkori.
  const fallback = prevToday ?? prev;
  const weightPh =
    cfg.planWeight ||
    (fallback && fallback.weight_kg !== null ? fmtWeight(fallback.weight_kg) : '') ||
    (cfg.bodyweight ? 'TS' : '');
  const repsPh = cfg.planReps || (fallback?.reps != null ? String(fallback.reps) : '');

  useEffect(() => {
    if (fillTick === 0 || done || !prev || weight !== '' || reps !== '') return;
    setWeight(fmtWeight(prev.weight_kg));
    setReps(prev.reps?.toString() ?? '');
    // csak a jelzésre reagálunk
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fillTick]);

  // Ha a szerverről frissül a mentett sor (pl. szinkron után), a mezők kövessék
  useEffect(() => {
    if (!saved) return;
    setNote(saved.note ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved?.note]);

  const restore = () => {
    setWeight(fmtWeight(saved?.weight_kg));
    setReps(saved?.reps?.toString() ?? '');
    setHr(saved?.heart_rate?.toString() ?? '');
  };

  /** Mentés; a (null, null) pár a sor visszavonását jelenti (nincs külön RPC). */
  const save = async (
    w: number | null,
    r: number | null,
    opts: { startRest?: boolean; hr?: number | null; note?: string } = {},
  ) => {
    const rowEl = rowRef.current;
    const n = (opts.note ?? note).trim();
    setSaving(true);
    try {
      const ok = await logSet(cfg.dayExerciseId, setNumber, w, r, {
        // Visszavonáskor a megjegyzés megmarad (újra kipipálva is ott lesz)
        note: n === '' ? null : n,
        hr: w === null && r === null ? null : (opts.hr ?? null),
      });
      if (!ok) {
        restore(); // hozzájárulás nélkül nem mentünk
        return;
      }
      if (w !== null || r !== null) cfg.onLogged();
      if (opts.startRest) {
        // Szuperszett / kör közepén nincs pihenő: azonnal jön a következő gyakorlat
        const mid = rowEl ? isMidRound(rowEl) : false;
        const rest = cfg.restSeconds || defaultRest;
        if (!mid && rest > 0) timer.start(rest, `${cfg.exerciseName}, ${setNumber}. sorozat után`, cfg.href);
        if (rowEl) window.setTimeout(() => goToNextSet(rowEl), 150);
      }
      // Új egyéni rekord: nagyobb súly, mint eddig bármikor (és volt már korábbi súly); a nem szabályos nem számít
      if (opts.startRest && w !== null && bestBefore !== null && w > bestBefore && !/nem szabályos/i.test(n)) {
        toast.success(`Új rekord: ${fmtWeight(w)} kg! 💪`, { description: cfg.exerciseName });
      }
    } catch {
      restore();
      toast.error('Nem sikerült menteni. Ellenőrizd a kapcsolatot, és próbáld újra.');
    } finally {
      setSaving(false);
    }
  };

  /** A beírt értékek, üres mezőnél a szürke érték. */
  const read = () => {
    let w = parseWeight(weight, cfg.bodyweight);
    let r = parseReps(reps);
    const h = cfg.showHr ? parseHr(hr) : null;
    if (w === null && weightPh && weightPh !== 'TS') w = parseWeight(weightPh, cfg.bodyweight);
    if (r === null && repsPh) r = parseReps(repsPh);
    return { w, r, h };
  };

  const invalidMsg = () =>
    toast.error(
      `Érvénytelen érték: súlyhoz szám${cfg.bodyweight ? ' (segítséghez negatív, pl. −20)' : ''}, ${
        cfg.timed ? 'időhöz másodperc' : 'ismétléshez egész szám'
      }${cfg.showHr ? ', pulzushoz 30–250' : ''} kell.`,
    );

  /** Sorrend: az előző sorozat nélkül ez nem pipálható ki. */
  const outOfOrder = () => {
    if (prevDone) return false;
    toast.info(`Előbb a ${setNumber - 1}. sorozatot pipáld ki.`);
    return true;
  };

  const check = async (skipWeightCheck = false) => {
    if (saving || outOfOrder()) return;
    const { w, r, h } = read();
    if (w === 'invalid' || r === 'invalid' || h === 'invalid') {
      invalidMsg();
      return;
    }
    if (r === null) {
      setMissing({ r: true });
      toast.info(cfg.timed ? 'Írd be az időt (mp), vagy indítsd a ▶ gombbal.' : 'Írd be az ismétlést.');
      repsRef.current?.focus();
      return;
    }
    if (w === null && cfg.expectsWeight && !skipWeightCheck) {
      setMissing({ w: true });
      setAskNoWeight(true);
      return;
    }
    setMissing({});
    setAskNoWeight(false);
    setWeight(fmtWeight(w));
    setReps(String(r));
    await save(w, r, { startRest: true, hr: h });
  };

  const toggle = async () => {
    if (saving) return;
    if (done) {
      if (nextDone) {
        toast.info(`Előbb a ${setNumber + 1}. sorozatot vond vissza.`);
        return;
      }
      setWeight('');
      setReps('');
      timer.stop();
      await save(null, null);
      return;
    }
    await check();
  };

  /** Időre menő sorozat indítása: a számláló végén magától mentődik. */
  const startTimed = () => {
    if (!cfg.timed || saving || outOfOrder()) return;
    const w = parseWeight(weight, cfg.bodyweight);
    if (w === 'invalid') {
      invalidMsg();
      return;
    }
    const h = cfg.showHr ? parseHr(hr) : null;
    setMissing({});
    timer.startWork({
      label: cfg.exerciseName,
      phases: cfg.timed.phases,
      switchLabel: cfg.timed.sided ? 'Oldalváltás' : 'Átállás',
      href: cfg.href,
      onDone: (sec) => {
        setReps(String(sec));
        void save(w, sec, { startRest: true, hr: h === 'invalid' ? null : h });
      },
    });
  };

  // Kész sor módosítása: blur-ra mentünk. Nem kész sort csak a pipa ment.
  // Ha kitörölt egy kötelező értéket, a sor visszaváltozik nem késszé, és pirosan jelzi, mi hiányzik.
  const commitEdit = async (nextNote?: string) => {
    if (!done || saving) return;
    const w = parseWeight(weight, cfg.bodyweight);
    const r = parseReps(reps);
    const h = cfg.showHr ? parseHr(hr) : (saved.heart_rate ?? null);
    if (w === 'invalid' || r === 'invalid' || h === 'invalid') {
      invalidMsg();
      restore();
      return;
    }
    const weightCleared = w === null && saved.weight_kg !== null && cfg.expectsWeight;
    if ((r === null || weightCleared) && nextDone) {
      // Kitörölt érték egy közbülső sorozatnál: nem vonjuk vissza, mert lyuk maradna
      restore();
      toast.info('Kész sorozat közbülső értéke nem lehet üres. Írd át, vagy előbb a későbbi sorozatokat vond vissza.');
      return;
    }
    if (r === null || weightCleared) {
      setMissing({ r: r === null, w: weightCleared });
      timer.stop();
      await save(null, null);
      toast.info(r === null ? 'Az ismétlés üres, a sorozat nincs kész.' : 'A súly üres, a sorozat nincs kész.');
      return;
    }
    const n = nextNote ?? note;
    if (w === saved.weight_kg && r === saved.reps && h === (saved.heart_rate ?? null) && n.trim() === (saved.note ?? '').trim())
      return;
    await save(w, r, { hr: h, note: n });
  };

  const valueChanged = (set: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    set(e.target.value);
    if (missing.w || missing.r) setMissing({});
    if (askNoWeight) setAskNoWeight(false);
  };

  const showPlay = !!cfg.timed && !done && reps.trim() === '';
  const hasNote = note.trim() !== '';

  return (
    <div>
      <div
        ref={rowRef}
        data-set-row
        data-group={cfg.groupKey}
        data-ex={cfg.dayExerciseId}
        data-set={setNumber}
        data-done={done ? 'true' : 'false'}
        className={`grid items-center gap-1.5 rounded-[10px] border px-1.5 py-1 transition-shadow ${cfg.grid} ${
          done ? 'border-app-teal/40 bg-app-mint' : 'border-transparent'
        }`}
      >
        <button
          type="button"
          onClick={() => setNoteOpen((o) => !o)}
          aria-expanded={noteOpen}
          aria-label={`${setNumber}. sorozat megjegyzés${hasNote ? `: ${note}` : ''}`}
          className="relative -mx-1 flex min-h-11 items-center justify-center text-sm font-semibold text-app-muted"
        >
          {setNumber}
          {hasNote && <span className="absolute right-0 top-2 size-1.5 rounded-full bg-amber-500" aria-hidden />}
        </button>
        {prev && !done ? (
          <button
            type="button"
            onClick={() => {
              setWeight(fmtWeight(prev.weight_kg));
              setReps(prev.reps?.toString() ?? '');
            }}
            aria-label={`${setNumber}. sorozat kitöltése a múltkori értékkel: ${formatSet(prev, fmtOpts)}`}
            className="-my-1 min-h-11 rounded-md text-left text-[11px] leading-tight text-app-muted underline decoration-dotted underline-offset-2"
          >
            {formatSet(prev, fmtOpts)}
          </button>
        ) : (
          <span className="text-[11px] leading-tight text-app-muted">{prev ? formatSet(prev, fmtOpts) : '–'}</span>
        )}
        <input
          ref={weightRef}
          inputMode={cfg.bodyweight ? 'text' : 'decimal'}
          aria-label={`${setNumber}. sorozat ${cfg.bodyweight ? 'plusz súly vagy segítség (kg)' : 'súly (kg)'}`}
          placeholder={weightPh}
          value={weight}
          onChange={valueChanged(setWeight)}
          onBlur={() => void commitEdit()}
          className={inputClass(!!missing.w)}
        />
        <input
          ref={repsRef}
          inputMode="numeric"
          aria-label={`${setNumber}. sorozat ${cfg.timed ? 'idő (mp)' : 'ismétlés'}`}
          placeholder={repsPh}
          value={reps}
          onFocus={(e) => {
            // Időre menő sorozat ▶ nélkül: a tervezett idő bekerül (kijelölve, felülírható), és a gomb ✓ lesz
            if (cfg.timed && !done && reps === '' && repsPh) {
              setReps(repsPh);
              const el = e.currentTarget;
              window.setTimeout(() => el.select(), 0);
            }
          }}
          onChange={valueChanged(setReps)}
          onBlur={() => void commitEdit()}
          className={inputClass(!!missing.r)}
        />
        {cfg.showHr && (
          <input
            inputMode="numeric"
            aria-label={`${setNumber}. sorozat pulzus`}
            placeholder="♥"
            value={hr}
            onChange={(e) => setHr(e.target.value)}
            onBlur={() => void commitEdit()}
            className={inputClass(false)}
          />
        )}
        {showPlay ? (
          <button
            type="button"
            onClick={startTimed}
            disabled={saving}
            aria-label={`${setNumber}. sorozat: időmérés indítása`}
            className={`flex size-11 items-center justify-center rounded-[10px] border border-app-teal bg-app-mint text-app-teal transition disabled:opacity-50 ${
              prevDone ? '' : 'opacity-40'
            }`}
          >
            <Play className="size-5 fill-current" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void toggle()}
            disabled={saving}
            aria-pressed={done}
            aria-label={done ? `${setNumber}. sorozat kész, visszavonás` : `${setNumber}. sorozat kész`}
            className={`flex size-11 items-center justify-center rounded-[10px] border transition disabled:opacity-50 ${
              done ? 'border-app-teal bg-app-teal text-white' : `border-app-line bg-white text-app-navy/30 ${prevDone ? '' : 'opacity-40'}`
            }`}
          >
            <Check className="size-5" strokeWidth={3} />
          </button>
        )}
      </div>

      {askNoWeight && (
        <div role="alert" className="mx-1.5 mt-1 flex flex-wrap items-center gap-2 rounded-[10px] border border-red-500/50 px-3 py-2 text-sm">
          <span className="flex-1 font-semibold">Nincs súly megadva. Így mented?</span>
          <button
            type="button"
            onClick={() => {
              setAskNoWeight(false);
              weightRef.current?.focus();
            }}
            className="h-9 rounded-[8px] bg-app-teal px-3 font-semibold text-white"
          >
            Beírom
          </button>
          <button
            type="button"
            onClick={() => void check(true)}
            className="h-9 rounded-[8px] border border-app-line px-3 font-semibold"
          >
            Mentés súly nélkül
          </button>
        </div>
      )}

      {noteOpen && (
        <div className="mx-1.5 mt-1 space-y-2 rounded-[10px] border border-app-line p-2">
          <div className="flex flex-wrap gap-1.5">
            {NOTE_TAGS.map((t) => {
              const on = note.split(',').some((p) => p.trim().toLowerCase() === t);
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    const next = toggleTag(note, t);
                    setNote(next);
                    if (done) void commitEdit(next);
                  }}
                  className={`min-h-9 rounded-full border px-3 text-xs font-semibold ${
                    on ? 'border-app-teal bg-app-mint text-app-ink' : 'border-app-line text-app-navy/80'
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
          <input
            aria-label={`${setNumber}. sorozat megjegyzés`}
            placeholder="Megjegyzés, pl. 60 kg, a vége csalt"
            maxLength={300}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => done && void commitEdit()}
            className={`${inputBase} border-app-line px-3 text-left text-sm`}
          />
          {!done && <p className="text-[11px] text-app-muted">A sorozat kipipálásakor mentődik.</p>}
        </div>
      )}
    </div>
  );
}

export default function ExerciseCard({
  item,
  planDayId,
  plan,
  logs,
  detailsHref,
  dayHref,
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
  /** Az edzésnap linkje (a számláló-sávról ide visz vissza). */
  dayHref: string;
  /** Szuperszett jelölő (A1, A2…), a gyakorlat neve előtt. */
  marker?: string;
  /** Szuperszett-csoporton belül: nincs saját keret és sugár, a csoport közös kerete veszi körül. */
  embedded?: boolean;
}) {
  const { startWorkout } = useSession();
  const { hrMode } = usePrefs();
  const currentLog = logs.find((l) => l.plan_day_id === planDayId);
  const prev = previousSets(plan, logs, planDayId, item.exercise.id);
  const hasVideo = getVideoEmbedUrl(item.exercise.video_url) !== null;
  const image = item.exercise.image_url?.trim() || null;
  const [imageOk, setImageOk] = useState(true);
  const hasDetails = hasVideo || !!image || !!item.note?.trim() || !!item.exercise.technique_note?.trim();
  const timed = timedSpec(item.reps);
  const bodyweight = isBodyweight(item);
  const showHr = hrMode === 'always' || (hrMode === 'auto' && !!item.exercise.track_hr);
  const planWeight = weightPlaceholder(item.resistance);
  const planReps = timed ? (timed.phases[0] ? String(timed.phases[0].seconds) : '') : repsPlaceholder(item.reps);
  const [fillTick, setFillTick] = useState(0);
  const hasPrev = prev.size > 0;
  const savedOf = (n: number) => currentLog?.sets.find((s) => s.day_exercise_id === item.id && s.set_number === n);
  const openSets = Array.from({ length: item.sets }, (_, i) => i + 1).filter((n) => !isSetDone(savedOf(n)));

  const grid = showHr
    ? 'grid-cols-[1.25rem_minmax(0,1fr)_3.75rem_3.25rem_3.25rem_2.75rem]'
    : 'grid-cols-[1.25rem_minmax(0,1fr)_4.25rem_3.75rem_2.75rem]';

  const cfg: RowConfig = {
    dayExerciseId: item.id,
    exerciseName: item.exercise.name,
    restSeconds: item.rest_seconds,
    groupKey: groupKey ?? item.id,
    href: `${dayHref}?sor=${item.id}`,
    timed,
    bodyweight,
    expectsWeight: expectsWeight(item) && !timed,
    showHr,
    planWeight,
    planReps,
    grid,
    // Az első rögzített sorozat az edzés kezdete, ha nem indította el (és nem utólag rögzít)
    onLogged: () => {
      if (!currentLog?.started_at && !currentLog?.completed_at && (!currentLog?.performed_on || currentLog.performed_on === todayIso()))
        void startWorkout(planDayId, new Date().toISOString()).catch(() => {});
    },
  };

  const title = (
    <>
      {image && imageOk && (
        <span className="relative block size-[44px] shrink-0 overflow-hidden rounded-[10px] border border-app-line bg-app-mint">
          <img
            src={image}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImageOk(false)}
            className="size-full object-cover"
          />
        </span>
      )}
      {marker && (
        <span className="flex size-[30px] shrink-0 items-center justify-center rounded-lg border border-app-ink text-sm font-bold text-app-ink">
          {marker}
        </span>
      )}
      <h3 className="min-w-0 flex-1 text-base font-semibold leading-snug">{item.exercise.name}</h3>
      {hasDetails && (
        <span
          className={`-mr-1 flex size-11 shrink-0 items-center justify-center rounded-[10px] ${
            hasVideo ? 'text-app-teal' : 'text-app-navy/60'
          }`}
          aria-hidden
        >
          {hasVideo ? <Play className="size-5 fill-current" /> : <Info className="size-5" />}
        </span>
      )}
    </>
  );

  return (
    <article className={embedded ? 'bg-white' : 'overflow-hidden rounded-[14px] border border-app-line bg-white'}>
      {hasDetails ? (
        <Link
          to={detailsHref}
          aria-label={`${item.exercise.name}: ${hasVideo ? 'videó és leírás' : 'részletek'}`}
          className="flex min-h-[68px] items-center gap-3 px-3 py-3 active:bg-app-navy/5"
        >
          {title}
        </Link>
      ) : (
        <div className="flex min-h-[68px] items-center gap-3 px-3 py-3">{title}</div>
      )}

      <PrescriptionBar item={item} />


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
          <div className={`grid gap-1.5 px-1.5 text-[10px] font-semibold uppercase tracking-wider text-app-muted ${grid}`}>
            <span>Sor</span>
            <span>Előző</span>
            <span className="text-center">{bodyweight ? '+Kg' : 'Kg'}</span>
            <span className="text-center">{timed ? 'Mp' : 'Ism.'}</span>
            {showHr && <span className="text-center">Pulzus</span>}
            <span className="text-center">{timed ? '▶ / ✓' : '✓'}</span>
          </div>
          {Array.from({ length: item.sets }, (_, i) => i + 1).map((n) => {
            // Az aznapi legutóbbi kész sorozat ebben a gyakorlatban (n előtt)
            let before: SetLog | undefined;
            for (let k = n - 1; k >= 1 && !before; k--) {
              const s = savedOf(k);
              if (isSetDone(s)) before = s;
            }
            return (
              <SetRow
                key={n}
                cfg={cfg}
                setNumber={n}
                saved={savedOf(n)}
                prev={prev.get(n)}
                prevToday={before}
                bestBefore={bestWeight(plan, logs, item.exercise.id, { dayExerciseId: item.id, setNumber: n })}
                fillTick={fillTick}
                prevDone={n === 1 || isSetDone(savedOf(n - 1))}
                nextDone={n < item.sets && isSetDone(savedOf(n + 1))}
              />
            );
          })}
          {[...Array(item.sets)].some((_, i) => {
            const s = savedOf(i + 1);
            return s && isFlagged(s);
          }) && <p className="px-1.5 pt-1 text-[11px] text-app-muted">⚑ A „nem szabályos” sorozat nem számít rekordnak.</p>}
        </div>
      )}
    </article>
  );
}
