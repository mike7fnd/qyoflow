export type PlanTier = "free" | "starter" | "business" | "pro";

export type EntryStatus =
  | "WAITING"
  | "CALLED"
  | "SERVING"
  | "COMPLETED"
  | "SKIPPED"
  | "CANCELLED"
  | "NO_SHOW";

export type MemberRole = "owner" | "manager" | "staff";

export interface Plan {
  tier: PlanTier;
  name: string;
  blurb: string;
  price_cents: number;
  currency: string;
  daily_customer_limit: number | null;
  max_locations: number;
  max_services: number | null;
  max_staff: number | null;
  sms_notifications: boolean;
  advanced_analytics: boolean;
  custom_branding: boolean;
  api_access: boolean;
  sort: number;
}

export interface Business {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  tagline: string | null;
  accent: string;
  plan: PlanTier;
  onboarded: boolean;
  created_at: string;
}

export interface Location {
  id: string;
  business_id: string;
  name: string;
  address: string | null;
  timezone: string;
  is_open: boolean;
  position: number;
}

export interface Service {
  id: string;
  location_id: string;
  name: string;
  price_cents: number;
  duration_min: number;
  position: number;
  active: boolean;
}

/** Shape returned by qf_live_queue(). */
export interface LiveQueue {
  queue: {
    id: string;
    service_date: string;
    serving_number: number | null;
    serving_entry_id: string | null;
    waiting: number;
    last_issued: number;
    is_open: boolean;
  } | null;
  entries: LiveEntry[];
  location: { id: string; name: string; timezone: string; is_open: boolean };
}

export interface LiveEntry {
  id: string;
  number: number;
  status: EntryStatus;
  customer_name: string | null;
  customer_phone: string | null;
  joined_at: string;
  called_at: string | null;
  serving_at: string | null;
  ended_at: string | null;
  service_name: string | null;
  duration_min: number | null;
}

/** Shape returned by qf_ticket(). */
export interface Ticket {
  entry: {
    id: string;
    number: number;
    status: EntryStatus;
    name: string | null;
    joined_at: string;
    called_at: string | null;
    ended_at: string | null;
  };
  service: { name: string; duration_min: number } | null;
  business: { name: string; slug: string; accent: string };
  location: { name: string; address: string | null };
  queue: {
    id: string;
    serving_number: number | null;
    waiting: number;
    is_open: boolean;
  };
  ahead: number;
  eta_minutes: number;
}

/** Shape returned by qf_business_page(). */
export interface BusinessPage {
  business: {
    id: string;
    name: string;
    slug: string;
    tagline: string | null;
    accent: string;
  };
  location: {
    id: string;
    name: string;
    address: string | null;
    timezone: string;
    is_open: boolean;
  };
  services: Array<{
    id: string;
    name: string;
    price_cents: number;
    duration_min: number;
  }>;
  queue: {
    is_open: boolean;
    waiting: number;
    serving_number: number | null;
    eta_minutes: number;
  };
}

export interface Analytics {
  range_days: number;
  today: { served: number; joined: number; no_show: number; left: number };
  totals: { served: number; joined: number };
  avg_wait_min: number | null;
  avg_service_min: number | null;
  peak_hour: number | null;
  by_hour: Array<{ hour: number; count: number }>;
  by_day: Array<{ date: string; count: number }>;
  by_service: Array<{ name: string; count: number }>;
}

export interface Entitlements {
  plan: Plan;
  subscription: {
    tier: PlanTier;
    status: "active" | "trialing" | "past_due" | "canceled";
    provider: string;
    current_period_start: string;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
  } | null;
  usage_today: number;
  limit_reached: boolean;
}
