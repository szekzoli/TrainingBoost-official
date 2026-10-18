import { getSupabase } from './supabase';

export const CONSENT_VERSION = '2026-10';

export type PlanExercise = {
  id: string;
  position: number;
  section: string | null;
  group_label: string | null;
  sets: number;
  reps: string;
  rest_seconds: number | null;
  note: string | null;
  exercise: {
    id: string;
    name: string;
    video_url: string | null;
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
  plan: { id: string; slug: string; title: string; description: string | null };
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
  note: string | null;
  created_at: string;
  sets: SetLog[];
};

export type ApiErrorKind = 'invalid_code' | 'consent_required' | 'not_configured' | 'other';

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
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    const msg = error.message || '';
    if (msg.includes('invalid_code')) throw new AppApiError('invalid_code');
    if (msg.includes('consent_required')) throw new AppApiError('consent_required');
    throw new AppApiError('other');
  }
  return data as T;
}

export const appApi = {
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
  completeDay: (code: string, planDayId: string, note: string | null) =>
    rpc<{ plan_day_id: string; completed_at: string; note: string | null }>('app_complete_day', {
      p_code: code,
      p_plan_day_id: planDayId,
      p_note: note,
    }),
  deleteMyData: (code: string) => rpc<void>('app_delete_my_data', { p_code: code }),
};
