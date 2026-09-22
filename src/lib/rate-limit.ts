import { headers } from "next/headers";

/**
 * A small fixed-window limiter for the unauthenticated endpoints — joining a
 * queue, and looking up a ticket.
 *
 * It is in-process, so it holds for a single server instance. That is enough to
 * stop a bored person from spamming a shop's queue from a phone, and it is NOT
 * enough once you run more than one instance: move the counter to Redis or to a
 * Postgres table before scaling out.
 */

type Window = { count: number; resetAt: number };

const buckets = new Map<string, Window>();
const MAX_KEYS = 10_000;

function sweep(now: number) {
  if (buckets.size < MAX_KEYS) return;
  for (const [key, window] of buckets) {
    if (window.resetAt <= now) buckets.delete(key);
  }
  // Still full of live windows: drop the oldest rather than grow without bound.
  if (buckets.size >= MAX_KEYS) {
    const oldest = [...buckets.entries()].sort((a, b) => a[1].resetAt - b[1].resetAt);
    for (const [key] of oldest.slice(0, Math.floor(MAX_KEYS / 4))) buckets.delete(key);
  }
}

export function hit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (existing.count >= limit) return false;
  existing.count += 1;
  return true;
}

/** Best-effort client address. Spoofable, which is why the limits are generous. */
export async function clientKey(scope: string): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || h.get("x-real-ip") || "unknown";
  return `${scope}:${ip}`;
}
