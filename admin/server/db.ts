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

type DbError = { message?: string; code?: string; status?: number } | null;

// Az adatbázis hibájából mindig felhasználóbarát ApiError lesz. A nyers hibaüzenet nem megy ki a
// válaszba; a naplóba is csak a hibakód kerül.
export function dbError(error: NonNullable<DbError>): ApiError {
  const code = error.code ?? '';
  const msg = error.message ?? '';

  if (code === '23505') return new ApiError(409, 'duplicate', 'Már létezik ilyen érték (a név vagy a slug egyedi).');
  if (code === '23503') return new ApiError(409, 'in_use', 'Az elem más adat által használt, ezért nem módosítható így.');
  if (msg.includes('plan_has_clients')) {
    return new ApiError(409, 'plan_has_clients', 'A tervhez ügyfél tartozik, ezért nem törölhető.');
  }
  if (
    code === 'PGRST202' || // a függvény nem található
    code === '42883' || // undefined_function
    code === '42703' || // undefined_column
    code === '42P01' // undefined_table
  ) {
    return new ApiError(
      503,
      'migration_missing',
      'Az adatbázis még nincs felkészítve: futtasd le a supabase/003-admin.sql fájlt a Supabase SQL Editorban.',
    );
  }
  if (error.status === 401 || error.status === 403 || code === 'PGRST301' || /invalid api key/i.test(msg)) {
    return new ApiError(
      502,
      'bad_key',
      'A Supabase nem fogadta el a kulcsot. Ellenőrizd a SUPABASE_URL és SUPABASE_SECRET_KEY értékét az admin/.env.local fájlban.',
    );
  }
  console.error(`[admin] adatbázis hiba (kód: ${code || 'ismeretlen'})`);
  return new ApiError(500, 'db_error', `Adatbázis hiba történt (kód: ${code || 'ismeretlen'}).`);
}

// Hálózati hiba (pl. rossz SUPABASE_URL) esetén a supabase-js kivételt dobhat.
export function unknownError(): ApiError {
  console.error('[admin] a Supabase nem érhető el');
  return new ApiError(502, 'unreachable', 'A Supabase nem érhető el. Ellenőrizd az internetkapcsolatot és a SUPABASE_URL értékét.');
}

export type { SupabaseClient };
