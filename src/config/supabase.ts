import { createClient } from '@supabase/supabase-js';

declare global {
  // eslint-disable-next-line no-var
  var __supabase: ReturnType<typeof createClient> | undefined;
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('ERROR: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing in your .env file');
}

export const supabase =
  globalThis.__supabase ??
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true },
  });

if (import.meta.env.DEV) {
  globalThis.__supabase = supabase;
}

