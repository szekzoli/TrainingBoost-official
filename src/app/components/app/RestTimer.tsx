// Számlálók az alsó sávban:
//  * pihenő: egy sorozat kipipálása után, ha van megadott pihenő, visszaszámol. Az utolsó 5 másodpercben
//    csippan, a végén hosszabb hang (és rezgés, ahol a telefon tudja), majd magától eltűnik;
//  * munka: időre menő gyakorlat (pl. plank „30 mp”, oldalanként „30-30 mp”): 3 mp felkészülés, majd a
//    szakaszok (oldalváltásnál 3 mp átállás), a végén a sorozat magától mentődik. Szüneteltethető, és a
//    „Kész” gombbal előbb is lezárható: ilyenkor az addig kitartott idő mentődik;
//  * stopper: „max” idős gyakorlat; szüneteltethető, a „Kész” gombbal áll meg, és az eltelt idő mentődik.
// Amíg számláló fut, a képernyő nem alszik el (ahol a böngésző engedi). A sávra koppintva vissza lehet
// jutni az edzéshez, ha közben máshová navigált.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Pause, Play, Square, Timer, X } from 'lucide-react';
import { usePrefs } from './prefs';
import { beep, keepAwake, unlockAudio } from './sound';

/** Egy munka-szakasz (pl. „Bal oldal”, 30 mp). */
export type WorkPhase = { label: string; seconds: number };

export type WorkOptions = {
  /** A gyakorlat neve (a sáv felirata). */
  label: string;
  /** Visszaszámlálós szakaszok; üres tömb = stopper (fölfelé számol). */
  phases: WorkPhase[];
  /** Két szakasz közti átállás felirata (alapból „Oldalváltás”). */
  switchLabel?: string;
  /** Hová vigyen a sávra koppintás (az edzésnap, a sorral). */
  href?: string;
  /** A végén hívódik: egy szakasz hossza (visszaszámlálásnál) vagy az eltelt idő (stopper), másodpercben. */
  onDone: (seconds: number) => void;
};

type RestTimerApi = {
  /** Pihenő indítása. href: a sávra koppintva ide visz vissza. */
  start: (seconds: number, label: string, href?: string) => void;
  /** Időre menő sorozat indítása (gombnyomásra hívandó, hogy a hang elinduljon). */
  startWork: (opts: WorkOptions) => void;
  stop: () => void;
  /** Fut-e éppen bármilyen számláló (a sáv látszik). */
  active: boolean;
};

const RestTimerContext = createContext<RestTimerApi>({ start: () => {}, startWork: () => {}, stop: () => {}, active: false });

export const useRestTimer = () => useContext(RestTimerContext);

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

const STORE_KEY = 'tb_rest_timer';
const PREP = 3; // felkészülés a munka előtt (mp)
const SWITCH = 3; // oldalváltás két szakasz között (mp)

type Segment = { kind: 'prep' | 'work' | 'switch'; label: string; seconds: number };

type Run =
  | { kind: 'rest'; endAt: number; total: number; label: string; href?: string }
  | { kind: 'work'; startAt: number; pausedAt?: number; segments: Segment[]; label: string; href?: string; phaseSeconds: number }
  | { kind: 'stopwatch'; startAt: number; pausedAt?: number; label: string; href?: string };

/** Szüneteltetésnél a számláló ideje a szünet pillanatában áll. */
const clockOf = (run: Run, now: number) => (run.kind !== 'rest' && run.pausedAt !== undefined ? run.pausedAt : now);

/**
 * Korai lezárásnál mentendő idő: a futó munkaszakaszban eddig kitartott másodpercek; oldalváltás közben
 * (az előző oldal már megvolt) a teljes szakasz; felkészülés közben 0 (nincs mit menteni).
 */
