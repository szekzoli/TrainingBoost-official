import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useMatch, useNavigate } from 'react-router-dom';
import {
  appApi,
  AppApiError,
  CONSENT_VERSION,
  type BodyWeight,
  type PlanData,
  type WorkoutLog,
} from '../../../lib/app-api';
import {
  clearOffline,
  enqueue,
  loadCache,
  loadOutbox,
  loadWeights,
  saveCache,
  saveOutbox,
  saveWeights,
  type Op,
} from './offline';
import { isoDay } from './dates';
import { attemptOf, currentLog, isEmptyLog } from './plan-utils';
import { inAppBrowser } from './install-prompt';

const CODE_KEY = 'tb_app_code';
const CONSENT_KEY = 'tb_app_consent';

function storeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function storeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* privát mód / tiltott tároló: a kód csak a munkamenet idejére él */
  }
}
function storeRemove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* nincs teendő */
  }
}

export type SessionStatus = 'loading' | 'ready' | 'nocode' | 'invalid' | 'error' | 'deleted';
export type ErrorKind = 'network' | 'not_configured' | 'other';

type Session = {
  status: SessionStatus;
  /** Csak status === 'error' esetén: mi a hiba oka (más üzenetet mutatunk). */
  errorKind: ErrorKind;
  plan: PlanData | null;
  logs: WorkoutLog[];
  consentOpen: boolean;
  acceptConsent: () => Promise<void>;
  declineConsent: () => void;
  /** false, ha a felhasználó nem fogadta el a hozzájárulást. */
  logSet: (
    dayExerciseId: string,
    setNumber: number,
    weight: number | null,
    reps: number | null,
    extra?: { note?: string | null; hr?: number | null },
  ) => Promise<boolean>;
  /** Edzés kezdése (at: ISO idő; null: a kezdés törlése). */
  startWorkout: (planDayId: string, at: string | null) => Promise<boolean>;
  /** Edzés lezárása; at: a befejezés ideje (alapból most). */
  completeDay: (planDayId: string, note: string | null, at?: string) => Promise<boolean>;
  /** Az edzés napja (ÉÉÉÉ-HH-NN) vagy null. */
  setWorkoutDate: (planDayId: string, date: string | null) => Promise<boolean>;
  /** Milyen nehéz volt az edzés (1–5) vagy null. */
  rateWorkout: (planDayId: string, rating: number | null) => Promise<boolean>;
  /** „Újra elvégzem”: új, üres alkalom a naphoz (az eddigiek megmaradnak). */
  repeatDay: (planDayId: string) => Promise<boolean>;
  /**
   * A nap legutóbbi alkalmának törlése (sorozatok, kezdés, lezárás, jegyzet); a korábbi alkalmak
   * megmaradnak. Csak nettel, és ha nincs várakozó módosítás. Hibánál AppApiError-t dob.
   */
  deleteWorkout: (planDayId: string) => Promise<void>;
  /** A személyes hozzáférési kód (a Beállításokban a saját link megjelenítéséhez). */
  code: string | null;
  /** Nincs kapcsolat a szerverrel (a helyi másolatból dolgozunk). */
  offline: boolean;
  /** Ennyi net nélkül rögzített módosítás vár küldésre. */
  pending: number;
  /** Várakozó módosítások azonnali elküldése (pl. a sávon lévő gombbal). */
  syncNow: () => void;
  /** Testsúly-mérések (dátum szerint). Üres, ha még nincs, vagy a szerveren nincs bekapcsolva. */
  weights: BodyWeight[];
  /** Mérés mentése az adott napra; null súllyal a napi mérés törlése. */
  logWeight: (date: string, weight: number | null) => Promise<boolean>;
  deleteMyData: () => Promise<void>;
  reload: () => void;
};

const SessionContext = createContext<Session | null>(null);

