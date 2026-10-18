// Ügyfelek: lista, létrehozás (hozzáférési kóddal), módosítás, visszavonás / visszaállítás.
//
// A hozzáférési kód a szerveren készül, és kizárólag a létrehozás válaszában szerepel egyszer.
// Az adatbázisba csak a lenyomata kerül. A kód és a lenyomat soha nem kerül naplóba, hibaüzenetbe,
// és semelyik lekérdezés nem adja vissza (az access_code_hash oszlopot sehol nem választjuk ki).
import { createHash, randomBytes } from 'node:crypto';
import { ApiError, dbError, type SupabaseClient } from './db.ts';
import { ValidationError, assertUuid, clean } from './validate.ts';

export type ClientRow = {
  id: string;
  label: string;
  plan_id: string;
  plan_title: string;
  plan_slug: string;
  created_at: string;
  revoked_at: string | null;
  consent_at: string | null;
};

const COLUMNS = 'id, label, plan_id, created_at, revoked_at, consent_at, plans(title, slug, is_template)';
const PAGE = 1000;

type RawClient = {
  id: string;
  label: string;
  plan_id: string;
  created_at: string;
  revoked_at: string | null;
  consent_at: string | null;
  plans: { title: string; slug: string } | { title: string; slug: string }[] | null;
};

function toRow(r: RawClient): ClientRow {
  const plan = Array.isArray(r.plans) ? r.plans[0] : r.plans;
  return {
    id: r.id,
    label: r.label,
    plan_id: r.plan_id,
    plan_title: plan?.title ?? '(ismeretlen terv)',
    plan_slug: plan?.slug ?? '',
    created_at: r.created_at,
    revoked_at: r.revoked_at,
    consent_at: r.consent_at,
  };
}

// A kód: 16 véletlen bájt = 32 hexadecimális karakter, kriptográfiailag erős forrásból.
export function generateAccessCode(): string {
  return randomBytes(16).toString('hex');
}

// Pontosan az SQL encode(sha256(convert_to(code, 'utf8')), 'hex') értéke (kisbetűs hexadecimális).
export function hashAccessCode(code: string): string {
  return createHash('sha256').update(code, 'utf8').digest('hex');
}

export async function listClients(db: SupabaseClient): Promise<ClientRow[]> {
  const out: ClientRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from('clients')
      .select(COLUMNS)
      .order('created_at', { ascending: false })
      .order('id')
      .range(from, from + PAGE - 1);
    if (error) throw dbError(error);
    const rows = (data ?? []) as unknown as RawClient[];
    out.push(...rows.map(toRow));
    if (rows.length < PAGE) break;
  }
  return out;
}

async function getRow(db: SupabaseClient, id: string): Promise<ClientRow> {
  const { data, error } = await db.from('clients').select(COLUMNS).eq('id', id).maybeSingle();
  if (error) throw dbError(error);
  if (!data) throw new ApiError(404, 'client_not_found', 'Az ügyfél nem található.');
  return toRow(data as unknown as RawClient);
}

// Részletek a módosítás előtti figyelmeztetéshez: hány naplózott edzése van az ügyfélnek.
export async function getClient(db: SupabaseClient, idRaw: unknown): Promise<ClientRow & { log_count: number }> {
  const id = assertUuid(idRaw);
  const row = await getRow(db, id);
  const { count, error } = await db
    .from('workout_logs')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', id);
  if (error) throw dbError(error);
  return { ...row, log_count: count ?? 0 };
}

function reqLabel(v: unknown): string {
  if (typeof v !== 'string') throw new ValidationError('label', 'Az azonosító kötelező.');
  const t = clean(v, false).replace(/\s+/g, ' ').trim();
  if (t.length === 0) throw new ValidationError('label', 'Az azonosító kötelező.');
  if (t.length > 40) throw new ValidationError('label', 'Az azonosító legfeljebb 40 karakter lehet.');
  return t;
}

function reject(b: Record<string, unknown>, allowed: string[]) {
  for (const k of Object.keys(b)) {
    if (!allowed.includes(k)) throw new ValidationError(k, 'Ismeretlen mező.');
  }
}

function obj(body: unknown): Record<string, unknown> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new ValidationError('body', 'Érvénytelen kérés.');
  }
  return body as Record<string, unknown>;
}