function workDoneSeconds(run: Extract<Run, { kind: 'work' }>, clock: number): number {
  let t = (clock - run.startAt) / 1000;
  for (const seg of run.segments) {
    if (t < seg.seconds) return seg.kind === 'work' ? Math.floor(t) : seg.kind === 'switch' ? run.phaseSeconds : 0;
    t -= seg.seconds;
  }
  return run.phaseSeconds;
}

function buildSegments(phases: WorkPhase[], switchLabel = 'Oldalváltás'): Segment[] {
  const out: Segment[] = [{ kind: 'prep', label: 'Felkészülés', seconds: PREP }];
  phases.forEach((p, i) => {
    if (i > 0) out.push({ kind: 'switch', label: switchLabel, seconds: SWITCH });
    out.push({ kind: 'work', label: p.label, seconds: p.seconds });
  });
  return out;
}

/** Hol tart a munka-számláló: az aktuális szakasz, benne hátralévő mp; null, ha vége. */
function segmentAt(segments: Segment[], elapsedMs: number): { i: number; left: number; seg: Segment } | null {
  let t = elapsedMs / 1000;
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (t < seg.seconds) return { i, left: Math.ceil(seg.seconds - t), seg };
    t -= seg.seconds;
  }
  return null;
}

/** Ugyanaz az oldal-e (útvonal + ?sor nélkül), hogy a „vissza” linket csak máshol mutassuk. */
function samePath(href: string | undefined, pathname: string) {
  return !href || href.split('?')[0] === pathname;
}

