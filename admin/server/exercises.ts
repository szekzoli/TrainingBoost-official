// Gyakorlattár: lista, létrehozás, szerkesztés, archiválás / visszaállítás, törlés.
import { ApiError, dbError, type SupabaseClient } from './db.ts';
import { assertUuid, parseExerciseInput } from './validate.ts';

export type ExerciseRow = {
  id: string;
  name: string;
  category: string | null;
  video_url: string | null;
  technique_note: string | null;
  archived: boolean;
  plan_count: number;
};

const COLUMNS = 'id, name, category, video_url, technique_note, archived';

// Kis- és nagybetű különbség nélkül (az adatbázis lower(name) egyedi indexe a végső védelem).
async function assertNameFree(db: SupabaseClient, name: string, exceptId?: string) {
  const wanted = name.toLowerCase();
  const rows = await listExercises(db);
  if (rows.some((r) => r.id !== exceptId && r.name.toLowerCase() === wanted)) {
    throw new ApiError(409, 'duplicate', 'Már van ilyen nevű gyakorlat a gyakorlattárban.');
  }
}

export async function listExercises(db: SupabaseClient): Promise<ExerciseRow[]> {
  const { data, error } = await db.rpc('admin_list_exercises');
  if (error) throw dbError(error);
  return (data ?? []) as ExerciseRow[];
}

export async function createExercise(db: SupabaseClient, body: unknown): Promise<ExerciseRow> {
  const input = parseExerciseInput(body, false);
  await assertNameFree(db, input.name!);
  const { data, error } = await db
    .from('exercises')
    .insert({
      name: input.name,
      category: input.category ?? null,
      video_url: input.video_url ?? null,
      technique_note: input.technique_note ?? null,
    })
    .select(COLUMNS)
    .single();
  if (error) throw dbError(error);
  return { ...data, plan_count: 0 } as ExerciseRow;
}

export async function updateExercise(db: SupabaseClient, idRaw: unknown, body: unknown): Promise<ExerciseRow> {
  const id = assertUuid(idRaw);
  const input = parseExerciseInput(body, true);
  if (input.name !== undefined) await assertNameFree(db, input.name, id);
  const { data, error } = await db.from('exercises').update(input).eq('id', id).select(COLUMNS).maybeSingle();
  if (error) throw dbError(error);
  if (!data) throw new ApiError(404, 'not_found', 'A gyakorlat nem található.');
  return { ...data, plan_count: await planCount(db, id) } as ExerciseRow;
}

async function planCount(db: SupabaseClient, id: string): Promise<number> {
  const rows = await listExercises(db);
  return rows.find((r) => r.id === id)?.plan_count ?? 0;
}

export async function deleteExercise(db: SupabaseClient, idRaw: unknown): Promise<void> {
  const id = assertUuid(idRaw);
  // Csak akkor törölhető, ha egyetlen napban sem szerepel; különben archiválni kell.
  const { count, error: countError } = await db
    .from('day_exercises')
    .select('id', { count: 'exact', head: true })
    .eq('exercise_id', id);
  if (countError) throw dbError(countError);
  if ((count ?? 0) > 0) {
    throw new ApiError(409, 'in_use', 'A gyakorlat tervben szerepel, ezért nem törölhető. Archiváld helyette.');
  }
  const { data, error } = await db.from('exercises').delete().eq('id', id).select('id');
  if (error) throw dbError(error);
  if (!data || data.length === 0) throw new ApiError(404, 'not_found', 'A gyakorlat nem található.');
}
