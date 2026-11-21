// Ügyfelek: lista, létrehozás (hozzáférési kóddal), módosítás, visszavonás / visszaállítás.
//
// A hozzáférési kód a szerveren készül, és kizárólag a létrehozás válaszában szerepel egyszer.
// Az adatbázisba csak a lenyomata kerül. A kód és a lenyomat soha nem kerül naplóba, hibaüzenetbe,
// és semelyik lekérdezés nem adja vissza (az access_code_hash oszlopot sehol nem választjuk ki).
import { createHash, randomBytes } from 'node:crypto';
import { ApiError, callRpc, dbError, type SupabaseClient } from './db.ts';
import { ValidationError, assertUuid, clean, optionalText } from './validate.ts';

/** Az emlékeztető állapota: lejárt, 7 napon belül esedékes, rendben, vagy nincs dátum. */
export type DueStatus = 'overdue' | 'soon' | 'ok' | 'none';

export type ClientRow = {
  id: string;
  label: string;
  plan_id: string;
  plan_title: string;
  plan_slug: string;
  created_at: string;
  revoked_at: string | null;
  consent_at: string | null;
  plan_started_on: string | null;
  plan_due_on: string | null;
  coach_note: string | null;
  // az admin_client_overview() adatai (a listában és a részleteknél)
  plan_weeks: number;
  days_total: number;
  days_done: number;
  last_activity: string | null;
  last_performed_on: string | null;
  due_status: DueStatus;
};

const COLUMNS =
  'id, label, plan_id, created_at, revoked_at, consent_at, plan_started_on, plan_due_on, coach_note, plans(title, slug, is_template)';
const PAGE = 1000;
const SOON_DAYS = 7;

type RawClient = {
  id: string;
  label: string;
  plan_id: string;
  created_at: string;
  revoked_at: string | null;
  consent_at: string | null;
  plan_started_on: string | null;
  plan_due_on: string | null;
  coach_note: string | null;
  plans: { title: string; slug: string } | { title: string; slug: string }[] | null;
};

type Overview = {
  client_id: string;
  plan_weeks: number;
  days_total: number;
  days_done: number;
  last_activity: string | null;
  last_performed_on: string | null;
};

/** A mai nap (budapesti idő szerint) ÉÉÉÉ-HH-NN formában. */
export function todayIso(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Budapest' }).format(new Date());
}

/** ÉÉÉÉ-HH-NN + napok. */
export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const dateOnly = (v: string | null | undefined) => (v ? String(v).slice(0, 10) : null);

export function dueStatus(due: string | null, revoked: boolean, today = todayIso()): DueStatus {
  if (!due || revoked) return 'none';
  if (due < today) return 'overdue';
  if (due <= addDays(today, SOON_DAYS)) return 'soon';
  return 'ok';
}

function toRow(r: RawClient, o?: Overview): ClientRow {
  const plan = Array.isArray(r.plans) ? r.plans[0] : r.plans;
  const due = dateOnly(r.plan_due_on);
  return {
    id: r.id,
    label: r.label,
    plan_id: r.plan_id,
    plan_title: plan?.title ?? '(ismeretlen terv)',
    plan_slug: plan?.slug ?? '',
    created_at: r.created_at,
    revoked_at: r.revoked_at,
    consent_at: r.consent_at,
    plan_started_on: dateOnly(r.plan_started_on),
    plan_due_on: due,
    coach_note: r.coach_note,
    plan_weeks: o?.plan_weeks ?? 0,
    days_total: o?.days_total ?? 0,
    days_done: o?.days_done ?? 0,
    last_activity: o?.last_activity ?? null,
    last_performed_on: dateOnly(o?.last_performed_on),
    due_status: dueStatus(due, r.revoked_at !== null),
  };
}

async function overviewMap(db: SupabaseClient): Promise<Map<string, Overview>> {
  const rows = (await callRpc<Overview[]>(db, 'admin_client_overview')) ?? [];
  return new Map(rows.map((r) => [r.client_id, r]));
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
  const ov = await overviewMap(db);
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from('clients')
      .select(COLUMNS)
      .order('created_at', { ascending: false })
      .order('id')
      .range(from, from + PAGE - 1);
    if (error) throw dbError(error);
    const rows = (data ?? []) as unknown as RawClient[];
    out.push(...rows.map((r) => toRow(r, ov.get(r.id))));
    if (rows.length < PAGE) break;
  }
  return out;
}

async function getRow(db: SupabaseClient, id: string): Promise<ClientRow> {
  const { data, error } = await db.from('clients').select(COLUMNS).eq('id', id).maybeSingle();
  if (error) throw dbError(error);
  if (!data) throw new ApiError(404, 'client_not_found', 'Az ügyfél nem található.');
  const ov = await overviewMap(db);
  return toRow(data as unknown as RawClient, ov.get(id));
}

