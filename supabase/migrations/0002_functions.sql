-- QyoFlow — the write surface.
--
-- The browser never inserts or updates a queue row directly. It calls one of these
-- functions, each of which re-derives ownership, plan entitlements and queue state
-- from the database. A tampered businessId, queueNumber or plan in DevTools changes
-- nothing, because none of those values are trusted as inputs.

-- ---------------------------------------------------------------- helpers

create or replace function qf_is_member(p_business uuid)
returns boolean language sql stable security definer set search_path = public as $fn$
  select exists (select 1 from businesses b
                  where b.id = p_business and b.owner_id = auth.uid())
      or exists (select 1 from business_members m
                  where m.business_id = p_business and m.user_id = auth.uid());
$fn$;

create or replace function qf_is_owner(p_business uuid)
returns boolean language sql stable security definer set search_path = public as $fn$
  select exists (select 1 from businesses b
                  where b.id = p_business and b.owner_id = auth.uid())
      or exists (select 1 from business_members m
                  where m.business_id = p_business and m.user_id = auth.uid()
                    and m.role in ('owner', 'manager'));
$fn$;

create or replace function qf_local_today(p_timezone text)
returns date language sql stable as $fn$
  select (now() at time zone coalesce(nullif(p_timezone, ''), 'UTC'))::date;
$fn$;

-- waiting_count is derived, never incremented by hand, so every path that moves an
-- entry keeps it honest.
create or replace function qf_sync_queue_counts()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare v_queue uuid;
begin
  v_queue := coalesce(new.queue_id, old.queue_id);
  update queues q
     set waiting_count = (select count(*) from queue_entries e
                           where e.queue_id = v_queue and e.status = 'WAITING')
   where q.id = v_queue;
  return coalesce(new, old);
end $fn$;

drop trigger if exists trg_queue_counts on queue_entries;
create trigger trg_queue_counts
  after insert or update or delete on queue_entries
  for each row execute function qf_sync_queue_counts();

-- ---------------------------------------------------------------- public read

-- The whole public business page in one round trip. Safe for anon: no entry-level
-- data, no customer names, no phone numbers.
create or replace function qf_business_page(p_slug text)
returns jsonb language plpgsql stable security definer set search_path = public as $fn$
declare
  v_biz businesses%rowtype;
  v_loc locations%rowtype;
  v_queue queues%rowtype;
  v_services jsonb;
  v_eta int;
begin
  select * into v_biz from businesses where slug = lower(trim(p_slug));
  if not found then return null; end if;

  select * into v_loc from locations
   where business_id = v_biz.id order by position, created_at limit 1;
  if not found then return null; end if;

  select * into v_queue from queues
   where location_id = v_loc.id and service_date = qf_local_today(v_loc.timezone);

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', s.id, 'name', s.name,
           'price_cents', s.price_cents, 'duration_min', s.duration_min
         ) order by s.position, s.created_at), '[]'::jsonb)
    into v_services
    from services s where s.location_id = v_loc.id and s.active;

  -- Expected wait = everyone still waiting x the average length of what they booked.
  select coalesce(round(avg(coalesce(s.duration_min, 15)))::int, 15) * coalesce(v_queue.waiting_count, 0)
    into v_eta
    from queue_entries e
    left join services s on s.id = e.service_id
   where e.queue_id = v_queue.id and e.status = 'WAITING';

  return jsonb_build_object(
    'business', jsonb_build_object('id', v_biz.id, 'name', v_biz.name, 'slug', v_biz.slug,
                                   'tagline', v_biz.tagline, 'accent', v_biz.accent),
    'location', jsonb_build_object('id', v_loc.id, 'name', v_loc.name,
                                   'address', v_loc.address, 'timezone', v_loc.timezone,
                                   'is_open', v_loc.is_open),
    'services', v_services,
    'queue', jsonb_build_object(
      'is_open', coalesce(v_queue.is_open, true),
      'waiting', coalesce(v_queue.waiting_count, 0),
      'serving_number', v_queue.serving_number,
      'eta_minutes', coalesce(v_eta, 0)
    )
  );
