import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabase as v1Client } from "@/integrations/supabase/client";
import { v2Config } from "../config";

/**
 * Backend client for v2. When v2 shares the v1 backend we reuse the v1 client
 * so both versions share one login session. When v2 has its own backend it
 * gets a separate client with its own session storage key.
 */
export const backend: SupabaseClient = v2Config.sharedBackend
  ? (v1Client as unknown as SupabaseClient)
  : createClient(v2Config.supabaseUrl, v2Config.supabaseKey, {
      auth: { storage: localStorage, storageKey: "gl-v2-auth", persistSession: true, autoRefreshToken: true },
    });
