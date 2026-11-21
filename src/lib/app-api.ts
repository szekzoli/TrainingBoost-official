import { getSupabase } from './supabase';

export const CONSENT_VERSION = '2026-10';

export type PlanExercise = {
  id: string;
  position: number;
  section: string | null;
  group_label: string | null;
  sets: number;
  reps: string;
  resistance: string | null;
  rest_seconds: number | null;
  note: string | null;
  exercise: {
    id: string;
    name: string;
    video_url: string | null;
    image_url?: string | null;
    technique_note: string | null;
  };
};

export type PlanDay = {
  id: string;
  week: number;
  day: number;
  title: string | null;
  exercises: PlanExercise[];
};

export type PlanData = {
  plan: { id: string; slug: string; title: string; description: string | null; started_on?: string | null };
  days: PlanDay[];
};

export type SetLog = {
  day_exercise_id: string;
  set_number: number;
  weight_kg: number | null;
  reps: number | null;
  logged_at: string;
};

export type WorkoutLog = {
  plan_day_id: string;
  completed_at: string | null;
  /** Az edzés tényleges napja (ÉÉÉÉ-HH-NN), az ügyfél állíthatja. Régi adatbázisnál hiányozhat. */
  performed_on?: string | null;
  /** Az ügyfél értékelése: milyen nehéz volt (1–5). Régi adatbázisnál hiányozhat. */
  rating?: number | null;
  note: string | null;
  created_at: string;
  sets: SetLog[];
};

export type ApiErrorKind = 'invalid_code' | 'consent_required' | 'not_configured' | 'network' | 'other';

export class AppApiError extends Error {
  kind: ApiErrorKind;
  constructor(kind: ApiErrorKind) {
    super(kind); // szándékosan nincs benne a kód vagy a szerver üzenete
    this.kind = kind;
  }
}

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  let supabase;
  try {
    supabase = getSupabase();
  } catch {
    throw new AppApiError('not_configured');
  }
  // Nincs net: ne várjunk a böngésző hibájára, azonnal a helyi másolat / várólista jöhet
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new AppApiError('network');
  let res;
  try {
    const q = supabase.rpc(fn, args);
    // Gyenge térerőnél se akadjon el a felület: 15 mp után hálózati hibának vesszük
    res = typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal ? await q.abortSignal(AbortSignal.timeout(15_000)) : await q;
  } catch {
    throw new AppApiError('network');
  }
  const { data, error } = res;
  if (error) {
    const msg = error.message || '';
    if (msg.includes('invalid_code')) throw new AppApiError('invalid_code');
    if (msg.includes('consent_required')) throw new AppApiError('consent_required');
    // A böngésző hálózati hibája (nincs net, a szerver alszik / nem válaszol): a supabase-js ilyenkor
    // nem dob kivételt, hanem a fetch hibaüzenetét adja vissza.
    if (/failed to fetch|networkerror|load failed|network request failed|fetch failed|abort|timed? ?out/i.test(msg)) {
      throw new AppApiError('network');
    }
    throw new AppApiError('other');
  }
  return data as T;
}

/** Testsúly-mérés (kg, egy tizedes), naponta legfeljebb egy. */
export type BodyWeight = { measured_on: string; weight_kg: number };

export const appApi = {
  getWeights: (code: string) => rpc<BodyWeight[]>('app_get_weights', { p_code: code }),
  logWeight: (code: string, date: string, weight: number | null) =>
    rpc<{ measured_on: string; weight_kg: number | null }>('app_log_weight', {
      p_code: code,
      p_date: date,
      p_weight: weight,
    }),
  getPlan: (code: string) => rpc<PlanData>('app_get_plan', { p_code: code }),
  getLogs: (code: string) => rpc<WorkoutLog[]>('app_get_logs', { p_code: code }),
  giveConsent: (code: string) =>
    rpc<unknown>('app_give_consent', { p_code: code, p_version: CONSENT_VERSION }),
  logSet: (
    code: string,
    dayExerciseId: string,
    setNumber: number,
    weight: number | null,
    reps: number | null,
  ) =>
    rpc<SetLog & { plan_day_id: string }>('app_log_set', {
      p_code: code,
      p_day_exercise_id: dayExerciseId,
      p_set_number: setNumber,
      p_weight: weight,
      p_reps: reps,
    }),
  setWorkoutDate: (code: string, planDayId: string, date: string | null) =>
    rpc<{ plan_day_id: string; performed_on: string | null }>('app_set_workout_date', {
      p_code: code,
      p_plan_day_id: planDayId,
      p_date: date,
    }),
  rateWorkout: (code: string, planDayId: string, rating: number | null) =>
    rpc<{ plan_day_id: string; rating: number | null }>('app_rate_workout', {
      p_code: code,
      p_plan_day_id: planDayId,
      p_rating: rating,
    }),
  completeDay: (code: string, planDayId: string, note: string | null) =>
    rpc<{ plan_day_id: string; completed_at: string; performed_on?: string | null; note: string | null }>('app_complete_day', {
      p_code: code,
      p_plan_day_id: planDayId,
      p_note: note,
    }),
  deleteMyData: (code: string) => rpc<void>('app_delete_my_data', { p_code: code }),
};
