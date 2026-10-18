// A titkos kulcs kezelése: csak ez a modul olvassa az admin/.env.local fájlt, és a kulcs értéke
// soha nem kerül naplóba, hibaüzenetbe vagy válaszba. A hibaüzenetek csak a változó NEVÉT említik.
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ENV_FILE = join(dirname(fileURLToPath(import.meta.url)), '..', '.env.local');

export type Config = {
  supabaseUrl: string;
  secretKey: string;
  publicBaseUrl: string;
};

export type ConfigResult = { ok: true; config: Config } | { ok: false; problems: string[] };

// A JWT formátumú (régi) kulcsból csak a szerepet olvassuk ki, hogy az anon kulcsot kizárjuk.
function jwtRole(key: string): string | null {
  const parts = key.split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return typeof payload?.role === 'string' ? payload.role : null;
  } catch {
    return null;
  }
}

export function loadConfig(): ConfigResult {
  if (existsSync(ENV_FILE)) {
    try {
      process.loadEnvFile(ENV_FILE);
    } catch {
      return { ok: false, problems: ['Az admin/.env.local fájl nem olvasható vagy hibás formátumú.'] };
    }
  } else {
    return {
      ok: false,
      problems: ['Hiányzik az admin/.env.local fájl. Másold az admin/.env.example fájlt, és töltsd ki.'],
    };
  }

  const problems: string[] = [];
  const url = (process.env.SUPABASE_URL ?? '').trim();
  const key = (process.env.SUPABASE_SECRET_KEY ?? '').trim();
  const base = (process.env.PUBLIC_BASE_URL ?? '').trim() || 'https://trainingboost.hu';

  if (!url) {
    problems.push('Hiányzik a SUPABASE_URL az admin/.env.local fájlból.');
  } else {
    try {
      const u = new URL(url);
      if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error('protocol');
    } catch {
      problems.push('A SUPABASE_URL nem érvényes webcím.');
    }
  }

  if (!key) {
    problems.push('Hiányzik a SUPABASE_SECRET_KEY az admin/.env.local fájlból.');
  } else if (key.startsWith('sb_publishable_')) {
    problems.push('A SUPABASE_SECRET_KEY értéke nyilvános (publishable) kulcsnak látszik. A "secret key" kell.');
  } else if (jwtRole(key) !== null && jwtRole(key) !== 'service_role') {
    problems.push('A SUPABASE_SECRET_KEY nem service_role kulcsnak látszik (valószínűleg az anon kulcs).');
  }

  let publicBaseUrl = base;
  try {
    const u = new URL(base);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error('protocol');
    publicBaseUrl = u.origin;
  } catch {
    problems.push('A PUBLIC_BASE_URL nem érvényes webcím.');
  }

  if (problems.length > 0) return { ok: false, problems };
  return { ok: true, config: { supabaseUrl: url, secretKey: key, publicBaseUrl } };
}
