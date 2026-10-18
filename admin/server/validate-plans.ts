// Tervek, napok és gyakorlat-sorok bemenet-ellenőrzése (a gyakorlatoké a validate.ts-ben van).
import { ValidationError, assertUuid, clean, optionalText } from './validate.ts';

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function reqObject(body: unknown): Record<string, unknown> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new ValidationError('body', 'Érvénytelen kérés.');
  }
  return body as Record<string, unknown>;
}

function rejectUnknown(b: Record<string, unknown>, allowed: string[]) {
  for (const k of Object.keys(b)) {
    if (!allowed.includes(k)) throw new ValidationError(k, 'Ismeretlen mező.');
  }
}

function reqTitle(v: unknown): string {
  if (typeof v !== 'string') throw new ValidationError('title', 'A cím kötelező.');
  const t = clean(v, false).replace(/\s+/g, ' ').trim();
  if (t.length === 0) throw new ValidationError('title', 'A cím kötelező.');
  if (t.length > 120) throw new ValidationError('title', 'A cím legfeljebb 120 karakter lehet.');
  return t;
}

function reqSlug(v: unknown): string {
  if (typeof v !== 'string') throw new ValidationError('slug', 'A slug kötelező.');
  const s = v.trim();
  if (s.length === 0) throw new ValidationError('slug', 'A slug kötelező.');
  if (s.length > 80 || !SLUG_RE.test(s)) {
    throw new ValidationError('slug', 'A slug csak kisbetűt, számot és kötőjelet tartalmazhat (pl. "6-hetes-terv").');
  }
  return s;
}

function intInRange(v: unknown, field: string, label: string, min: number, max: number): number {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) {
    throw new ValidationError(field, `${label}: ${min} és ${max} közötti egész szám kell.`);
  }
  return v;
}

function optInt(v: unknown, field: string, label: string, min: number, max: number): number | null {
  if (v === null || v === undefined || v === '') return null;
  return intInRange(v, field, label, min, max);
}

function optBool(b: Record<string, unknown>, field: string): boolean | undefined {
  if (!(field in b) || b[field] === undefined) return undefined;
  if (typeof b[field] !== 'boolean') throw new ValidationError(field, 'Igaz/hamis érték kell.');
  return b[field] as boolean;
}

export type PlanCreateInput = {
  title: string;
  slug: string;
  description: string | null;
  weeks: number;
  days: number;
  is_template: boolean;
};

export function parsePlanCreate(body: unknown): PlanCreateInput {
  const b = reqObject(body);
  rejectUnknown(b, ['title', 'slug', 'description', 'weeks', 'days', 'is_template']);
  return {
    title: reqTitle(b.title),
    slug: reqSlug(b.slug),
    description: optionalText(b.description, 'description', 'A leírás', 2000, true),
    weeks: intInRange(b.weeks, 'weeks', 'A hetek száma', 1, 12),
    days: intInRange(b.days, 'days', 'A napok száma hetente', 1, 7),
    is_template: optBool(b, 'is_template') === true,
  };
}

// weeks: csak sablonból létrehozásnál, egyhetes sablon kiterjesztéséhez
export type PlanCopyInput = { title: string; slug: string; weeks: number | null };

export function parsePlanCopy(body: unknown): PlanCopyInput {
  const b = reqObject(body);
  rejectUnknown(b, ['title', 'slug', 'weeks']);
  return {
    title: reqTitle(b.title),
    slug: reqSlug(b.slug),
    weeks: optInt(b.weeks, 'weeks', 'A hetek száma', 1, 12),
  };
}

export type PlanUpdateInput = { title?: string; slug?: string; description?: string | null; is_template?: boolean };

export function parsePlanUpdate(body: unknown): PlanUpdateInput {
  const b = reqObject(body);
  rejectUnknown(b, ['title', 'slug', 'description', 'is_template']);
  const out: PlanUpdateInput = {};
  if ('title' in b) out.title = reqTitle(b.title);
  if ('slug' in b) out.slug = reqSlug(b.slug);
  if ('description' in b) out.description = optionalText(b.description, 'description', 'A leírás', 2000, true);
  if ('is_template' in b) {
    const t = optBool(b, 'is_template');
    if (t === undefined) throw new ValidationError('is_template', 'Igaz/hamis érték kell.');
    out.is_template = t;
  }
  if (Object.keys(out).length === 0) throw new ValidationError('body', 'Nincs módosítandó mező.');
  return out;
}

