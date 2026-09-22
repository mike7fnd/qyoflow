-- QyoFlow — row level security.
--
-- Default posture: deny. Anonymous visitors can read only what a poster on a shop
-- window would show — the business, its services, and how long the line is. Customer
-- names and phone numbers are never readable by anon, which is why the live status
-- page reads through qf_ticket() rather than selecting from queue_entries.

alter table profiles         enable row level security;
alter table businesses       enable row level security;
alter table locations        enable row level security;
alter table services         enable row level security;
alter table business_members enable row level security;
alter table queues           enable row level security;
alter table queue_entries    enable row level security;
alter table subscriptions    enable row level security;
alter table payments         enable row level security;
alter table usage_daily      enable row level security;
alter table audit_logs       enable row level security;
alter table plans            enable row level security;

-- ---------------------------------------------------------------- plans (public)

drop policy if exists plans_read on plans;
create policy plans_read on plans for select using (true);

-- ---------------------------------------------------------------- profiles

drop policy if exists profiles_self on profiles;
create policy profiles_self on profiles
  for select using (id = auth.uid());

drop policy if exists profiles_self_update on profiles;
create policy profiles_self_update on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ---------------------------------------------------------------- businesses

-- Public: anyone can resolve /q/<slug>. Only non-sensitive columns exist here.
drop policy if exists businesses_public_read on businesses;
create policy businesses_public_read on businesses for select using (true);

drop policy if exists businesses_owner_write on businesses;
create policy businesses_owner_write on businesses
  for update using (qf_is_owner(id)) with check (qf_is_owner(id));

drop policy if exists businesses_owner_insert on businesses;
create policy businesses_owner_insert on businesses
  for insert with check (owner_id = auth.uid());

drop policy if exists businesses_owner_delete on businesses;
create policy businesses_owner_delete on businesses
  for delete using (owner_id = auth.uid());

-- ---------------------------------------------------------------- locations

drop policy if exists locations_public_read on locations;
create policy locations_public_read on locations for select using (true);

drop policy if exists locations_manage on locations;
create policy locations_manage on locations
  for all using (qf_is_owner(business_id)) with check (qf_is_owner(business_id));

-- ---------------------------------------------------------------- services

-- Anon sees the menu; members see everything including retired services.
drop policy if exists services_public_read on services;
create policy services_public_read on services
  for select using (
    active or qf_is_member((select business_id from locations l where l.id = location_id))
  );

drop policy if exists services_manage on services;
create policy services_manage on services
  for all using (qf_is_owner((select business_id from locations l where l.id = location_id)))
  with check (qf_is_owner((select business_id from locations l where l.id = location_id)));

-- ---------------------------------------------------------------- members

drop policy if exists members_read on business_members;
create policy members_read on business_members
  for select using (user_id = auth.uid() or qf_is_member(business_id));

drop policy if exists members_manage on business_members;
create policy members_manage on business_members
  for all using (qf_is_owner(business_id)) with check (qf_is_owner(business_id));

-- ---------------------------------------------------------------- queues

-- Readable by anyone: it carries counts and the number being served, nothing else.
-- This is the row the customer's phone subscribes to for live updates.
drop policy if exists queues_public_read on queues;
create policy queues_public_read on queues for select using (true);

drop policy if exists queues_member_write on queues;
create policy queues_member_write on queues
  for update using (qf_is_member((select business_id from locations l where l.id = location_id)))
  with check (qf_is_member((select business_id from locations l where l.id = location_id)));

-- ---------------------------------------------------------------- queue entries

-- No anon select. Members only, and only for their own business.
drop policy if exists entries_member_read on queue_entries;
create policy entries_member_read on queue_entries
  for select using (qf_is_member(business_id));

-- No direct insert/update policy at all: joining and status changes go through the
-- SECURITY DEFINER functions, which is the only place the rules are applied.

-- ---------------------------------------------------------------- billing

drop policy if exists subs_read on subscriptions;
create policy subs_read on subscriptions
  for select using (qf_is_member(business_id));

drop policy if exists payments_read on payments;
create policy payments_read on payments
  for select using (qf_is_owner(business_id));

drop policy if exists usage_read on usage_daily;
create policy usage_read on usage_daily
  for select using (qf_is_member(business_id));

drop policy if exists audit_read on audit_logs;
create policy audit_read on audit_logs
  for select using (qf_is_owner(business_id));

-- ---------------------------------------------------------------- realtime

-- queues drives the customer's live number; queue_entries drives the staff board.
-- Realtime applies the policies above, so a subscriber only receives rows they
-- could already have selected.
do $$ begin
  alter publication supabase_realtime add table queues;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table queue_entries;
exception when duplicate_object then null; end $$;