export type ClientWorkout = {
  plan_day_id: string;
  plan_id: string;
  plan_title: string;
  week: number;
  day: number;
  day_title: string | null;
  performed_on: string | null;
  completed_at: string | null;
  created_at: string;
  rating: number | null;
  note: string | null;
  sets: {
    exercise_id: string;
    exercise_name: string;
    position: number;
    set_number: number;
    weight_kg: number | null;
    reps: number | null;
    prescribed_sets: number;
    prescribed_reps: string;
    prescribed_resistance: string | null;
  }[];
};

// Az ügyfél-oldal adatai: az ügyfél sora és a teljes napló (a legújabb elöl).
export async function getClientDetail(
  db: SupabaseClient,
  idRaw: unknown,
): Promise<{ client: ClientRow; workouts: ClientWorkout[]; weights: { measured_on: string; weight_kg: number }[] }> {
  const id = assertUuid(idRaw);
  const client = await getRow(db, id);
  const workouts = (await callRpc<ClientWorkout[]>(db, 'admin_client_detail', { p_client: id })) ?? [];
  // Testsúly (008-testsuly.sql). Ha a migráció még nem futott, üres lista, nem hiba.
  const { data: w, error: wErr } = await db
    .from('body_weights')
    .select('measured_on, weight_kg')
    .eq('client_id', id)
    .order('measured_on', { ascending: true });
  const weights = wErr ? [] : (w ?? []).map((r) => ({ measured_on: String(r.measured_on).slice(0, 10), weight_kg: Number(r.weight_kg) }));
  return { client, workouts, weights };
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

/** Opcionális dátum (ÉÉÉÉ-HH-NN); üres szöveg vagy null -> null. */
function optDate(v: unknown, field: string, label: string): string | null {
  if (v === null || v === undefined || v === '') return null;
  const real = typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`))
    ? new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v
    : false;
  if (typeof v !== 'string' || !real) {
    throw new ValidationError(field, `${label}: érvénytelen dátum.`);
  }
  if (v < '2020-01-01' || v > '2100-12-31') throw new ValidationError(field, `${label}: érvénytelen dátum.`);
  return v;
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

/** Ékezetmentes, kisbetűs slug-darab ("Kovács Ádám" -> "kovacs-adam"). */
export function slugPart(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30);
}

// Sablonból egyéni terv az ügyfélnek: a sablon mély másolata, a cím végén az ügyfél azonosítójával.
async function planFromTemplateFor(db: SupabaseClient, templateId: string, label: string): Promise<string> {
  const { data, error } = await db.from('plans').select('id, title, slug, is_template').eq('id', templateId).maybeSingle();
  if (error) throw dbError(error);
  if (!data) throw new ApiError(404, 'plan_not_found', 'A sablon nem található.');
  if (!data.is_template) throw new ApiError(409, 'not_template', 'A kiválasztott terv nem sablon.');
  const title = `${data.title} – ${label}`.slice(0, 120);
  const base = `${slugPart(data.slug).slice(0, 40)}-${slugPart(label) || 'ugyfel'}`.replace(/-+$/g, '');
  for (let attempt = 0; attempt < 3; attempt++) {
    const slug = `${base}-${randomBytes(2).toString('hex')}`.slice(0, 80);
    try {
      return await callRpc<string>(db, 'admin_plan_from_template', {
        p_source: templateId,
        p_title: title,
        p_slug: slug,
        p_weeks: null,
      });
    } catch (e) {
      if (e instanceof ApiError && e.code === 'slug_taken' && attempt < 2) continue;
      throw e;
    }
  }
  throw new ApiError(500, 'db_error', 'Nem sikerült tervet készíteni a sablonból. Próbáld újra.');
}

// Létrehozás. A válasz tartalmazza az egyszer megjelenő hozzáférési linket.
// Terv: vagy egy meglévő (nem sablon) terv (plan_id), vagy egy sablon (template_id), amiből az
// ügyfélnek saját másolat készül. A kezdés alapértelmezése ma; az "új terv esedékes" dátum
// alapértelmezése a kezdés + a terv hetei.
export async function createClient(
  db: SupabaseClient,
  body: unknown,
  publicBaseUrl: string,
): Promise<{ client: ClientRow; link: string; created_plan_id: string | null }> {
  const b = obj(body);
  reject(b, ['label', 'plan_id', 'template_id', 'plan_started_on', 'plan_due_on', 'coach_note']);
  const label = reqLabel(b.label);
  const started = optDate(b.plan_started_on, 'plan_started_on', 'A kezdés dátuma') ?? todayIso();
  const dueGiven = optDate(b.plan_due_on, 'plan_due_on', 'Az új terv dátuma');
  const note = optionalText(b.coach_note, 'coach_note', 'A jegyzet', 2000, true);
  const hasPlan = b.plan_id !== undefined && b.plan_id !== null && b.plan_id !== '';
  const hasTemplate = b.template_id !== undefined && b.template_id !== null && b.template_id !== '';
  if (hasPlan === hasTemplate) {
    throw new ValidationError('plan_id', 'Válassz egy tervet vagy egy sablont.');
  }
  await assertLabelFree(db, label);

  let planId: string;
  let createdPlan: string | null = null;
  if (hasTemplate) {
    createdPlan = await planFromTemplateFor(db, assertUuid(b.template_id, 'template_id'), label);
    planId = createdPlan;
  } else {
    planId = assertUuid(b.plan_id, 'plan_id');
    await assertAssignablePlan(db, planId);
  }

  try {
    // Az egyedi lenyomat ütközése gyakorlatilag kizárt (128 bit), de újrapróbáljuk.
    for (let attempt = 0; attempt < 3; attempt++) {
      const code = generateAccessCode();
      const { data, error } = await db
        .from('clients')
        .insert({
          label,
          plan_id: planId,
          access_code_hash: hashAccessCode(code),
          plan_started_on: started,
          plan_due_on: dueGiven,
          coach_note: note,
        })
        .select('id')
        .single();
      if (error) {
        if (error.code === '23505' && attempt < 2) continue;
        throw dbError(error);
      }
      let client = await getRow(db, data.id);
      if (!dueGiven && client.plan_weeks > 0) {
        const { error: e2 } = await db
          .from('clients')
          .update({ plan_due_on: addDays(started, client.plan_weeks * 7) })
          .eq('id', data.id);
        if (e2) throw dbError(e2);
        client = await getRow(db, data.id);
      }
      return { client, link: `${publicBaseUrl}/app/t/${code}`, created_plan_id: createdPlan };
    }
    throw new ApiError(500, 'db_error', 'Nem sikerült egyedi hozzáférési kódot készíteni. Próbáld újra.');
  } catch (e) {
    // A sablonból most készült terv ne maradjon árván, ha az ügyfél létrehozása nem sikerült.
    if (createdPlan) await db.rpc('admin_delete_plan', { p_plan: createdPlan });
    throw e;
  }
}

// Módosítás: azonosító, terv, kezdés, új terv dátuma, jegyzet, visszavonás / visszaállítás.
export async function updateClient(db: SupabaseClient, idRaw: unknown, body: unknown): Promise<ClientRow> {
  const id = assertUuid(idRaw);
  const b = obj(body);
  reject(b, ['label', 'plan_id', 'revoked', 'plan_started_on', 'plan_due_on', 'coach_note']);

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
  if ('plan_started_on' in b) patch.plan_started_on = optDate(b.plan_started_on, 'plan_started_on', 'A kezdés dátuma');
  if ('plan_due_on' in b) patch.plan_due_on = optDate(b.plan_due_on, 'plan_due_on', 'Az új terv dátuma');
  if ('coach_note' in b) patch.coach_note = optionalText(b.coach_note, 'coach_note', 'A jegyzet', 2000, true);
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

// Emlékeztetők naptárfájlként (.ics): az aktív ügyfelek "új terv esedékes" dátuma egész napos
// eseményként, 3 nappal előtte riasztással. Google Naptárba / Outlookba / Apple Naptárba importálható.
export async function remindersIcs(db: SupabaseClient): Promise<string> {
  const rows = (await listClients(db)).filter((c) => c.revoked_at === null && c.plan_due_on);
  const esc = (t: string) => t.replace(/[\\;,]/g, (m) => `\\${m}`).replace(/\r?\n/g, '\\n');
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TrainingBoost//Admin//HU',
    'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:TrainingBoost – új edzéstervek',
  ];
  for (const c of rows) {
    const d = c.plan_due_on!.replace(/-/g, '');
    const next = addDays(c.plan_due_on!, 1).replace(/-/g, '');
    lines.push(
      'BEGIN:VEVENT',
      `UID:tb-due-${c.id}@trainingboost.hu`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${d}`,
      `DTEND;VALUE=DATE:${next}`,
      `SUMMARY:${esc(`Új edzésterv: ${c.label}`)}`,
      `DESCRIPTION:${esc(`Jelenlegi terv: ${c.plan_title}. Haladás: ${c.days_done}/${c.days_total} edzés.`)}`,
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${esc(`Új edzésterv esedékes: ${c.label}`)}`,
      'TRIGGER:-P3D',
      'END:VALARM',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
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
