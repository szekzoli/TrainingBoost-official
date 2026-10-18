// Tervek és sablonok: lista, létrehozás, másolás, sablonból létrehozás, módosítás, törlés, hét másolása.
import { ApiError, callRpc, dbError, type SupabaseClient } from './db.ts';
import { assertUuid } from './validate.ts';
import {
  parseCopyWeek,
  parsePlanCopy,
  parsePlanCreate,
  parsePlanUpdate,
} from './validate-plans.ts';

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

export function listPlans(db: SupabaseClient, templates: boolean): Promise<PlanSummary[]> {
  return callRpc<PlanSummary[]>(db, 'admin_list_plans', { p_template: templates }).then((r) => r ?? []);
}

export function getPlan(db: SupabaseClient, idRaw: unknown) {
  return callRpc<unknown>(db, 'admin_get_plan', { p_plan: assertUuid(idRaw) });
}

export async function createPlan(db: SupabaseClient, body: unknown): Promise<{ id: string }> {
  const i = parsePlanCreate(body);
  const id = await callRpc<string>(db, 'admin_create_plan', {
    p_title: i.title,
    p_slug: i.slug,
    p_description: i.description,
    p_weeks: i.weeks,
    p_days: i.days,
    p_is_template: i.is_template,
  });
  return { id };
}

// Másolás (új cím és slug); asTemplate = true: "Sablonná mentés" (a másolat sablon lesz).
export async function copyPlan(
  db: SupabaseClient,
  idRaw: unknown,
  body: unknown,
  asTemplate: boolean,
): Promise<{ id: string }> {
  const source = assertUuid(idRaw);
  const i = parsePlanCopy(body);
  const id = await callRpc<string>(db, 'admin_copy_plan', {
    p_source: source,
    p_title: i.title,
    p_slug: i.slug,
    p_as_template: asTemplate,
  });
  return { id };
}

// Új terv sablonból: a teljes terv másolata (egyhetes sablonnál opcionálisan több hétre kiterjesztve).
export async function planFromTemplate(db: SupabaseClient, idRaw: unknown, body: unknown): Promise<{ id: string }> {
  const source = assertUuid(idRaw);
  const i = parsePlanCopy(body);
  const id = await callRpc<string>(db, 'admin_plan_from_template', {
    p_source: source,
    p_title: i.title,
    p_slug: i.slug,
    p_weeks: i.weeks,
  });
  return { id };
}

export async function updatePlan(db: SupabaseClient, idRaw: unknown, body: unknown) {
  const id = assertUuid(idRaw);
  const input = parsePlanUpdate(body);
  const { data, error } = await db
    .from('plans')
    .update(input)
    .eq('id', id)
    .select('id, slug, title, description, is_template')
    .maybeSingle();
  if (error) {
    if (error.code === '23505') throw new ApiError(409, 'slug_taken', 'Ez a slug már foglalt, adj meg másikat.');
    throw dbError(error);
  }
  if (!data) throw new ApiError(404, 'plan_not_found', 'A terv nem található.');
  return data;
}

export async function deletePlan(db: SupabaseClient, idRaw: unknown): Promise<void> {
  await callRpc<void>(db, 'admin_delete_plan', { p_plan: assertUuid(idRaw) });
}

export async function copyWeek(db: SupabaseClient, idRaw: unknown, body: unknown) {
  const plan = assertUuid(idRaw);
  const i = parseCopyWeek(body);
  return callRpc<{ days: number; exercises: number }>(db, 'admin_copy_week', {
    p_plan: plan,
    p_from_week: i.from_week,
    p_to_week: i.to_week,
  });
}