export function useSession(): Session {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession a SessionProvideren belül használható');
  return ctx;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const entryMatch = useMatch('/app/t/:code');
  const entryCode = entryMatch?.params.code ?? null;
  // A link az URL-ben marad:
  // - ?telepites: hogy iPhone-on a "Főképernyőhöz adás" a saját linket mentse el;
  // - közösségi app (Instagram, Messenger…) beépített böngészőjében: hogy a „Megnyitás böngészőben”
  //   a kódot is átvigye (a Safari / Chrome tárolója külön van, ott még nem ismerjük a kódot).
  const keepUrl = new URLSearchParams(useLocation().search).has('telepites') || inAppBrowser() !== null;

  const [code, setCode] = useState<string | null>(() => storeGet(CODE_KEY));
  const [status, setStatus] = useState<SessionStatus>(code ? 'loading' : 'nocode');
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [reloadTick, setReloadTick] = useState(0);
  const codeRef = useRef(code);
  codeRef.current = code;
  const [errorKind, setErrorKind] = useState<ErrorKind>('other');

  const [offline, setOffline] = useState(false);
  const [weights, setWeights] = useState<BodyWeight[]>(() => (code ? loadWeights(code) : []));
  const [outbox, setOutbox] = useState<Op[]>(() => (code ? loadOutbox(code) : []));
  const outboxRef = useRef(outbox);
  outboxRef.current = outbox;
  const flushing = useRef(false);

  const [consentOpen, setConsentOpen] = useState(false);
  const consentResolver = useRef<((ok: boolean) => void) | null>(null);

  // 3. /app/t/<kod>: a kódot átvesszük, az URL-t azonnal /app-ra cseréljük (history.replaceState).
  useEffect(() => {
    if (!entryCode) return;
    if (entryCode !== codeRef.current) {
      setCode(entryCode);
      setStatus('loading');
    }
    if (!keepUrl) navigate('/app', { replace: true });
  }, [entryCode, keepUrl, navigate]);

  // Terv + napló betöltése. Sikeres betöltés után kerül a kód localStorage-ba.
  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    setStatus('loading');
    Promise.all([appApi.getPlan(code), appApi.getLogs(code)])
      .then(([p, l]) => {
        if (cancelled) return;
        storeSet(CODE_KEY, code);
        setPlan(p);
        // Ha net nélkül rögzített módosítás vár, a helyi naplót tartjuk meg (abban már benne vannak),
        // és küldés után újratöltjük a szerverről.
        const queued = loadOutbox(code);
        const cached = queued.length ? loadCache(code) : null;
        setLogs(cached ? cached.logs : (l ?? []));
        setOutbox(queued);
        setOffline(false);
        setStatus('ready');
        // Testsúly: külön, nem akadályozza a betöltést (ha a 008-as SQL még nem futott, egyszerűen üres)
        appApi
          .getWeights(code)
          .then((w) => {
            if (cancelled) return;
            setWeights(w ?? []);
            saveWeights(code, w ?? []);
          })
          .catch(() => {
            if (!cancelled) setWeights(loadWeights(code));
          });
      })
      .catch((e) => {
        if (cancelled) return;
        if (e instanceof AppApiError && e.kind === 'invalid_code') {
          storeRemove(CODE_KEY);
          clearOffline();
          setCode(null);
          setStatus('invalid');
        } else if (e instanceof AppApiError && e.kind === 'network' && loadCache(code)) {
          // Nincs net: a legutóbbi helyi másolatból dolgozunk (benne a még el nem küldött módosításokkal).
          const c = loadCache(code)!;
          setPlan(c.plan);
          setLogs(c.logs);
          setOutbox(loadOutbox(code));
          setWeights(loadWeights(code));
          setOffline(true);
          setStatus('ready');
        } else {
          setErrorKind(
            e instanceof AppApiError && (e.kind === 'network' || e.kind === 'not_configured') ? e.kind : 'other',
          );
          setStatus('error');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [code, reloadTick]);

  const ensureConsent = useCallback((): Promise<boolean> => {
    if (storeGet(CONSENT_KEY) === CONSENT_VERSION) return Promise.resolve(true);
    return new Promise<boolean>((resolve) => {
      consentResolver.current = resolve;
      setConsentOpen(true);
    });
  }, []);

  const acceptConsent = useCallback(async () => {
    if (!code) return;
    await appApi.giveConsent(code); // hibánál a hívó (ConsentScreen) jelzi a felhasználónak
    storeSet(CONSENT_KEY, CONSENT_VERSION);
    setConsentOpen(false);
    consentResolver.current?.(true);
    consentResolver.current = null;
  }, [code]);

  const declineConsent = useCallback(() => {
    setConsentOpen(false);
    consentResolver.current?.(false);
    consentResolver.current = null;
  }, []);

  // Írási művelet hozzájárulás-ellenőrzéssel; ha a szerver mégis kéri, egyszer újra megkérdezzük.
  const withConsent = useCallback(
    async <T,>(run: (c: string) => Promise<T>): Promise<T | null> => {
      if (!code) throw new AppApiError('invalid_code');
      if (!(await ensureConsent())) return null;
      try {
        return await run(code);
      } catch (e) {
        if (e instanceof AppApiError && e.kind === 'consent_required') {
          storeRemove(CONSENT_KEY);
          if (!(await ensureConsent())) return null;
          return await run(code);
        }
        throw e;
      }
    },
    [code, ensureConsent],
  );

  // A napló legfrissebb állapota (a műveletek alkalom-sorszámához)
  const logsRef = useRef(logs);
  logsRef.current = logs;

  /** A nap aktuális (legutóbbi) alkalmának módosítása; ha még nincs, az 1. jön létre. */
  const upsertLog = (planDayId: string, fn: (l: WorkoutLog) => WorkoutLog) =>
    setLogs((prev) => {
      const existing = currentLog(prev, planDayId);
      const base: WorkoutLog = existing ?? {
        plan_day_id: planDayId,
        attempt: 1,
        completed_at: null,
        note: null,
        created_at: new Date().toISOString(),
        sets: [],
      };
      const next = fn(base);
      return existing ? prev.map((l) => (l === existing ? next : l)) : [...prev, next];
    });

  /** Új alkalom a naphoz (ha ezzel a sorszámmal még nincs). */
  const addAttempt = (planDayId: string, attempt: number, createdAt: string) =>
    setLogs((prev) =>
      prev.some((l) => l.plan_day_id === planDayId && attemptOf(l) === attempt)
        ? prev
        : [...prev, { plan_day_id: planDayId, attempt, completed_at: null, note: null, created_at: createdAt, sets: [] }],
    );

  /** A nap aktuális alkalmának sorszáma (a műveletekhez). */
  const attemptNow = (planDayId: string) => {
    const cur = currentLog(logsRef.current, planDayId);
    return cur ? attemptOf(cur) : 1;
  };

  // A sorozat melyik naphoz tartozik (helyi frissítéshez net nélkül)
  const dayOfRow = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of plan?.days ?? []) for (const e of d.exercises) m.set(e.id, d.id);
    return m;
  }, [plan]);

  /** Egy művelet hatása a helyi naplóra (ugyanaz, mint amit a szerver visszaadna). */
  const applyLocal = useCallback(
    (op: Op) => {
      if (op.t === 'set') {
        const dayId = dayOfRow.get(op.dayExerciseId);
        if (!dayId) return;
        upsertLog(dayId, (l) => ({
          ...l,
          sets: [
            ...l.sets.filter((s) => !(s.day_exercise_id === op.dayExerciseId && s.set_number === op.setNumber)),
            {
              day_exercise_id: op.dayExerciseId,
              set_number: op.setNumber,
              weight_kg: op.weight,
              reps: op.reps,
              note: op.note ?? null,
              heart_rate: op.hr ?? null,
              logged_at: op.at,
            },
          ],
        }));
      } else if (op.t === 'start') {
        upsertLog(op.planDayId, (l) => ({ ...l, started_at: op.at }));
      } else if (op.t === 'complete') {
        upsertLog(op.planDayId, (l) => ({
          ...l,
          completed_at: op.at,
          note: op.note,
          performed_on: l.performed_on ?? isoDay(new Date(op.at)),
        }));
      } else if (op.t === 'date') {
        upsertLog(op.planDayId, (l) => ({ ...l, performed_on: op.date }));
      } else if (op.t === 'repeat') {
        addAttempt(op.planDayId, op.attempt, op.at);
      } else {
        upsertLog(op.planDayId, (l) => ({ ...l, rating: op.rating }));
      }
    },
    [dayOfRow],
  );

  const send = (c: string, op: Op) => {
    switch (op.t) {
      case 'set':
        return appApi.logSet(c, op.dayExerciseId, op.setNumber, op.weight, op.reps, op.note ?? null, op.hr ?? null);
      case 'start':
        return appApi.startWorkout(c, op.planDayId, op.at);
      case 'complete':
        return appApi.completeDay(c, op.planDayId, op.note, op.at);
      case 'date':
        return appApi.setWorkoutDate(c, op.planDayId, op.date);
      case 'rate':
        return appApi.rateWorkout(c, op.planDayId, op.rating);
      case 'repeat':
        return appApi.repeatDay(c, op.planDayId);
    }
  };

  const queue = useCallback(
    (op: Op) => {
      if (!code) return;
      const next = enqueue(outboxRef.current, op);
      outboxRef.current = next;
      setOutbox(next);
      saveOutbox(code, next);
    },
    [code],
  );

  /** A várólista elküldése sorban. Hálózati hibánál megáll; más hibánál az adott műveletet eldobja. */
  const flush = useCallback(async () => {
    if (!code || flushing.current || outboxRef.current.length === 0) return;
    flushing.current = true;
    let sent = 0;
    try {
      while (outboxRef.current.length > 0) {
        const op = outboxRef.current[0];
        try {
          await send(code, op);
          sent++;
        } catch (e) {
          if (e instanceof AppApiError && (e.kind === 'network' || e.kind === 'consent_required')) {
            if (e.kind === 'network') setOffline(true);
            break;
          }
          console.warn('Egy várakozó módosítást a szerver elutasított, kihagyom.', op.t);
        }
        const rest = outboxRef.current.slice(1);
        outboxRef.current = rest;
        setOutbox(rest);
        saveOutbox(code, rest);
      }
      if (outboxRef.current.length === 0) {
        setOffline(false);
        if (sent > 0) {
          // Szinkron a szerverrel: a végleges napló onnan jön
          try {
            setLogs((await appApi.getLogs(code)) ?? []);
          } catch {
            /* a helyi napló is helyes; legközelebb frissül */
          }
        }
      }
    } finally {
      flushing.current = false;
    }
  }, [code]);

  /**
   * Írás net-tűréssel: ha van várakozó művelet, vagy nincs kapcsolat, a módosítás a várólistára kerül
   * (a felületen azonnal látszik), és a kapcsolat visszatérésekor automatikusan elmegy.
   */
  const write = useCallback(
    async <T,>(op: Op, onServer: (r: T) => void): Promise<boolean> => {
      if (!code) throw new AppApiError('invalid_code');
      if (!(await ensureConsent())) return false;
      if (outboxRef.current.length > 0) {
        applyLocal(op);
        queue(op);
        void flush();
        return true;
      }
      try {
        const r = (await withConsent((c) => send(c, op) as Promise<T>)) as T | null;
        if (r === null) return false;
        onServer(r);
        setOffline(false);
        return true;
      } catch (e) {
        if (e instanceof AppApiError && e.kind === 'network') {
          applyLocal(op);
          queue(op);
          setOffline(true);
          return true;
        }
        throw e;
      }
    },
    [code, ensureConsent, withConsent, applyLocal, queue, flush],
  );

  type SetResult = {
    plan_day_id: string;
    day_exercise_id: string;
    set_number: number;
    weight_kg: number | null;
    reps: number | null;
    note?: string | null;
    heart_rate?: number | null;
    logged_at: string;
  };
  const logSet: Session['logSet'] = useCallback(
    (dayExerciseId, setNumber, weight, reps, extra) =>
      write<SetResult>(
        {
          t: 'set',
          dayExerciseId,
          setNumber,
          weight,
          reps,
          note: extra?.note ?? null,
          hr: extra?.hr ?? null,
          at: new Date().toISOString(),
          attempt: attemptNow(dayOfRow.get(dayExerciseId) ?? ''),
        },
        (r) =>
          upsertLog(r.plan_day_id, (l) => ({
            ...l,
            sets: [
              ...l.sets.filter((s) => !(s.day_exercise_id === r.day_exercise_id && s.set_number === r.set_number)),
              {
                day_exercise_id: r.day_exercise_id,
                set_number: r.set_number,
                weight_kg: r.weight_kg === null ? null : Number(r.weight_kg),
                reps: r.reps,
                // A 009-es SQL előtt a szerver nem adja vissza: ilyenkor a helyi érték marad látható
                note: r.note !== undefined ? r.note : (extra?.note ?? null),
                heart_rate: r.heart_rate !== undefined ? r.heart_rate : (extra?.hr ?? null),
                logged_at: r.logged_at,
              },
            ],
          })),
      ),
    [write, dayOfRow],
  );

  const startWorkout: Session['startWorkout'] = useCallback(
    (planDayId, at) =>
      write<{ started_at: string | null }>({ t: 'start', planDayId, at, attempt: attemptNow(planDayId) }, (r) =>
        upsertLog(planDayId, (l) => ({ ...l, started_at: r.started_at })),
      ),
    [write],
  );

  const completeDay: Session['completeDay'] = useCallback(
    (planDayId, note, at) =>
      write<{ started_at?: string | null; completed_at: string; performed_on?: string | null; note: string | null }>(
        { t: 'complete', planDayId, note, at: at ?? new Date().toISOString(), attempt: attemptNow(planDayId) },
        (r) =>
          upsertLog(planDayId, (l) => ({
            ...l,
            completed_at: r.completed_at,
            note: r.note,
            started_at: r.started_at !== undefined ? r.started_at : l.started_at,
            performed_on: r.performed_on !== undefined ? r.performed_on : l.performed_on,
          })),
      ),
    [write],
  );

  const setWorkoutDate: Session['setWorkoutDate'] = useCallback(
    (planDayId, date) =>
      write<{ performed_on: string | null }>({ t: 'date', planDayId, date, attempt: attemptNow(planDayId) }, (r) =>
        upsertLog(planDayId, (l) => ({ ...l, performed_on: r.performed_on })),
      ),
    [write],
  );

  const rateWorkout: Session['rateWorkout'] = useCallback(
    (planDayId, rating) =>
      write<{ rating: number | null }>({ t: 'rate', planDayId, rating, attempt: attemptNow(planDayId) }, (r) =>
        upsertLog(planDayId, (l) => ({ ...l, rating: r.rating })),
      ),
    [write],
  );

  const repeatDay: Session['repeatDay'] = useCallback(
    (planDayId) => {
      // Ha az aktuális alkalom még üres, nem kell új (a szerver is így dönt)
      const cur = currentLog(logsRef.current, planDayId);
      const attempt = !cur ? 1 : isEmptyLog(cur) ? attemptOf(cur) : attemptOf(cur) + 1;
      return write<{ attempt: number; created_at: string }>(
        { t: 'repeat', planDayId, attempt, at: new Date().toISOString() },
        (r) => addAttempt(planDayId, r.attempt, r.created_at),
      );
    },
    [write],
  );

  const deleteWorkout: Session['deleteWorkout'] = useCallback(
    async (planDayId) => {
      if (!code) throw new AppApiError('invalid_code');
      if (outboxRef.current.length > 0) throw new AppApiError('network');
      await appApi.deleteWorkout(code, planDayId);
      setOffline(false);
      // Csak a nap legutóbbi alkalma törlődik (a szerveren is)
      setLogs((prev) => {
        const cur = currentLog(prev, planDayId);
        return prev.filter((l) => l !== cur);
      });
    },
    [code],
  );

  const logWeight: Session['logWeight'] = useCallback(
    async (date, weight) => {
      const r = await withConsent((c) => appApi.logWeight(c, date, weight));
      if (r === null) return false;
      setWeights((prev) => {
        const rest = prev.filter((w) => w.measured_on !== date);
        const next =
          r.weight_kg === null
            ? rest
            : [...rest, { measured_on: date, weight_kg: Number(r.weight_kg) }].sort((a, b) =>
                a.measured_on.localeCompare(b.measured_on),
              );
        if (code) saveWeights(code, next);
        return next;
      });
      return true;
    },
    [withConsent, code],
  );

  // Helyi másolat frissen tartása (offline indításhoz)
  useEffect(() => {
    if (status === 'ready' && code && plan) saveCache(code, plan, logs);
  }, [status, code, plan, logs]);

  // Küldési próbák: amikor visszajön a net, amikor az app előtérbe kerül, és várakozás közben 20 mp-enként
  useEffect(() => {
    if (status !== 'ready') return;
    const tryFlush = () => void flush();
    const onVisible = () => document.visibilityState === 'visible' && tryFlush();
    window.addEventListener('online', tryFlush);
    document.addEventListener('visibilitychange', onVisible);
    const timer = window.setInterval(() => outboxRef.current.length > 0 && tryFlush(), 20_000);
    tryFlush();
    return () => {
      window.removeEventListener('online', tryFlush);
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(timer);
    };
  }, [status, flush]);

  const deleteMyData = useCallback(async () => {
    if (!code) return;
    await appApi.deleteMyData(code);
    clearOffline();
    storeRemove(CODE_KEY);
    storeRemove(CONSENT_KEY);
    setCode(null);
    setPlan(null);
    setLogs([]);
    setStatus('deleted');
    navigate('/app', { replace: true });
  }, [code, navigate]);

  const reload = useCallback(() => setReloadTick((t) => t + 1), []);

  const value = useMemo<Session>(
    () => ({
      status,
      errorKind,
      plan,
      logs,
      consentOpen,
      acceptConsent,
      declineConsent,
      logSet,
      startWorkout,
      completeDay,
      setWorkoutDate,
      rateWorkout,
      repeatDay,
      deleteWorkout,
      code: status === 'ready' ? code : null,
      offline,
      pending: outbox.length,
      syncNow: () => void flush(),
      weights,
      logWeight,
      deleteMyData,
      reload,
    }),
    [
      status,
      errorKind,
      plan,
      logs,
      consentOpen,
      acceptConsent,
      declineConsent,
      logSet,
      startWorkout,
      completeDay,
      setWorkoutDate,
      rateWorkout,
      repeatDay,
      deleteWorkout,
      code,
      offline,
      outbox,
      flush,
      weights,
      logWeight,
      deleteMyData,
      reload,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
