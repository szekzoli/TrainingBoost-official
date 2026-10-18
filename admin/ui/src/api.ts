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

export const api = {
  status: () => request<Status>('GET', '/api/status'),
  listExercises: () => request<{ exercises: Exercise[] }>('GET', '/api/exercises').then((r) => r.exercises),
  createExercise: (input: ExerciseInput) =>
    request<{ exercise: Exercise }>('POST', '/api/exercises', input).then((r) => r.exercise),
  updateExercise: (id: string, input: ExerciseInput) =>
    request<{ exercise: Exercise }>('PATCH', `/api/exercises/${id}`, input).then((r) => r.exercise),
  deleteExercise: (id: string) => request<{ ok: true }>('DELETE', `/api/exercises/${id}`),
};