export function RestTimerProvider({ children }: { children: React.ReactNode }) {
  const { restTimer: enabled } = usePrefs();
  const { pathname } = useLocation();
  // A futó pihenő a böngészőfülhöz mentve (sessionStorage): ha a telefon zárolása közben a böngésző
  // újratölti az oldalt, a számláló a hátralévő idővel folytatódik.
  const saved = useMemo<Run | null>(() => {
    try {
      const v = JSON.parse(sessionStorage.getItem(STORE_KEY) ?? 'null') as
        | { endAt: number; total: number; label: string; href?: string }
        | null;
      return v && typeof v.endAt === 'number' && v.endAt > Date.now() ? { kind: 'rest', ...v } : null;
    } catch {
      return null;
    }
  }, []);
  const [run, setRun] = useState<Run | null>(saved);
  const [now, setNow] = useState(() => Date.now());
  const [finished, setFinished] = useState(false);
  const hideTimer = useRef<number | null>(null);
  const onDoneRef = useRef<((s: number) => void) | null>(null);
  // Melyik másodpercnél csippantunk már (hogy egy másodpercben csak egyszer szóljon)
  const lastBeep = useRef<string>('');

  const clearHide = () => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = null;
  };

  const stop = useCallback(() => {
    setRun(null);
    setFinished(false);
    onDoneRef.current = null;
    clearHide();
  }, []);

  const start = useCallback(
    (seconds: number, l: string, href?: string) => {
      if (!enabled || !(seconds > 0)) return;
      unlockAudio();
      clearHide();
      onDoneRef.current = null;
      lastBeep.current = '';
      setFinished(false);
      setNow(Date.now());
      setRun({ kind: 'rest', endAt: Date.now() + seconds * 1000, total: seconds, label: l, href });
    },
    [enabled],
  );

  const startWork = useCallback((opts: WorkOptions) => {
    unlockAudio();
    clearHide();
    lastBeep.current = '';
    onDoneRef.current = opts.onDone;
    setFinished(false);
    const t = Date.now();
    setNow(t);
    if (opts.phases.length === 0) {
      beep(true);
      setRun({ kind: 'stopwatch', startAt: t, label: opts.label, href: opts.href });
    } else {
      setRun({
        kind: 'work',
        startAt: t,
        segments: buildSegments(opts.phases, opts.switchLabel),
        label: opts.label,
        href: opts.href,
        phaseSeconds: opts.phases[0].seconds,
      });
    }
  }, []);

  /** Munka / stopper lezárása: mentés a megadott idővel, utána a sáv eltűnik (vagy pihenő indul). */
  const finishWork = useCallback(
    (seconds: number) => {
      const cb = onDoneRef.current;
      onDoneRef.current = null;
      setRun(null);
      setFinished(false);
      if (cb && seconds > 0) cb(seconds);
    },
    [],
  );

  // Ketyegés és hangjelzések
  const paused = run !== null && run.kind !== 'rest' && run.pausedAt !== undefined;
  useEffect(() => {
    if (!run || finished || paused) return;
    const tick = () => {
      const t = Date.now();
      setNow(t);
      if (run.kind === 'rest') {
        const left = Math.ceil((run.endAt - t) / 1000);
        if (t >= run.endAt) {
          setFinished(true);
          beep(true);
          hideTimer.current = window.setTimeout(() => setRun(null), 4000);
        } else if (left <= 5 && lastBeep.current !== `r${left}`) {
          lastBeep.current = `r${left}`;
          beep();
        }
      } else if (run.kind === 'work') {
        const at = segmentAt(run.segments, t - run.startAt);
        if (!at) {
          beep(true);
          finishWork(run.phaseSeconds);
          return;
        }
        const key = `${at.i}:${at.left}`;
        if (lastBeep.current === key) return;
        const firstTick = lastBeep.current === '';
        lastBeep.current = key;
        // Szakasz eleje: munka indul → hosszú hang; a felkészülés és a munka utolsó 3 mp-e → rövid
        const segStart = at.left === at.seg.seconds && !firstTick;
        if (segStart && at.seg.kind === 'work') beep(true);
        else if (segStart && at.seg.kind === 'switch') beep(true);
        else if (at.left <= 3 && at.seg.kind !== 'switch') beep();
      }
    };
    tick();
    const id = window.setInterval(tick, 200);
    return () => window.clearInterval(id);
  }, [run, finished, paused, finishWork]);

  /** Szünet / folytatás (munka és stopper): folytatáskor a kezdés a szünet hosszával tolódik. */
  const togglePause = () => {
    unlockAudio();
    setRun((r) => {
      if (!r || r.kind === 'rest') return r;
      const t = Date.now();
      if (r.pausedAt === undefined) return { ...r, pausedAt: t };
      return { ...r, startAt: r.startAt + (t - r.pausedAt), pausedAt: undefined };
    });
    setNow(Date.now());
  };

  /** „Kész”: a munka / stopper lezárása most, az addig kitartott idővel. */
  const finishNow = () => {
    if (!run || run.kind === 'rest') return;
    const clock = clockOf(run, Date.now());
    const seconds = run.kind === 'work' ? workDoneSeconds(run, clock) : Math.floor((clock - run.startAt) / 1000);
    beep(true);
    if (seconds > 0) finishWork(seconds);
    else stop();
  };

  // Pihenő mentése a fülhöz (újratöltés után is folytatódjon); munka-számlálót nem mentünk
  useEffect(() => {
    try {
      if (run?.kind === 'rest' && !finished)
        sessionStorage.setItem(STORE_KEY, JSON.stringify({ endAt: run.endAt, total: run.total, label: run.label, href: run.href }));
      else sessionStorage.removeItem(STORE_KEY);
    } catch {
      /* privát mód: nincs mentés */
    }
  }, [run, finished]);

  // Kikapcsolt pihenő-számlálónál a futó pihenő is álljon le (a munka-számláló nem pihenő)
  useEffect(() => {
    if (!enabled && run?.kind === 'rest') stop();
  }, [enabled, run, stop]);

  // Képernyő ébren tartása, amíg számláló fut
  const active = run !== null;
  useEffect(() => {
    keepAwake(active && !finished);
    return () => keepAwake(false);
  }, [active, finished]);

  const api = useMemo(() => ({ start, startWork, stop, active }), [start, startWork, stop, active]);

  const adjust = (d: number) =>
    setRun((r) => (r && r.kind === 'rest' ? { ...r, endAt: Math.max(Date.now() + 1000, r.endAt + d * 1000) } : r));

  let title = '';
  let big = '';
  let progress = 0;
  let accent = false;
  if (run?.kind === 'rest') {
    const left = Math.max(0, Math.ceil((run.endAt - now) / 1000));
    title = finished ? 'Pihenő vége, jöhet a következő!' : `Pihenő · ${run.label}`;
    big = finished ? '0:00' : fmt(left);
    progress = run.total ? left / run.total : 0;
    accent = finished;
  } else if (run?.kind === 'work') {
    const at = segmentAt(run.segments, clockOf(run, now) - run.startAt);
    const seg = at?.seg;
    title = `${paused ? 'Szünet · ' : ''}${seg ? `${seg.label} · ${run.label}` : run.label}`;
    big = at ? (seg!.kind === 'work' ? fmt(at.left) : String(at.left)) : '0:00';
    progress = at && seg ? at.left / seg.seconds : 0;
    accent = seg?.kind === 'work';
  } else if (run?.kind === 'stopwatch') {
    const el = Math.floor((clockOf(run, now) - run.startAt) / 1000);
    title = `${paused ? 'Szünet' : 'Stopper'} · ${run.label}`;
    big = fmt(el);
    progress = 1;
    accent = true;
  }

  const showBack = run && !samePath(run.href, pathname);
  const label = (
    <div className="min-w-0 flex-1">
      {showBack ? (
        <p className="truncate text-xs font-semibold text-app-teal">‹ Vissza az edzéshez · {title}</p>
      ) : (
        <p className="truncate text-xs text-app-muted">{title}</p>
      )}
      <p className={`text-2xl font-bold tabular-nums ${accent && run?.kind !== 'rest' ? 'text-app-teal' : ''}`}>{big}</p>
      <div className="mt-1 h-1 w-full rounded-full bg-app-navy/10" aria-hidden="true">
        <div className="h-full rounded-full bg-app-teal transition-[width] duration-200" style={{ width: `${progress * 100}%` }} />
      </div>
    </div>
  );

  const btn = 'h-11 rounded-[10px] border border-app-line px-2.5 text-sm font-semibold';

  return (
    <RestTimerContext.Provider value={api}>
      {children}
      {run && (
        <div
          role="timer"
          aria-live="polite"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-app-line bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur print:hidden"
        >
          <div className="mx-auto flex max-w-md items-center gap-3">
            <Timer className={`size-5 shrink-0 ${accent ? 'text-app-teal' : 'text-app-muted'}`} />
            {showBack && run.href ? (
              <Link to={run.href} aria-label="Vissza az edzéshez" className="min-w-0 flex-1">
                {label}
              </Link>
            ) : (
              label
            )}
            {run.kind === 'rest' && !finished && (
              <>
                <button type="button" onClick={() => adjust(-15)} className={btn}>
                  −15
                </button>
                <button type="button" onClick={() => adjust(15)} className={btn}>
                  +15
                </button>
              </>
            )}
            {run.kind !== 'rest' && (
              <>
                <button
                  type="button"
                  onClick={togglePause}
                  aria-label={paused ? 'Folytatás' : 'Szünet'}
                  className="flex size-11 shrink-0 items-center justify-center rounded-[10px] border border-app-line"
                >
                  {paused ? <Play className="size-5 fill-current" /> : <Pause className="size-5 fill-current" />}
                </button>
                <button
                  type="button"
                  onClick={finishNow}
                  aria-label="Kész: az eddigi idő mentése"
                  className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-[10px] bg-app-teal px-3 text-sm font-semibold text-white"
                >
                  <Square className="size-4 fill-current" /> Kész
                </button>
              </>
            )}
            <button
              type="button"
              onClick={stop}
              aria-label={run.kind === 'rest' ? 'Pihenő bezárása' : 'Számláló megszakítása (nem mentődik)'}
              className="flex size-11 shrink-0 items-center justify-center rounded-[10px] border border-app-line"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>
      )}
    </RestTimerContext.Provider>
  );
}
