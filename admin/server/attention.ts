// „Figyelendő”: az ügyfelek jelzésértékű edzései (sorozat-megjegyzés, nagyon nehéz / nagyon könnyű
// értékelés, edzés-jegyzet), amíg az edző „Láttam”-ra nem jelöli őket. A 011-figyelendo.sql kell hozzá.
import { ApiError, callRpc, type SupabaseClient } from './db.ts';
import { ValidationError, assertUuid } from './validate.ts';

export type AttentionSet = {
  exercise_name: string;
  position: number;
  set_number: number;
  weight_kg: number | null;
  reps: number | null;
  note: string;
};

export type AttentionItem = {
  workout_log_id: string;
  attempt?: number;
  client_id: string;
  client_label: string;
  plan_id: string;
  week: number;
  day: number;
  day_title: string | null;
  performed_on: string | null;
  completed_at: string | null;
  rating: number | null;
  note: string | null;
  sets: AttentionSet[];
  last_change: string;
  reviewed_at: string | null;
};

const isMissingFunction = (err: unknown) => err instanceof ApiError && err.code === 'migration_missing';

/** A lista; ha a 011-es SQL még nem futott, üres lista és jelzés (nem hiba). */
export async function listAttention(db: SupabaseClient): Promise<{ items: AttentionItem[]; available: boolean }> {
  try {
    const items = (await callRpc<AttentionItem[]>(db, 'admin_attention')) ?? [];
    return { items, available: true };
  } catch (err) {
    if (isMissingFunction(err)) return { items: [], available: false };
    throw err;
  }
}

/** „Láttam”: egy vagy több edzés olvasottnak jelölése. */
export async function markReviewed(db: SupabaseClient, body: unknown): Promise<{ count: number }> {
  const ids = (body as { ids?: unknown } | null)?.ids;
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 200) {
    throw new ValidationError('ids', 'Legalább egy, legfeljebb 200 edzés jelölhető meg egyszerre.');
  }
  const clean = ids.map((id) => assertUuid(id, 'ids'));
  const count = await callRpc<number>(db, 'admin_mark_reviewed', { p_logs: clean });
  return { count: count ?? 0 };
}
