// A szerver oldali bemenet-ellenőrzés. Minden mező típusát, hosszát és tartalmát itt szűrjük.
import { getVideoInfo } from '../../src/lib/video.ts';

export class ValidationError extends Error {
  field: string;
  constructor(field: string, message: string) {
    super(message);
    this.field = field;
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function assertUuid(value: unknown, field = 'id'): string {
  if (typeof value !== 'string' || !UUID_RE.test(value)) {
    throw new ValidationError(field, 'Érvénytelen azonosító.');
  }
  return value.toLowerCase();
}

// Vezérlőkarakterek nélkül (a sortörés és a tabulátor megmarad, ha engedett)
function clean(s: string, allowNewlines: boolean): string {
  const re = allowNewlines ? /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g;
  return s.normalize('NFC').replace(/\r\n?/g, '\n').replace(re, '');
}

function optionalText(
  v: unknown,
  field: string,
  label: string,
  max: number,
  allowNewlines = false,
): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v !== 'string') throw new ValidationError(field, `${label}: szöveg kell.`);
  const t = clean(v, allowNewlines).trim();
  if (t.length === 0) return null;
  if (t.length > max) throw new ValidationError(field, `${label}: legfeljebb ${max} karakter lehet.`);
  return t;
}

export type ExerciseInput = {
  name?: string;
  category?: string | null;
  video_url?: string | null;
  technique_note?: string | null;
  archived?: boolean;
};

const EXERCISE_FIELDS = new Set(['name', 'category', 'video_url', 'technique_note', 'archived']);

// partial: szerkesztésnél (PATCH) csak a megadott mezők kerülnek vissza
export function parseExerciseInput(body: unknown, partial: boolean): ExerciseInput {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new ValidationError('body', 'Érvénytelen kérés.');
  }
  const b = body as Record<string, unknown>;
  for (const k of Object.keys(b)) {
    if (!EXERCISE_FIELDS.has(k)) throw new ValidationError(k, 'Ismeretlen mező.');
  }

  const out: ExerciseInput = {};

  if ('name' in b || !partial) {
    if (typeof b.name !== 'string') throw new ValidationError('name', 'A név kötelező.');
    const name = clean(b.name, false).replace(/\s+/g, ' ').trim();
    if (name.length === 0) throw new ValidationError('name', 'A név kötelező.');
    if (name.length > 120) throw new ValidationError('name', 'A név legfeljebb 120 karakter lehet.');
    out.name = name;
  }

  if ('category' in b) {
    const c = optionalText(b.category, 'category', 'A kategória', 40);
    out.category = c === null ? null : c.replace(/\s+/g, ' ');
  }

  if ('video_url' in b) {
    const url = optionalText(b.video_url, 'video_url', 'A videó link', 300);
    if (url !== null && getVideoInfo(url) === null) {
      throw new ValidationError(
        'video_url',
        'A videó link nem ismerhető fel. YouTube linket (watch, youtu.be, shorts, embed) vagy 11 karakteres azonosítót adj meg.',
      );
    }
    out.video_url = url;
  }

  if ('technique_note' in b) {
    out.technique_note = optionalText(b.technique_note, 'technique_note', 'A technikai leírás', 4000, true);
  }

  if ('archived' in b) {
    if (typeof b.archived !== 'boolean') throw new ValidationError('archived', 'Az archivált mező igaz/hamis lehet.');
    out.archived = b.archived;
  }

  if (partial && Object.keys(out).length === 0) {
    throw new ValidationError('body', 'Nincs módosítandó mező.');
  }
  return out;
}
