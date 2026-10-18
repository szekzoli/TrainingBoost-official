import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

// Lustán hozzuk létre, hogy a hiányzó env változó ne törje el a nyilvános oldalt.
export function getSupabase(): SupabaseClient {
  if (client) return client;
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('supabase_not_configured');
  client = createClient(url, key, {
    // Nincs Supabase Auth: ne tároljon munkamenetet, ne olvasson az URL-ből.
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}
