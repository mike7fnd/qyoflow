-- QyoFlow — patch for a database that already ran 0001–0003.
--
-- Two problems found by running the stack against a live project:
--
--   1. qf_live_queue called row_to_jsonb(), which does not exist in Postgres.
--      The staff board and counter mode both failed outright. The correct
--      function for a record is to_jsonb().
--
--   2. CREATE FUNCTION grants EXECUTE to PUBLIC by default, so the grants at the
--      end of 0002 were decorative — anon could invoke the staff functions. They
--      still failed on the membership check inside, so nothing was exposed, but
--      the grant list has to actually mean something.
--
-- 0002 has been corrected too, so a fresh install never needs this file. Running
-- it twice is harmless.

-- ---------------------------------------------------------------- 1. to_jsonb

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

-- ---------------------------------------------------------------- 2. grants

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

grant execute on function qf_business_page(text)                  to anon, authenticated;
grant execute on function qf_join_queue(text, uuid, text, text)    to anon, authenticated;
grant execute on function qf_ticket(uuid)                          to anon, authenticated;
grant execute on function qf_leave_queue(uuid)                     to anon, authenticated;

grant execute on function qf_call_next(uuid)                       to authenticated;
grant execute on function qf_set_entry_status(uuid, entry_status)  to authenticated;
grant execute on function qf_set_queue_open(uuid, boolean)         to authenticated;
grant execute on function qf_live_queue(uuid)                      to authenticated;
grant execute on function qf_analytics(uuid, int)                  to authenticated;
grant execute on function qf_entitlements(uuid)                    to authenticated;
grant execute on function qf_create_business(text, text, text, text, jsonb) to authenticated;
