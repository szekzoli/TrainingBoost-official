import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// A Morning Boost Tracker saját Supabase-projektje (nem az edzésnaplóé). A nyilvános kulccsal csak
// egyetlen függvény hívható: a tag saját bérlete a titkos link-kód alapján (member_pass_public).

export type PublicPass = {
  name: string;
  passes_remaining: number;
  total_passes: number;
  debt: number;
  renewals: number;
  dates: string[];
  renewal_dates: string[];
};

let client: SupabaseClient | null = null;

function getTracker(): SupabaseClient {
  if (client) return client;
  const url = import.meta.env.VITE_TRACKER_SUPABASE_URL;
  const key = import.meta.env.VITE_TRACKER_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('tracker_not_configured');
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}

export type PassResult =
  | { kind: 'ok'; pass: PublicPass }
  | { kind: 'invalid' }
  | { kind: 'error' };

export async function fetchPublicPass(token: string): Promise<PassResult> {
  if (!/^[a-f0-9]{24,64}$/i.test(token)) return { kind: 'invalid' };
  try {
    const { data, error } = await getTracker().rpc('member_pass_public', { p_token: token });
    if (error) return { kind: 'error' };
    if (!data) return { kind: 'invalid' };
    return { kind: 'ok', pass: data as PublicPass };
  } catch {
    return { kind: 'error' };
  }
}
