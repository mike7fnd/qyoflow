"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser client. Carries the user's session and nothing privileged — every
 * statement it issues is still filtered by RLS.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

let shared: ReturnType<typeof createBrowserClient> | null = null;

/** Single instance, so realtime channels share one websocket. */
export function supabase() {
  if (!shared) shared = createClient();
  return shared;
}