export function parseCopyWeek(body: unknown): { from_week: number; to_week: number } {
  const b = reqObject(body);
  rejectUnknown(b, ['from_week', 'to_week']);
  return {
    from_week: intInRange(b.from_week, 'from_week', 'A forrás hét', 1, 52),
    to_week: intInRange(b.to_week, 'to_week', 'A cél hét', 1, 52),
  };
}

export function parseAddDay(body: unknown): { week: number } {
  const b = reqObject(body);
  rejectUnknown(b, ['week']);
  return { week: intInRange(b.week, 'week', 'A hét', 1, 52) };
}

export function parseDayUpdate(body: unknown): { title: string | null } {
  const b = reqObject(body);
  rejectUnknown(b, ['title']);
  if (!('title' in b)) throw new ValidationError('body', 'Nincs módosítandó mező.');
  return { title: optionalText(b.title, 'title', 'A nap címe', 60) };
}

export type RowAddInput = {
  exercise_id: string;
  section: string | null;
  sets: number;
  reps: string;
  resistance: string | null;
  rest_seconds: number | null;
  note: string | null;
};

function reqReps(v: unknown): string {
  const t = optionalText(v, 'reps', 'Az ismétlés', 60);
  if (t === null) throw new ValidationError('reps', 'Az ismétlés kötelező.');
  return t;
}

export function parseRowAdd(body: unknown): RowAddInput {
  const b = reqObject(body);
  rejectUnknown(b, ['exercise_id', 'section', 'sets', 'reps', 'resistance', 'rest_seconds', 'note']);
  return {
    exercise_id: assertUuid(b.exercise_id, 'exercise_id'),
    section: optionalText(b.section, 'section', 'A szakasz', 60),
    sets: b.sets === undefined ? 3 : intInRange(b.sets, 'sets', 'A sorozat', 1, 50),
    reps: b.reps === undefined ? '10' : reqReps(b.reps),
    resistance: optionalText(b.resistance, 'resistance', 'Az ellenállás', 80),
    rest_seconds: optInt(b.rest_seconds, 'rest_seconds', 'A szünet', 0, 3600),
    note: optionalText(b.note, 'note', 'A megjegyzés', 1000, true),
  };
}

export const SCOPES = ['this', 'from', 'all'] as const;
export type Scope = (typeof SCOPES)[number];

// A `fields` csak a ténylegesen megadott mezőket tartalmazza (null = törlés).
export function parseRowUpdate(body: unknown): { fields: Record<string, unknown>; scope: Scope } {
  const b = reqObject(body);
  rejectUnknown(b, ['scope', 'section', 'sets', 'reps', 'resistance', 'rest_seconds', 'note']);
  const scope = b.scope === undefined ? 'this' : b.scope;
  if (!SCOPES.includes(scope as Scope)) throw new ValidationError('scope', 'Érvénytelen hatókör.');

  const fields: Record<string, unknown> = {};
  if ('section' in b) fields.section = optionalText(b.section, 'section', 'A szakasz', 60);
  if ('sets' in b) fields.sets = intInRange(b.sets, 'sets', 'A sorozat', 1, 50);
  if ('reps' in b) fields.reps = reqReps(b.reps);
  if ('resistance' in b) fields.resistance = optionalText(b.resistance, 'resistance', 'Az ellenállás', 80);
  if ('rest_seconds' in b) fields.rest_seconds = optInt(b.rest_seconds, 'rest_seconds', 'A szünet', 0, 3600);
  if ('note' in b) fields.note = optionalText(b.note, 'note', 'A megjegyzés', 1000, true);
  if (Object.keys(fields).length === 0) throw new ValidationError('body', 'Nincs módosítandó mező.');
  return { fields, scope: scope as Scope };
}

function uuidArray(v: unknown, field: string, max: number): string[] {
  if (!Array.isArray(v) || v.length < 1 || v.length > max) {
    throw new ValidationError(field, 'Érvénytelen azonosító-lista.');
  }
  return v.map((x) => assertUuid(x, field));
}

export function parseOrder(body: unknown): { ids: string[] } {
  const b = reqObject(body);
  rejectUnknown(b, ['ids']);
  return { ids: uuidArray(b.ids, 'ids', 200) };
}

export function parseGroup(body: unknown): { ids: string[]; label: string | null } {
  const b = reqObject(body);
  rejectUnknown(b, ['ids', 'label']);
  const ids = uuidArray(b.ids, 'ids', 50);
  let label: string | null = null;
  if (b.label !== null && b.label !== undefined) {
    if (typeof b.label !== 'string' || !/^[A-Z]$/.test(b.label)) {
      throw new ValidationError('label', 'A szuperszett jelölése egy nagybetű (A–Z) lehet.');
    }
    label = b.label;
  }
  return { ids, label };
}
