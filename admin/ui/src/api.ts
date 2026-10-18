// A felület kizárólag a helyi szerverrel beszél (/api, a Vite proxyn át), a Supabase-szel soha.

export type Exercise = {
  id: string;
  name: string;
  category: string | null;
  video_url: string | null;
  technique_note: string | null;
  archived: boolean;
  plan_count: number;
};

export type ExerciseInput = {
  name?: string;
  category?: string | null;
  video_url?: string | null;
  technique_note?: string | null;
  archived?: boolean;
};

export type PlanSummary = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  is_template: boolean;
  created_at: string;
  week_count: number;
  max_days: number;
  client_count: number;
};

export type PlanRow = {
  id: string;
  exercise_id: string;
  position: number;
  section: string | null;
  group_label: string | null;
  sets: number;
  reps: string;
  resistance: string | null;
  rest_seconds: number | null;
  note: string | null;
  has_logs: boolean;
  exercise: { id: string; name: string; archived: boolean; video_url: string | null };
};

export type PlanDay = {
  id: string;
  week: number;
  day: number;
  title: string | null;
  has_logs: boolean;
  exercises: PlanRow[];
};

export type PlanFull = {
  plan: {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    is_template: boolean;
    client_count: number;
  };
  days: PlanDay[];
};

export type Scope = 'this' | 'from' | 'all';

export type RowPatch = {
  section?: string | null;
  sets?: number;
  reps?: string;
  resistance?: string | null;
  rest_seconds?: number | null;
  note?: string | null;
};

export type RowAdd = {
  exercise_id: string;
  section?: string | null;
  sets?: number;
  reps?: string;
};

export type PlanCreate = {
  title: string;
  slug: string;
  description?: string | null;
  weeks: number;
  days: number;
  is_template?: boolean;
};

export type Status = { configured: true } | { configured: false; problems: string[] };

export class ApiFailure extends Error {
  status: number;
  code: string;
  field?: string;
  problems?: string[];
  constructor(status: number, code: string, message: string, field?: string, problems?: string[]) {
    super(message);
    this.status = status;
    this.code = code;
    this.field = field;
    this.problems = problems;
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiFailure(0, 'network', 'A helyi szerver nem érhető el. Fut az `npm run admin`?');
  }
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    /* nem JSON válasz */
  }
  if (!res.ok) {
    throw new ApiFailure(
      res.status,
      data?.error ?? 'error',
      data?.message ?? 'Ismeretlen hiba történt.',
      data?.field,
      data?.problems,
    );
  }
  return data as T;
}

export function errorMessage(err: unknown): string {
  return err instanceof ApiFailure ? err.message : 'Ismeretlen hiba történt.';
}

export const api = {
  status: () => request<Status>('GET', '/api/status'),

  // Gyakorlattár
  listExercises: () => request<{ exercises: Exercise[] }>('GET', '/api/exercises').then((r) => r.exercises),
  createExercise: (input: ExerciseInput) =>
    request<{ exercise: Exercise }>('POST', '/api/exercises', input).then((r) => r.exercise),
  updateExercise: (id: string, input: ExerciseInput) =>
    request<{ exercise: Exercise }>('PATCH', `/api/exercises/${id}`, input).then((r) => r.exercise),
  deleteExercise: (id: string) => request<{ ok: true }>('DELETE', `/api/exercises/${id}`),

  // Tervek és sablonok
  listPlans: (templates: boolean) =>
    request<{ plans: PlanSummary[] }>('GET', `/api/plans?template=${templates ? 1 : 0}`).then((r) => r.plans),
  getPlan: (id: string) => request<PlanFull>('GET', `/api/plans/${id}`),
  createPlan: (input: PlanCreate) => request<{ id: string }>('POST', '/api/plans', input),
  updatePlan: (
    id: string,
    input: { title?: string; slug?: string; description?: string | null; is_template?: boolean },
  ) => request<{ plan: unknown }>('PATCH', `/api/plans/${id}`, input),
  deletePlan: (id: string) => request<{ ok: true }>('DELETE', `/api/plans/${id}`),
  copyPlan: (id: string, input: { title: string; slug: string }) =>
    request<{ id: string }>('POST', `/api/plans/${id}/copy`, input),
  saveAsTemplate: (id: string, input: { title: string; slug: string }) =>
    request<{ id: string }>('POST', `/api/plans/${id}/save-as-template`, input),
  fromTemplate: (id: string, input: { title: string; slug: string; weeks?: number | null }) =>
    request<{ id: string }>('POST', `/api/plans/${id}/from-template`, input),
  copyWeek: (id: string, from_week: number, to_week: number) =>
    request<{ days: number; exercises: number }>('POST', `/api/plans/${id}/copy-week`, { from_week, to_week }),

  // Napok
  addDay: (planId: string, week: number) => request<{ id: string }>('POST', `/api/plans/${planId}/days`, { week }),
  renameDay: (dayId: string, title: string | null) => request<unknown>('PATCH', `/api/days/${dayId}`, { title }),
  deleteDay: (dayId: string) => request<{ ok: true }>('DELETE', `/api/days/${dayId}`),

  // Gyakorlat-sorok
  addRow: (dayId: string, input: RowAdd) => request<{ id: string }>('POST', `/api/days/${dayId}/exercises`, input),
  updateRow: (rowId: string, patch: RowPatch, scope: Scope) =>
    request<{ updated: number; unmatched_weeks: number[]; row: Omit<PlanRow, 'exercise' | 'has_logs'> }>(
      'PATCH',
      `/api/day-exercises/${rowId}`,
      { ...patch, scope },
    ),
  deleteRow: (rowId: string) => request<{ ok: true }>('DELETE', `/api/day-exercises/${rowId}`),
  setOrder: (dayId: string, ids: string[]) => request<{ ok: true }>('PUT', `/api/days/${dayId}/order`, { ids }),
  setGroup: (ids: string[], label: string | null) => request<{ ok: true }>('PUT', '/api/groups', { ids, label }),
};
