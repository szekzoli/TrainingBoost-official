// Pihenőidő-számláló: egy sorozat kipipálása után, ha az edző megadott pihenőt (rest_seconds),
// alul egy sáv számol vissza. A végén rezeg (ha a telefon engedi), és magától eltűnik.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Timer, X } from 'lucide-react';
import { usePrefs } from './prefs';

type RestTimerApi = { start: (seconds: number, label: string) => void; stop: () => void };

const RestTimerContext = createContext<RestTimerApi>({ start: () => {}, stop: () => {} });

export const useRestTimer = () => useContext(RestTimerContext);

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

const STORE_KEY = 'tb_rest_timer';

export function RestTimerProvider({ children }: { children: React.ReactNode }) {
  const { restTimer: enabled } = usePrefs();
  // A futó pihenő a böngészőfülhöz mentve (sessionStorage): ha a telefon zárolása közben a böngésző
  // újratölti az oldalt, a számláló a hátralévő idővel folytatódik.
  const saved = useMemo(() => {
    try {
      const v = JSON.parse(sessionStorage.getItem(STORE_KEY) ?? 'null') as
        | { endAt: number; total: number; label: string }
        | null;
      return v && typeof v.endAt === 'number' && v.endAt > Date.now() ? v : null;
    } catch {
      return null;
    }
  }, []);
  const [endAt, setEndAt] = useState<number | null>(saved?.endAt ?? null);
  const [total, setTotal] = useState(saved?.total ?? 0);
  const [label, setLabel] = useState(saved?.label ?? '');
  const [now, setNow] = useState(() => Date.now());
  const [finished, setFinished] = useState(false);
  const hideTimer = useRef<number | null>(null);

  const stop = useCallback(() => {
    setEndAt(null);
    setFinished(false);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
  }, []);

  const start = useCallback(
    (seconds: number, l: string) => {
      if (!enabled || !(seconds > 0)) return;
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      setTotal(seconds);
      setLabel(l);
      setFinished(false);
      setNow(Date.now());
      setEndAt(Date.now() + seconds * 1000);
    },
    [enabled],
  );

  useEffect(() => {
    if (endAt === null || finished) return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= endAt) {
        setFinished(true);
        try {
          navigator.vibrate?.([200, 100, 200]);
        } catch {
          /* nincs rezgés */
        }
        hideTimer.current = window.setTimeout(() => setEndAt(null), 4000);
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [endAt, finished]);

  useEffect(() => {
    try {
      if (endAt === null || finished) sessionStorage.removeItem(STORE_KEY);
      else sessionStorage.setItem(STORE_KEY, JSON.stringify({ endAt, total, label }));
    } catch {
      /* privát mód: nincs mentés */
    }
  }, [endAt, total, label, finished]);

  useEffect(() => {
    if (!enabled) stop();
  }, [enabled, stop]);

  const api = useMemo(() => ({ start, stop }), [start, stop]);
  const left = endAt === null ? 0 : Math.max(0, Math.ceil((endAt - now) / 1000));
  const adjust = (d: number) => setEndAt((e) => (e === null ? e : Math.max(Date.now() + 1000, e + d * 1000)));

  return (
    <RestTimerContext.Provider value={api}>
      {children}
      {endAt !== null && (
        <div
          role="timer"
          aria-live="polite"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-app-line bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur print:hidden"
        >
          <div className="mx-auto flex max-w-md items-center gap-3">
            <Timer className={`size-5 shrink-0 ${finished ? 'text-app-teal' : 'text-app-muted'}`} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-app-muted">{finished ? 'Pihenő vége, jöhet a következő!' : `Pihenő · ${label}`}</p>
              <p className="text-2xl font-bold tabular-nums">{finished ? '0:00' : fmt(left)}</p>
              <div className="mt-1 h-1 w-full rounded-full bg-app-navy/10" aria-hidden="true">
                <div
                  className="h-full rounded-full bg-app-teal transition-[width] duration-200"
                  style={{ width: `${total ? (left / total) * 100 : 0}%` }}
                />
              </div>
            </div>
            {!finished && (
              <>
                <button
                  type="button"
                  onClick={() => adjust(-15)}
                  className="h-11 rounded-[10px] border border-app-line px-2.5 text-sm font-semibold"
                >
                  −15
                </button>
                <button
                  type="button"
                  onClick={() => adjust(15)}
                  className="h-11 rounded-[10px] border border-app-line px-2.5 text-sm font-semibold"
                >
                  +15
                </button>
              </>
            )}
            <button
              type="button"
              onClick={stop}
              aria-label="Pihenő bezárása"
              className="flex size-11 items-center justify-center rounded-[10px] border border-app-line"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>
      )}
    </RestTimerContext.Provider>
  );
}
