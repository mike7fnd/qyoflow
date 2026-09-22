-- QyoFlow — core schema
-- Everything the frontend can touch is guarded by RLS (0003) and every write path
-- goes through a SECURITY DEFINER function (0002), so plan limits and ownership are
-- enforced in the database rather than in the browser.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- enums

do $$ begin
  create type plan_tier as enum ('free', 'starter', 'business', 'pro');
exception when duplicate_object then null; end $$;

-- Explicit queue states. "pending" tells you nothing; these let analytics
-- distinguish a no-show from a cancellation from a skip.
do $$ begin
  create type entry_status as enum (
    'WAITING', 'CALLED', 'SERVING', 'COMPLETED', 'SKIPPED', 'CANCELLED', 'NO_SHOW'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type member_role as enum ('owner', 'manager', 'staff');
exception when duplicate_object then null; end $$;

do $$ begin
  create type sub_status as enum ('active', 'trialing', 'past_due', 'canceled');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------- plans

create table if not exists plans (
  tier                 plan_tier primary key,
  name                 text not null,
  blurb                text not null,
  price_cents          int not null,
  currency             text not null default 'PHP',
  daily_customer_limit int,              -- null = unlimited
  max_locations        int not null,
  max_services         int,              -- null = unlimited
  max_staff            int,
  sms_notifications    boolean not null default false,
  advanced_analytics   boolean not null default false,
  custom_branding      boolean not null default false,
  api_access           boolean not null default false,
  sort                 int not null
);

insert into plans (tier, name, blurb, price_cents, daily_customer_limit, max_locations,
                   max_services, max_staff, sms_notifications, advanced_analytics,
                   custom_branding, api_access, sort)
values
  ('free',     'Free',     'For trying it out',         0,   50,  1,    3,    1, false, false, false, false, 0),
  ('starter',  'Starter',  'For small businesses',  29900, null,  1, null,    2, false, false, false, false, 1),
  ('business', 'Business', 'For growing businesses',59900, null,  1, null,   10, true,  true,  true,  false, 2),
  ('pro',      'Pro',      'For multiple locations',99900, null, 25, null, null, true,  true,  true,  true,  3)
on conflict (tier) do update set
  name = excluded.name, blurb = excluded.blurb, price_cents = excluded.price_cents,
  daily_customer_limit = excluded.daily_customer_limit, max_locations = excluded.max_locations,
  max_services = excluded.max_services, max_staff = excluded.max_staff,
  sms_notifications = excluded.sms_notifications, advanced_analytics = excluded.advanced_analytics,
  custom_branding = excluded.custom_branding, api_access = excluded.api_access, sort = excluded.sort;

-- ---------------------------------------------------------------- identity

create table if not exists profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  email      text,
  created_at timestamptz not null default now()
);

create or replace function qf_handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  insert into profiles (id, full_name, email)
  values (new.id, new.raw_user_meta_data->>'full_name', new.email)
  on conflict (id) do nothing;
  return new;
end $fn$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function qf_handle_new_user();

-- ---------------------------------------------------------------- business

create table if not exists businesses (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  slug       text not null unique
             check (slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'),
  tagline    text,
  accent     text not null default '#0071E3',
  plan       plan_tier not null default 'free',
  onboarded  boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists businesses_owner_idx on businesses(owner_id);

create table if not exists locations (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name        text not null,
  address     text,
  timezone    text not null default 'Asia/Manila',
  is_open     boolean not null default true,
  position    int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists locations_business_idx on locations(business_id);

create table if not exists services (
  id           uuid primary key default gen_random_uuid(),
  location_id  uuid not null references locations(id) on delete cascade,
  name         text not null,
  price_cents  int not null default 0,
  duration_min int not null default 15 check (duration_min between 1 and 480),
  position     int not null default 0,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);
create index if not exists services_location_idx on services(location_id);

create table if not exists business_members (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  location_id  uuid references locations(id) on delete set null,
  display_name text,
  role         member_role not null default 'staff',
  created_at   timestamptz not null default now(),
  unique (business_id, user_id)
);
create index if not exists members_user_idx on business_members(user_id);

-- ---------------------------------------------------------------- queue

-- One queue row per location per service day. Numbers restart daily, which is
-- what a counter actually wants.
create table if not exists queues (
  id               uuid primary key default gen_random_uuid(),
  location_id      uuid not null references locations(id) on delete cascade,
  service_date     date not null,
  last_issued      int not null default 0,
  serving_number   int,
  serving_entry_id uuid,
  waiting_count    int not null default 0,
  is_open          boolean not null default true,
  created_at       timestamptz not null default now(),
  unique (location_id, service_date)
);

create table if not exists queue_entries (
  id             uuid primary key default gen_random_uuid(),
  queue_id       uuid not null references queues(id) on delete cascade,
  location_id    uuid not null references locations(id) on delete cascade,
  business_id    uuid not null references businesses(id) on delete cascade,
  service_id     uuid references services(id) on delete set null,
  number         int not null,
  status         entry_status not null default 'WAITING',
  customer_name  text,
  customer_phone text,
  -- The customer's only credential. No password, no account, no email.
  token          uuid not null default gen_random_uuid(),
  joined_at      timestamptz not null default now(),
  called_at      timestamptz,
  serving_at     timestamptz,
  ended_at       timestamptz,
  served_by      uuid references auth.users(id) on delete set null,
  unique (queue_id, number)
);
create unique index if not exists queue_entries_token_idx on queue_entries(token);
create index if not exists queue_entries_queue_status_idx on queue_entries(queue_id, status, number);
create index if not exists queue_entries_business_day_idx on queue_entries(business_id, joined_at);

-- ---------------------------------------------------------------- billing

create table if not exists subscriptions (
  id                   uuid primary key default gen_random_uuid(),
  business_id          uuid not null unique references businesses(id) on delete cascade,
  tier                 plan_tier not null default 'free',
  status               sub_status not null default 'active',
  provider             text not null default 'manual',
  provider_ref         text,
  current_period_start timestamptz not null default now(),
  current_period_end   timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at           timestamptz not null default now()
);

create table if not exists payments (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses(id) on delete cascade,
  amount_cents int not null,
  currency     text not null default 'PHP',
  status       text not null,
  provider     text not null default 'manual',
  provider_ref text,
  description  text,
  created_at   timestamptz not null default now()
);
create index if not exists payments_business_idx on payments(business_id, created_at desc);

-- Counts the one thing the Free plan meters, per business per local day.
create table if not exists usage_daily (
  business_id  uuid not null references businesses(id) on delete cascade,
  usage_date   date not null,
  joined_count int not null default 0,
  served_count int not null default 0,
  primary key (business_id, usage_date)
);

create table if not exists audit_logs (
  id          bigserial primary key,
  business_id uuid references businesses(id) on delete cascade,
  actor_id    uuid,
  action      text not null,
  target      text,
  meta        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists audit_business_idx on audit_logs(business_id, created_at desc);