end $fn$;

-- ---------------------------------------------------------------- join

create or replace function qf_join_queue(
  p_slug       text,
  p_service_id uuid,
  p_name       text default null,
  p_phone      text default null
) returns jsonb language plpgsql security definer set search_path = public as $fn$
declare
  v_biz businesses%rowtype;
  v_loc locations%rowtype;
  v_service services%rowtype;
  v_queue queues%rowtype;
  v_plan plans%rowtype;
  v_today date;
  v_used int;
  v_entry queue_entries%rowtype;
begin
  select * into v_biz from businesses where slug = lower(trim(p_slug));
  if not found then raise exception 'BUSINESS_NOT_FOUND'; end if;

  select * into v_service from services where id = p_service_id and active;
  if not found then raise exception 'SERVICE_UNAVAILABLE'; end if;

  -- The service must belong to this business. Posting someone else's service id
  -- does not get you into their queue.
  select * into v_loc from locations
   where id = v_service.location_id and business_id = v_biz.id;
  if not found then raise exception 'SERVICE_UNAVAILABLE'; end if;
  if not v_loc.is_open then raise exception 'LOCATION_CLOSED'; end if;

  v_today := qf_local_today(v_loc.timezone);
  select * into v_plan from plans where tier = v_biz.plan;

  -- Plan enforcement lives here, where it cannot be edited away.
  select coalesce(joined_count, 0) into v_used
    from usage_daily where business_id = v_biz.id and usage_date = v_today;
  if v_plan.daily_customer_limit is not null
     and coalesce(v_used, 0) >= v_plan.daily_customer_limit then
    raise exception 'PLAN_LIMIT_REACHED';
  end if;

  insert into queues (location_id, service_date) values (v_loc.id, v_today)
    on conflict (location_id, service_date) do nothing;

  -- Serialises number allocation: two people scanning at once cannot get #42 twice.
  select * into v_queue from queues
   where location_id = v_loc.id and service_date = v_today for update;
  if not v_queue.is_open then raise exception 'QUEUE_CLOSED'; end if;

  insert into queue_entries (queue_id, location_id, business_id, service_id, number,
                             customer_name, customer_phone)
  values (v_queue.id, v_loc.id, v_biz.id, v_service.id, v_queue.last_issued + 1,
          nullif(trim(coalesce(p_name, '')), ''),
          nullif(trim(coalesce(p_phone, '')), ''))
  returning * into v_entry;

  update queues set last_issued = v_entry.number where id = v_queue.id;

  insert into usage_daily (business_id, usage_date, joined_count)
  values (v_biz.id, v_today, 1)
  on conflict (business_id, usage_date)
    do update set joined_count = usage_daily.joined_count + 1;

  return jsonb_build_object('token', v_entry.token, 'number', v_entry.number,
                            'entry_id', v_entry.id);
end $fn$;

-- ---------------------------------------------------------------- ticket