// Csak létező, nem sablon terv rendelhető ügyfélhez.
async function assertAssignablePlan(db: SupabaseClient, planId: string) {
  const { data, error } = await db.from('plans').select('id, is_template').eq('id', planId).maybeSingle();
  if (error) throw dbError(error);
  if (!data) throw new ApiError(404, 'plan_not_found', 'A terv nem található.');
  if (data.is_template) {
    throw new ApiError(409, 'plan_is_template', 'Sablon nem rendelhető ügyfélhez. Készíts belőle tervet.');
  }
}

async function assertLabelFree(db: SupabaseClient, label: string, exceptId?: string) {
  const wanted = label.toLowerCase();
  const all = await listClients(db);
  if (all.some((c) => c.id !== exceptId && c.label.toLowerCase() === wanted)) {
    throw new ApiError(409, 'label_taken', 'Ez az azonosító már használatban van, adj meg másikat.');
  }
}

// Létrehozás. A válasz tartalmazza az egyszer megjelenő hozzáférési linket.
export async function createClient(
  db: SupabaseClient,
  body: unknown,
  publicBaseUrl: string,
): Promise<{ client: ClientRow; link: string }> {
  const b = obj(body);
  reject(b, ['label', 'plan_id']);
  const label = reqLabel(b.label);
  const planId = assertUuid(b.plan_id, 'plan_id');
  await assertAssignablePlan(db, planId);
  await assertLabelFree(db, label);

  // Az egyedi lenyomat ütközése gyakorlatilag kizárt (128 bit), de újrapróbáljuk.
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = generateAccessCode();
    const { data, error } = await db
      .from('clients')
      .insert({ label, plan_id: planId, access_code_hash: hashAccessCode(code) })
      .select('id')
      .single();
    if (error) {
      if (error.code === '23505' && attempt < 2) continue;
      throw dbError(error);
    }
    const client = await getRow(db, data.id);
    return { client, link: `${publicBaseUrl}/app/t/${code}` };
  }
  throw new ApiError(500, 'db_error', 'Nem sikerült egyedi hozzáférési kódot készíteni. Próbáld újra.');
}

// Módosítás: azonosító, terv, visszavonás / visszaállítás.
export async function updateClient(db: SupabaseClient, idRaw: unknown, body: unknown): Promise<ClientRow> {
  const id = assertUuid(idRaw);
  const b = obj(body);
  reject(b, ['label', 'plan_id', 'revoked']);

  const current = await getRow(db, id);
  const patch: Record<string, unknown> = {};

  if ('label' in b) {
    const label = reqLabel(b.label);
    if (label !== current.label) {
      await assertLabelFree(db, label, id);
      patch.label = label;
    }
  }
  if ('plan_id' in b) {
    const planId = assertUuid(b.plan_id, 'plan_id');
    if (planId !== current.plan_id) {
      await assertAssignablePlan(db, planId);
      patch.plan_id = planId;
    }
  }
  if ('revoked' in b) {
    if (typeof b.revoked !== 'boolean') throw new ValidationError('revoked', 'Igaz/hamis érték kell.');
    if (b.revoked && current.revoked_at === null) patch.revoked_at = new Date().toISOString();
    if (!b.revoked && current.revoked_at !== null) patch.revoked_at = null;
  }
  if (Object.keys(b).length === 0) throw new ValidationError('body', 'Nincs módosítandó mező.');

  if (Object.keys(patch).length === 0) return current;
  const { error } = await db.from('clients').update(patch).eq('id', id);
  if (error) throw dbError(error);
  return getRow(db, id);
}

// Új hozzáférési kód: a régi lenyomatot lecseréli, így a régi link azonnal érvénytelen.
// Az ügyfél sora (és a naplózott adatai) változatlanok maradnak; a visszavont állapot sem változik.
export async function regenerateLink(
  db: SupabaseClient,
  idRaw: unknown,
  publicBaseUrl: string,
): Promise<{ client: ClientRow; link: string }> {
  const id = assertUuid(idRaw);
  await getRow(db, id); // 404, ha nincs ilyen ügyfél

  for (let attempt = 0; attempt < 3; attempt++) {
    const code = generateAccessCode();
    const { data, error } = await db
      .from('clients')
      .update({ access_code_hash: hashAccessCode(code) })
      .eq('id', id)
      .select('id');
    if (error) {
      if (error.code === '23505' && attempt < 2) continue;
      throw dbError(error);
    }
    if (!data || data.length === 0) throw new ApiError(404, 'client_not_found', 'Az ügyfél nem található.');
    return { client: await getRow(db, id), link: `${publicBaseUrl}/app/t/${code}` };
  }
  throw new ApiError(500, 'db_error', 'Nem sikerült egyedi hozzáférési kódot készíteni. Próbáld újra.');
}
