import type { EntryStatus } from "./types";

const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

export function money(cents: number) {
  return peso.format(cents / 100);
}

export function planPrice(cents: number) {
  return cents === 0 ? "Free" : peso.format(cents / 100);
}

/** "~25 min" / "~1h 10m" — deliberately approximate, because it is. */
export function duration(minutes: number | null | undefined) {
  if (minutes == null || minutes <= 0) return "No wait";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function shortTime(iso: string | null | undefined, timezone?: string) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(iso));
}

export function longDate(date: Date = new Date(), timezone?: string) {
  return new Intl.DateTimeFormat("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: timezone,
  }).format(date);
}

export function hourLabel(hour: number) {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}${hour < 12 ? "am" : "pm"}`;
}

/** "just now" / "4 min ago" — used inline, so it stays short. */
export function sinceShort(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export const STATUS_LABEL: Record<EntryStatus, string> = {
  WAITING: "Waiting",
  CALLED: "Called",
  SERVING: "Serving",
  COMPLETED: "Done",
  SKIPPED: "Skipped",
  CANCELLED: "Left",
  NO_SHOW: "No show",
};

export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** Maps a Postgres exception from our RPCs onto something a person can act on. */
export function friendlyError(message: string | undefined | null) {
  if (!message) return "Something went wrong. Please try again.";
  const map: Record<string, string> = {
    BUSINESS_NOT_FOUND: "We couldn't find that business.",
    SERVICE_UNAVAILABLE: "That service isn't available right now.",
    LOCATION_CLOSED: "This location is closed at the moment.",
    QUEUE_CLOSED: "The queue is closed right now.",
    PLAN_LIMIT_REACHED: "This queue has reached its limit for today.",
    TICKET_NOT_FOUND: "We couldn't find that ticket.",
    ENTRY_NOT_FOUND: "That customer is no longer in the queue.",
    ENTRY_ALREADY_CLOSED: "That customer has already been handled.",
    INVALID_TRANSITION: "That action isn't available for this customer.",
    FORBIDDEN: "You don't have access to this.",
    UNAUTHENTICATED: "Please sign in again.",
    SLUG_TAKEN: "That web address is already taken.",
    LOCATION_NOT_FOUND: "That location no longer exists.",
  };
  for (const [code, text] of Object.entries(map)) {
    if (message.includes(code)) return text;
  }
  return message;
}

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "http://localhost:3000";
