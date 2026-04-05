import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types";

/**
 * Client Supabase avec la clé SERVICE_ROLE.
 * À utiliser UNIQUEMENT côté serveur (API routes, Server Actions).
 * Bypasse les RLS policies — ne jamais exposer au client.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars."
    );
  }

  return createSupabaseClient<Database>(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
