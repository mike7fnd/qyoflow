"use client";

/**
 * A customer's ticket lives in their own browser, keyed by business. It is the
 * entire substitute for an account: no password, no email, nothing to verify.
 * Every read is defensive because private windows and blocked site data both
 * throw here.
 */

const KEY = "qyoflow.tickets";
const MAX_AGE_MS = 12 * 60 * 60 * 1000; // a ticket is a day's thing at most

type Store = Record<string, { token: string; at: number }>;

function read(): Store {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Store;
    const now = Date.now();
    return Object.fromEntries(
      Object.entries(parsed).filter(([, v]) => now - v.at < MAX_AGE_MS),
    );
  } catch {
    return {};
  }
}

function write(store: Store) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    // Nothing to do — the ticket URL still works, it just won't be remembered.
  }
}

export function rememberTicket(slug: string, token: string) {
  const store = read();
  store[slug] = { token, at: Date.now() };
  write(store);
}

export function recallTicket(slug: string): string | null {
  return read()[slug]?.token ?? null;
}

export function forgetTicket(slug: string) {
  const store = read();
  delete store[slug];
  write(store);
}