-- Everything the customer's live status page shows. Keyed on the token alone, so
-- there is no account to create and nothing else to remember.
create or replace function qf_ticket(p_token uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $fn$
declare
  v_entry queue_entries%rowtype;
  v_queue queues%rowtype;
  v_biz businesses%rowtype;
  v_loc locations%rowtype;
  v_service services%rowtype;
  v_ahead int;
  v_eta int;
begin
  select * into v_entry from queue_entries where token = p_token;
  if not found then return null; end if;

  select * into v_queue from queues where id = v_entry.queue_id;
  select * into v_biz from businesses where id = v_entry.business_id;
  select * into v_loc from locations where id = v_entry.location_id;
  select * into v_service from services where id = v_entry.service_id;

  select count(*) into v_ahead
    from queue_entries e
   where e.queue_id = v_entry.queue_id
     and e.status in ('WAITING', 'CALLED', 'SERVING')
     and e.number < v_entry.number;

  select coalesce(sum(coalesce(s.duration_min, 15)), 0)::int into v_eta
    from queue_entries e
    left join services s on s.id = e.service_id
   where e.queue_id = v_entry.queue_id
     and e.status in ('WAITING', 'CALLED', 'SERVING')
     and e.number < v_entry.number;

  return jsonb_build_object(
    'entry', jsonb_build_object(
      'id', v_entry.id, 'number', v_entry.number, 'status', v_entry.status,
      'name', v_entry.customer_name, 'joined_at', v_entry.joined_at,
      'called_at', v_entry.called_at, 'ended_at', v_entry.ended_at),
    'service', case when v_service.id is null then null else
      jsonb_build_object('name', v_service.name, 'duration_min', v_service.duration_min) end,
    'business', jsonb_build_object('name', v_biz.name, 'slug', v_biz.slug, 'accent', v_biz.accent),
    'location', jsonb_build_object('name', v_loc.name, 'address', v_loc.address),
    'queue', jsonb_build_object('id', v_queue.id, 'serving_number', v_queue.serving_number,
                                'waiting', v_queue.waiting_count, 'is_open', v_queue.is_open),
    'ahead', v_ahead,
    'eta_minutes', v_eta
  );
end $fn$;

create or replace function qf_leave_queue(p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare v_entry queue_entries%rowtype;
begin
  select * into v_entry from queue_entries where token = p_token for update;
  if not found then raise exception 'TICKET_NOT_FOUND'; end if;
  if v_entry.status not in ('WAITING', 'CALLED') then
    return jsonb_build_object('status', v_entry.status);
  end if;

  update queue_entries set status = 'CANCELLED', ended_at = now()
   where id = v_entry.id;
  return jsonb_build_object('status', 'CANCELLED');
end $fn$;

-- ---------------------------------------------------------------- staff actions

create or replace function qf_call_next(p_location_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare
  v_loc locations%rowtype;
  v_queue queues%rowtype;
  v_entry queue_entries%rowtype;
begin
  select * into v_loc from locations where id = p_location_id;
  if not found then raise exception 'LOCATION_NOT_FOUND'; end if;
  if not qf_is_member(v_loc.business_id) then raise exception 'FORBIDDEN'; end if;

  select * into v_queue from queues
   where location_id = p_location_id and service_date = qf_local_today(v_loc.timezone)
   for update;
  if not found then return jsonb_build_object('called', null); end if;

  select * into v_entry from queue_entries
   where queue_id = v_queue.id and status = 'WAITING'
   order by number asc limit 1 for update;
  if not found then return jsonb_build_object('called', null); end if;

  update queue_entries
     set status = 'CALLED', called_at = now(), served_by = auth.uid()
   where id = v_entry.id returning * into v_entry;

  update queues set serving_number = v_entry.number, serving_entry_id = v_entry.id
   where id = v_queue.id;

  insert into audit_logs (business_id, actor_id, action, target, meta)
  values (v_loc.business_id, auth.uid(), 'queue.call', v_entry.id::text,
          jsonb_build_object('number', v_entry.number));

  return jsonb_build_object('called', to_jsonb(v_entry));
end $fn$;

-- The whole state machine in one guarded entry point.
create or replace function qf_set_entry_status(p_entry_id uuid, p_status entry_status)
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare
  v_entry queue_entries%rowtype;
  v_loc locations%rowtype;
  v_today date;
begin
  select * into v_entry from queue_entries where id = p_entry_id for update;
  if not found then raise exception 'ENTRY_NOT_FOUND'; end if;

  select * into v_loc from locations where id = v_entry.location_id;
  if not qf_is_member(v_entry.business_id) then raise exception 'FORBIDDEN'; end if;

  if v_entry.status in ('COMPLETED', 'CANCELLED', 'NO_SHOW') then
    raise exception 'ENTRY_ALREADY_CLOSED';
  end if;
  if p_status not in ('SERVING', 'COMPLETED', 'SKIPPED', 'NO_SHOW', 'WAITING') then
    raise exception 'INVALID_TRANSITION';
  end if;

  update queue_entries
     set status     = p_status,
         serving_at = case when p_status = 'SERVING' then now() else serving_at end,
         ended_at   = case when p_status in ('COMPLETED', 'NO_SHOW', 'SKIPPED')
                           then now() else null end,
         served_by  = coalesce(served_by, auth.uid())
   where id = v_entry.id
  returning * into v_entry;

  if p_status = 'SERVING' then
    update queues set serving_number = v_entry.number, serving_entry_id = v_entry.id
     where id = v_entry.queue_id;
  elsif p_status in ('COMPLETED', 'NO_SHOW', 'SKIPPED') then
    update queues set serving_entry_id = null
     where id = v_entry.queue_id and serving_entry_id = v_entry.id;
  end if;

  if p_status = 'COMPLETED' then
    v_today := qf_local_today(v_loc.timezone);
    insert into usage_daily (business_id, usage_date, served_count)
    values (v_entry.business_id, v_today, 1)
    on conflict (business_id, usage_date)
      do update set served_count = usage_daily.served_count + 1;
  end if;

  insert into audit_logs (business_id, actor_id, action, target, meta)
  values (v_entry.business_id, auth.uid(), 'queue.' || lower(p_status::text),
          v_entry.id::text, jsonb_build_object('number', v_entry.number));

  return to_jsonb(v_entry);
end $fn$;

create or replace function qf_set_queue_open(p_location_id uuid, p_open boolean)
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare v_loc locations%rowtype; v_today date;
begin
  select * into v_loc from locations where id = p_location_id;
  if not found then raise exception 'LOCATION_NOT_FOUND'; end if;
  if not qf_is_owner(v_loc.business_id) then raise exception 'FORBIDDEN'; end if;

  v_today := qf_local_today(v_loc.timezone);
  insert into queues (location_id, service_date, is_open)
  values (p_location_id, v_today, p_open)
  on conflict (location_id, service_date) do update set is_open = p_open;

  update locations set is_open = p_open where id = p_location_id;
  return jsonb_build_object('is_open', p_open);
end $fn$;

-- ---------------------------------------------------------------- dashboard reads

create or replace function qf_live_queue(p_location_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $fn$
declare
  v_loc locations%rowtype;
  v_queue queues%rowtype;
  v_entries jsonb;
  v_today date;
begin
  select * into v_loc from locations where id = p_location_id;
  if not found then raise exception 'LOCATION_NOT_FOUND'; end if;
  if not qf_is_member(v_loc.business_id) then raise exception 'FORBIDDEN'; end if;

  v_today := qf_local_today(v_loc.timezone);
  select * into v_queue from queues
   where location_id = p_location_id and service_date = v_today;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.number), '[]'::jsonb)
    into v_entries
    from (
      select e.id, e.number, e.status, e.customer_name, e.customer_phone,
             e.joined_at, e.called_at, e.serving_at, e.ended_at,
             s.name as service_name, s.duration_min
        from queue_entries e
        left join services s on s.id = e.service_id
       where e.queue_id = v_queue.id
    ) x;

  return jsonb_build_object(
    'queue', case when v_queue.id is null then null else jsonb_build_object(
      'id', v_queue.id, 'service_date', v_queue.service_date,
      'serving_number', v_queue.serving_number, 'serving_entry_id', v_queue.serving_entry_id,
      'waiting', v_queue.waiting_count, 'last_issued', v_queue.last_issued,
      'is_open', v_queue.is_open) end,
    'entries', v_entries,
    'location', jsonb_build_object('id', v_loc.id, 'name', v_loc.name,
                                   'timezone', v_loc.timezone, 'is_open', v_loc.is_open)
  );
end $fn$;

-- One answer per question a business owner actually asks, not a spreadsheet.
create or replace function qf_analytics(p_business_id uuid, p_days int default 7)
returns jsonb language plpgsql stable security definer set search_path = public as $fn$
declare
  v_tz text;
  v_today date;
  v_from date;
  v_result jsonb;
begin
  if not qf_is_member(p_business_id) then raise exception 'FORBIDDEN'; end if;

  select timezone into v_tz from locations
   where business_id = p_business_id order by position limit 1;
  v_tz := coalesce(v_tz, 'Asia/Manila');
  v_today := qf_local_today(v_tz);
  v_from := v_today - greatest(coalesce(p_days, 7) - 1, 0);

  with scoped as (
    select e.*, (e.joined_at at time zone v_tz)::date as local_date,
           extract(hour from (e.joined_at at time zone v_tz))::int as local_hour,
           extract(epoch from (e.called_at - e.joined_at)) / 60 as wait_min,
           extract(epoch from (e.ended_at - coalesce(e.serving_at, e.called_at))) / 60 as serve_min
      from queue_entries e
     where e.business_id = p_business_id
       and (e.joined_at at time zone v_tz)::date between v_from and v_today
  )
  select jsonb_build_object(
    'range_days', p_days,
    'today', jsonb_build_object(
      'served',  (select count(*) from scoped where local_date = v_today and status = 'COMPLETED'),
      'joined',  (select count(*) from scoped where local_date = v_today),
      'no_show', (select count(*) from scoped where local_date = v_today and status = 'NO_SHOW'),
      'left',    (select count(*) from scoped where local_date = v_today and status = 'CANCELLED')),
    'totals', jsonb_build_object(
      'served', (select count(*) from scoped where status = 'COMPLETED'),
      'joined', (select count(*) from scoped)),
    'avg_wait_min',    (select round(avg(wait_min))  from scoped where wait_min is not null),
    'avg_service_min', (select round(avg(serve_min)) from scoped where serve_min is not null),
    'peak_hour',       (select local_hour from scoped group by local_hour
                         order by count(*) desc, local_hour limit 1),
    'by_hour', (select coalesce(jsonb_agg(jsonb_build_object('hour', h, 'count', c) order by h), '[]'::jsonb)
                  from (select local_hour as h, count(*) as c from scoped
                         where local_date = v_today group by local_hour) q),
    'by_day',  (select coalesce(jsonb_agg(jsonb_build_object('date', d, 'count', c) order by d), '[]'::jsonb)
                  from (select local_date as d, count(*) as c from scoped group by local_date) q),
    'by_service', (select coalesce(jsonb_agg(jsonb_build_object('name', n, 'count', c) order by c desc), '[]'::jsonb)
                  from (select coalesce(s.name, 'Other') as n, count(*) as c
                          from scoped sc left join services s on s.id = sc.service_id
                         group by 1) q)
  ) into v_result;

  return v_result;
end $fn$;

-- Entitlements + today's usage, read from the same source the enforcement uses,
-- so the UI can never disagree with the server about what a plan allows.
create or replace function qf_entitlements(p_business_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $fn$
declare
  v_biz businesses%rowtype;
  v_plan plans%rowtype;
  v_sub subscriptions%rowtype;
  v_tz text;
  v_used int;
begin
  if not qf_is_member(p_business_id) then raise exception 'FORBIDDEN'; end if;
  select * into v_biz from businesses where id = p_business_id;
  select * into v_plan from plans where tier = v_biz.plan;
  select * into v_sub from subscriptions where business_id = p_business_id;

  select timezone into v_tz from locations
   where business_id = p_business_id order by position limit 1;

  select coalesce(joined_count, 0) into v_used from usage_daily
   where business_id = p_business_id
     and usage_date = qf_local_today(coalesce(v_tz, 'Asia/Manila'));

  return jsonb_build_object(
    'plan', to_jsonb(v_plan),
    'subscription', to_jsonb(v_sub),
    'usage_today', coalesce(v_used, 0),
    'limit_reached', v_plan.daily_customer_limit is not null
                     and coalesce(v_used, 0) >= v_plan.daily_customer_limit
  );
end $fn$;

-- ---------------------------------------------------------------- onboarding

-- One transaction: business, first location, services, subscription row. If any of
-- it fails the owner is not left with a half-built account.
create or replace function qf_create_business(
  p_name     text,
  p_slug     text,
  p_location text default 'Main',
  p_timezone text default 'Asia/Manila',
  p_services jsonb default '[]'::jsonb
) returns jsonb language plpgsql security definer set search_path = public as $fn$
declare
  v_biz businesses%rowtype;
  v_loc locations%rowtype;
  v_slug text;
  v_item jsonb;
  v_i int := 0;
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;

  v_slug := lower(regexp_replace(trim(coalesce(nullif(p_slug, ''), p_name)),
                                 '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := trim(both '-' from v_slug);
  -- The slug must satisfy the check constraint on businesses.slug even if the
  -- name was entirely punctuation.
  if length(v_slug) = 0 then v_slug := 'queue'; end if;
  if length(v_slug) < 3 then v_slug := v_slug || 'queue'; end if;
  if exists (select 1 from businesses where slug = v_slug) then
    raise exception 'SLUG_TAKEN';
  end if;

  insert into businesses (owner_id, name, slug)
  values (auth.uid(), trim(p_name), v_slug)
  returning * into v_biz;

  insert into locations (business_id, name, timezone)
  values (v_biz.id, coalesce(nullif(trim(p_location), ''), 'Main'),
          coalesce(nullif(p_timezone, ''), 'Asia/Manila'))
  returning * into v_loc;

  insert into business_members (business_id, user_id, location_id, role)
  values (v_biz.id, auth.uid(), v_loc.id, 'owner')
  on conflict do nothing;

  insert into subscriptions (business_id, tier, status) values (v_biz.id, 'free', 'active')
  on conflict (business_id) do nothing;

  for v_item in select * from jsonb_array_elements(coalesce(p_services, '[]'::jsonb)) loop
    insert into services (location_id, name, price_cents, duration_min, position)
    values (v_loc.id,
            coalesce(nullif(trim(v_item->>'name'), ''), 'Service'),
            coalesce((v_item->>'price_cents')::int, 0),
            coalesce((v_item->>'duration_min')::int, 15),
            v_i);
    v_i := v_i + 1;
  end loop;

  return jsonb_build_object('business_id', v_biz.id, 'slug', v_biz.slug,
                            'location_id', v_loc.id);
end $fn$;

-- ---------------------------------------------------------------- grants

-- CREATE FUNCTION grants EXECUTE to PUBLIC by default, so every qf_ function has
-- to have that taken away before the grants below mean anything. Without this,
-- anon can invoke the staff functions — they still fail on the membership check
-- inside, but relying on that alone leaves no second line of defence.
do $revoke$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname like 'qf\_%'
  loop
    execute format('revoke all on function %s from public', r.sig);
  end loop;
end $revoke$;

grant execute on function qf_business_page(text)                 to anon, authenticated;
grant execute on function qf_join_queue(text, uuid, text, text)   to anon, authenticated;
grant execute on function qf_ticket(uuid)                         to anon, authenticated;
grant execute on function qf_leave_queue(uuid)                    to anon, authenticated;

grant execute on function qf_call_next(uuid)                      to authenticated;
grant execute on function qf_set_entry_status(uuid, entry_status) to authenticated;
grant execute on function qf_set_queue_open(uuid, boolean)        to authenticated;
grant execute on function qf_live_queue(uuid)                     to authenticated;
grant execute on function qf_analytics(uuid, int)                 to authenticated;
grant execute on function qf_entitlements(uuid)                   to authenticated;
grant execute on function qf_create_business(text, text, text, text, jsonb) to authenticated;
