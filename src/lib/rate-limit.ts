import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

/**
 * Rate limiting for the endpoints anyone can reach: joining a queue, signing
 * up, signing in.
 *
 * The counter lives in Postgres (`qf_rate_limit`), because an in-process one
 * only holds for a single instance — on a serverless deployment an attacker
 * simply lands on another. A small in-process counter is still kept as a
 * second line so a burst inside one instance is caught without a round trip.
 *
 * Failure is open. If the database can't be reached, a customer standing in a
 * barbershop should still be able to take a number; the cost of guessing wrong
 * in that direction is far lower than locking out every real user.
 */

type Window = { count: number; resetAt: number };

const local = new Map<string, Window>();
const MAX_KEYS = 5_000;

function sweep(now: number) {
  if (local.size < MAX_KEYS) return;
  for (const [key, w] of local) if (w.resetAt <= now) local.delete(key);
  if (local.size >= MAX_KEYS) {
    const oldest = [...local.entries()].sort((a, b) => a[1].resetAt - b[1].resetAt);
    for (const [key] of oldest.slice(0, Math.floor(MAX_KEYS / 4))) local.delete(key);
  }
}

/** In-process check. Generous: it exists to blunt bursts, not to be the limit. */
function localAllows(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  sweep(now);

  const existing = local.get(key);
  if (!existing || existing.resetAt <= now) {
    local.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (existing.count >= limit) return false;
  existing.count += 1;
  return true;
}

/**
 * Returns true when the call is allowed.
 *
 * `limit` requests per `windowMs`, counted per key across every instance.
 */
export async function allow(key: string, limit: number, windowMs: number): Promise<boolean> {
  // A burst against one instance is rejected without touching the database.
  if (!localAllows(key, limit, windowMs)) return false;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("qf_rate_limit", {
      p_bucket: key,
      p_limit: limit,
      p_window_seconds: Math.ceil(windowMs / 1000),
    });

    if (error) {
      // Includes the case where 0005 hasn't been applied yet.
      console.warn("rate limit unavailable, allowing request", error.message);
      return true;
    }
    return data !== false;
  } catch (e) {
    console.warn("rate limit check failed, allowing request", e);
    return true;
  }
}

/**
 * Best-effort client address.
 *
 * Only the first hop is read, and only from headers the platform sets. It is
 * still spoofable behind a misconfigured proxy, which is why the limits are
 * generous enough never to trouble a real person.
 */
export async function clientKey(scope: string): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || h.get("x-real-ip") || h.get("cf-connecting-ip") || "unknown";
  return `${scope}:${ip}`;
}
