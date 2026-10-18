// Supabase kliens a titkos kulccsal (csak szerver oldalon) és a hibák kulcsmentes lefordítása.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Config } from './config.ts';

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function createDb(config: Config): SupabaseClient {
  return createClient(config.supabaseUrl, config.secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

// Az admin_* SQL függvények hibakódjai (raise exception 'kód') -> állapot és magyar üzenet
const FUNCTION_ERRORS: Record<string, [number, string]> = {
  plan_has_clients: [409, 'A tervhez ügyfél tartozik, ezért nem törölhető.'],
  plan_not_found: [404, 'A terv nem található.'],
  day_not_found: [404, 'A nap nem található.'],
  row_not_found: [404, 'A gyakorlat-sor nem található.'],
  exercise_not_found: [404, 'A gyakorlat nem található a gyakorlattárban.'],
  exercise_archived: [409, 'Az archivált gyakorlat nem adható hozzá tervhez. Állítsd vissza a Gyakorlattárban.'],
  slug_taken: [409, 'Ez a slug már foglalt, adj meg másikat.'],
  invalid_slug: [400, 'A slug csak kisbetűt, számot és kötőjelet tartalmazhat (pl. "6-hetes-terv").'],
  invalid_title: [400, 'A cím kötelező, legfeljebb 120 karakter.'],
  invalid_week: [400, 'Érvénytelen hét sorszám.'],
  invalid_scope: [400, 'Érvénytelen hatókör.'],
  invalid_value: [400, 'Érvénytelen érték.'],
  same_week: [400, 'A forrás és a cél hét nem lehet ugyanaz.'],
  source_week_empty: [409, 'A forrás héten nincs egyetlen nap sem.'],
  week_has_logs: [409, 'A cél héthez ügyfél által naplózott edzés tartozik, ezért a tartalma nem cserélhető le.'],
  day_has_logs: [409, 'Ehhez a naphoz ügyfél által naplózott edzés tartozik, ezért nem törölhető.'],
  row_has_logs: [409, 'Ehhez a gyakorlathoz ügyfél által naplózott sorozat tartozik, ezért nem törölhető.'],
  week_full: [409, 'Ezen a héten már 7 nap van, több nem adható hozzá.'],
  order_mismatch: [409, 'A nap gyakorlatai időközben megváltoztak. Frissítsd az oldalt.'],
  label_taken: [409, 'Ezt a szuperszett-jelölést a nap egy másik csoportja már használja.'],
  group_invalid: [409, 'Szuperszettet csak egymás melletti, azonos szakaszú, legalább két sor alkothat.'],
};

type DbError = { message?: string; code?: string; status?: number } | null;

// Az adatbázis hibájából mindig felhasználóbarát ApiError lesz. A nyers hibaüzenet nem megy ki a
// válaszba; a naplóba is csak a hibakód kerül.
export function dbError(error: NonNullable<DbError>): ApiError {
  const code = error.code ?? '';
  const msg = error.message ?? '';

  if (code === '23505') return new ApiError(409, 'duplicate', 'Már létezik ilyen érték (a név vagy a slug egyedi).');
  if (code === '23503') {
    return new ApiError(409, 'in_use', 'Az elem más adat (pl. ügyfél naplója) által használt, ezért nem módosítható így.');
  }
  const known = Object.keys(FUNCTION_ERRORS).find((k) => msg.includes(k));
  if (known) return new ApiError(FUNCTION_ERRORS[known][0], known, FUNCTION_ERRORS[known][1]);
  if (
    code === 'PGRST202' || // a függvény nem található
    code === '42883' || // undefined_function
    code === '42703' || // undefined_column
    code === '42P01' // undefined_table
  ) {
    return new ApiError(
      503,
      'migration_missing',
      'Az adatbázis még nincs felkészítve: futtasd le a supabase/003-admin.sql és a supabase/004-admin.sql fájlt a Supabase SQL Editorban.',
    );
  }
  if (error.status === 401 || error.status === 403 || code === 'PGRST301' || /invalid api key/i.test(msg)) {
    return new ApiError(
      502,
      'bad_key',
      'A Supabase nem fogadta el a kulcsot. Ellenőrizd a SUPABASE_URL és SUPABASE_SECRET_KEY értékét az admin/.env.local fájlban.',
    );
  }
  if (!code && /fetch failed|network|ENOTFOUND|ECONNREFUSED|ETIMEDOUT/i.test(msg)) return unknownError();
  console.error(`[admin] adatbázis hiba (kód: ${code || 'ismeretlen'})`);
  return new ApiError(500, 'db_error', `Adatbázis hiba történt (kód: ${code || 'ismeretlen'}).`);
}

// Hálózati hiba (pl. rossz SUPABASE_URL) esetén a supabase-js kivételt dobhat.
export function unknownError(): ApiError {
  console.error('[admin] a Supabase nem érhető el');
  return new ApiError(502, 'unreachable', 'A Supabase nem érhető el. Ellenőrizd az internetkapcsolatot és a SUPABASE_URL értékét.');
}

// Adatbázis-függvény hívása: a hibát felhasználóbarát ApiError-rá fordítja.
export async function callRpc<T>(db: SupabaseClient, fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await db.rpc(fn, args);
  if (error) throw dbError(error);
  return data as T;
}

export type { SupabaseClient };
