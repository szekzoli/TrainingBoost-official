import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useMatch, useNavigate } from 'react-router-dom';
import {
  appApi,
  AppApiError,
  CONSENT_VERSION,
  type PlanData,
  type WorkoutLog,
} from '../../../lib/app-api';

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

type Session = {
  status: SessionStatus;
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
  ) => Promise<boolean>;
  completeDay: (planDayId: string, note: string | null) => Promise<boolean>;
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

  const [code, setCode] = useState<string | null>(() => storeGet(CODE_KEY));
  const [status, setStatus] = useState<SessionStatus>(code ? 'loading' : 'nocode');
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [reloadTick, setReloadTick] = useState(0);

  const [consentOpen, setConsentOpen] = useState(false);
  const consentResolver = useRef<((ok: boolean) => void) | null>(null);

  // 3. /app/t/<kod>: a kódot átvesszük, az URL-t azonnal /app-ra cseréljük (history.replaceState).
  useEffect(() => {
    if (!entryCode) return;
    setCode(entryCode);
    setStatus('loading');
    navigate('/app', { replace: true });
  }, [entryCode, navigate]);

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
        setLogs(l ?? []);
        setStatus('ready');
      })
      .catch((e) => {
        if (cancelled) return;
        if (e instanceof AppApiError && e.kind === 'invalid_code') {
          storeRemove(CODE_KEY);
          setCode(null);
          setStatus('invalid');
        } else {
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

  const upsertLog = (planDayId: string, fn: (l: WorkoutLog) => WorkoutLog) =>
    setLogs((prev) => {
      const existing = prev.find((l) => l.plan_day_id === planDayId);
      const base: WorkoutLog = existing ?? {
        plan_day_id: planDayId,
        completed_at: null,
        note: null,
        created_at: new Date().toISOString(),
        sets: [],
      };
      const next = fn(base);
      return existing ? prev.map((l) => (l === existing ? next : l)) : [...prev, next];
    });

  const logSet: Session['logSet'] = useCallback(
    async (dayExerciseId, setNumber, weight, reps) => {
      const r = await withConsent((c) => appApi.logSet(c, dayExerciseId, setNumber, weight, reps));
      if (!r) return false;
      upsertLog(r.plan_day_id, (l) => ({
        ...l,
        sets: [
          ...l.sets.filter(
            (s) => !(s.day_exercise_id === r.day_exercise_id && s.set_number === r.set_number),
          ),
          {
            day_exercise_id: r.day_exercise_id,
            set_number: r.set_number,
            weight_kg: r.weight_kg,
            reps: r.reps,
            logged_at: r.logged_at,
          },
        ],
      }));
      return true;
    },
    [withConsent],
  );

  const completeDay: Session['completeDay'] = useCallback(
    async (planDayId, note) => {
      const r = await withConsent((c) => appApi.completeDay(c, planDayId, note));
      if (!r) return false;
      upsertLog(planDayId, (l) => ({ ...l, completed_at: r.completed_at, note: r.note }));
      return true;
    },
    [withConsent],
  );

  const deleteMyData = useCallback(async () => {
    if (!code) return;
    await appApi.deleteMyData(code);
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
      plan,
      logs,
      consentOpen,
      acceptConsent,
      declineConsent,
      logSet,
      completeDay,
      deleteMyData,
      reload,
    }),
    [status, plan, logs, consentOpen, acceptConsent, declineConsent, logSet, completeDay, deleteMyData, reload],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
