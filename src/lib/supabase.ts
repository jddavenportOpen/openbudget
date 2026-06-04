/**
 * Tiny server-side Supabase admin client. Service-role key is env-only and
 * never shipped to the browser. Reused across all budget route handlers.
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "";
  if (!url || !key) {
    throw new Error(
      "Supabase admin client missing env: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    );
  }
  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}
