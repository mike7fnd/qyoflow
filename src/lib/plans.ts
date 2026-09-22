import type { Plan, PlanTier } from "./types";

/**
 * Marketing copy for each plan. The numbers that matter — limits, price — come
 * from the `plans` table, which is also what the database enforces, so the
 * pricing page can never promise something the server will refuse.
 */
export const PLAN_COPY: Record<
  PlanTier,
  { features: string[]; cta: string; highlight?: boolean }
> = {
  free: {
    cta: "Start for free",
    features: [
      "1 location, 1 queue",
      "50 customers a day",
      "Your own QR code",
      "Live queue page",
    ],
  },
  starter: {
    cta: "Start for free",
    highlight: true,
    features: [
      "Unlimited customers",
      "Unlimited services",
      "Queue history",
      "Customer notifications",
      "Your own qyoflow.com address",
    ],
  },
  business: {
    cta: "Start for free",
    features: [
      "Everything in Starter",
      "Up to 10 staff accounts",
      "SMS notifications",
      "Advanced analytics",
      "Custom branding",
    ],
  },
  pro: {
    cta: "Talk to us",
    features: [
      "Everything in Business",
      "Up to 25 locations",
      "Per-location analytics",
      "Staff performance",
      "API access",
      "Priority support",
    ],
  },
};

/** Mirrors the seed in supabase/migrations/0001_schema.sql. Used only when the
 *  database is unreachable, so marketing pages still render. */
export const FALLBACK_PLANS: Plan[] = [
  {
    tier: "free",
    name: "Free",
    blurb: "For trying it out",
    price_cents: 0,
    currency: "PHP",
    daily_customer_limit: 50,
    max_locations: 1,
    max_services: 3,
    max_staff: 1,
    sms_notifications: false,
    advanced_analytics: false,
    custom_branding: false,
    api_access: false,
    sort: 0,
  },
  {
    tier: "starter",
    name: "Starter",
    blurb: "For small businesses",
    price_cents: 29900,
    currency: "PHP",
    daily_customer_limit: null,
    max_locations: 1,
    max_services: null,
    max_staff: 2,
    sms_notifications: false,
    advanced_analytics: false,
    custom_branding: false,
    api_access: false,
    sort: 1,
  },
  {
    tier: "business",
    name: "Business",
    blurb: "For growing businesses",
    price_cents: 59900,
    currency: "PHP",
    daily_customer_limit: null,
    max_locations: 1,
    max_services: null,
    max_staff: 10,
    sms_notifications: true,
    advanced_analytics: true,
    custom_branding: true,
    api_access: false,
    sort: 2,
  },
  {
    tier: "pro",
    name: "Pro",
    blurb: "For multiple locations",
    price_cents: 99900,
    currency: "PHP",
    daily_customer_limit: null,
    max_locations: 25,
    max_services: null,
    max_staff: null,
    sms_notifications: true,
    advanced_analytics: true,
    custom_branding: true,
    api_access: true,
    sort: 3,
  },
];

export const TIER_ORDER: PlanTier[] = ["free", "starter", "business", "pro"];

export function tierRank(tier: PlanTier) {
  return TIER_ORDER.indexOf(tier);
}
