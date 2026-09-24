import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type PublicEnv = Record<string, string | undefined>;

const env = (import.meta as ImportMeta & { env?: PublicEnv }).env ?? {};
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;

let instance: SupabaseClient | null = null;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Falta configurar Supabase en web/.env.local.');
  }

  instance ??= createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return instance;
}

