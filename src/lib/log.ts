/**
 * Supabase returns a plain object whose fields don't survive `console.error`'s
 * inspection — it prints `{}`, which tells whoever is debugging nothing at all.
 * Pull the fields out explicitly instead.
 */
export function logDbError(context: string, error: unknown) {
  const e = error as
    | { message?: string; code?: string; details?: string | null; hint?: string | null }
    | null
    | undefined;

  const parts = [
    `[qyoflow] ${context}`,
    e?.message ? `message=${e.message}` : null,
    e?.code ? `code=${e.code}` : null,
    e?.details ? `details=${e.details}` : null,
    e?.hint ? `hint=${e.hint}` : null,
  ].filter(Boolean);

  // A missing function almost always means a migration hasn't been run, so say
  // so rather than leaving someone to decode a Postgres error code.
  if (e?.code === "42883" || e?.code === "PGRST202") {
    parts.push(
      "— a database function is missing or out of date. Run the files in " +
        "supabase/migrations/ in order.",
    );
  }

  console.error(parts.join(" "));
}
