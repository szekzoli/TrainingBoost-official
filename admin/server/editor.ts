// Terv-szerkesztő: napok és gyakorlat-sorok. A többlépéses műveletek SQL függvények (atomiak).
import { ApiError, callRpc, dbError, type SupabaseClient } from './db.ts';
import { assertUuid } from './validate.ts';
import {
  parseAddDay,
  parseDayUpdate,
  parseGroup,
  parseOrder,
  parseRowAdd,
  parseRowUpdate,
} from './validate-plans.ts';

export async function addDay(db: SupabaseClient, planId: unknown, body: unknown): Promise<{ id: string }> {
  const plan = assertUuid(planId);
  const i = parseAddDay(body);
  const id = await callRpc<string>(db, 'admin_add_day', { p_plan: plan, p_week: i.week });
  return { id };
}

export async function updateDay(db: SupabaseClient, dayId: unknown, body: unknown) {
  const id = assertUuid(dayId);
  const i = parseDayUpdate(body);
  const { data, error } = await db
    .from('plan_days')
    .update({ title: i.title })
    .eq('id', id)
    .select('id, title')
    .maybeSingle();
  if (error) throw dbError(error);
  if (!data) throw new ApiError(404, 'day_not_found', 'A nap nem található.');
  return data;
}

export async function deleteDay(db: SupabaseClient, dayId: unknown): Promise<void> {
  await callRpc<void>(db, 'admin_delete_day', { p_day: assertUuid(dayId) });
}

export async function addRow(db: SupabaseClient, dayId: unknown, body: unknown): Promise<{ id: string }> {
  const day = assertUuid(dayId);
  const i = parseRowAdd(body);
  const id = await callRpc<string>(db, 'admin_add_day_exercise', {
    p_day: day,
    p_exercise: i.exercise_id,
    p_section: i.section,
    p_sets: i.sets,
    p_reps: i.reps,
    p_resistance: i.resistance,
    p_rest_seconds: i.rest_seconds,
    p_note: i.note,
  });
  return { id };
}

export function updateRow(db: SupabaseClient, rowId: unknown, body: unknown) {
  const id = assertUuid(rowId);
  const i = parseRowUpdate(body);
  return callRpc<{ updated: number; unmatched_weeks: number[]; row: unknown }>(db, 'admin_update_day_exercise', {
    p_id: id,
    p_fields: i.fields,
    p_scope: i.scope,
  });
}

export async function deleteRow(db: SupabaseClient, rowId: unknown): Promise<void> {
  await callRpc<void>(db, 'admin_delete_day_exercise', { p_id: assertUuid(rowId) });
}

export async function setOrder(db: SupabaseClient, dayId: unknown, body: unknown): Promise<void> {
  const day = assertUuid(dayId);
  const i = parseOrder(body);
  await callRpc<void>(db, 'admin_set_exercise_order', { p_day: day, p_ids: i.ids });
}

export async function setGroup(db: SupabaseClient, body: unknown): Promise<void> {
  const i = parseGroup(body);
  await callRpc<void>(db, 'admin_set_group', { p_ids: i.ids, p_label: i.label });
}
