-- QyoFlow — shared rate limiting.
--
-- The application's in-process counter only ever held for a single instance.
-- On any real deployment (several serverless instances, or more than one
-- container) an attacker just lands on a different one. The counter has to be
-- somewhere both instances can see, and the database already is that place.

create table if not exists rate_limits (
  bucket   text primary key,
  count    int not null default 0,
  reset_at timestamptz not null
);

create index if not exists rate_limits_reset_idx on rate_limits(reset_at);

-- Nobody talks to this table directly. RLS is on with no policies at all, so
-- anon and authenticated are denied outright; the SECURITY DEFINER function
-- below is the only way in.
alter table rate_limits enable row level security;

/**
 * Fixed-window counter. Returns true when the call is allowed.
 *
 * One statement, so concurrent callers serialise on the primary key rather
 * than racing between a read and a write.
 */
create or replace function qf_rate_limit(
  p_bucket         text,
  p_limit          int,
  p_window_seconds int
) returns boolean language plpgsql security definer set search_path = public as $fn$
declare
  v_now timestamptz := now();
  v_count int;
begin
  if p_bucket is null or length(p_bucket) = 0 then return true; end if;
  if p_limit <= 0 then return false; end if;

  insert into rate_limits (bucket, count, reset_at)
  values (left(p_bucket, 200), 1, v_now + make_interval(secs => p_window_seconds))
  on conflict (bucket) do update
     set count = case
                   when rate_limits.reset_at <= v_now then 1
                   else rate_limits.count + 1
                 end,
         reset_at = case
                      when rate_limits.reset_at <= v_now
                        then v_now + make_interval(secs => p_window_seconds)
                      else rate_limits.reset_at
                    end
  returning count into v_count;

  -- Occasional opportunistic sweep, so the table can't grow without bound
  -- and nothing needs a scheduled job.
  if random() < 0.005 then
    delete from rate_limits where reset_at < v_now - interval '1 hour';
  end if;

  return v_count <= p_limit;
end $fn$;

revoke all on function qf_rate_limit(text, int, int) from public;
grant execute on function qf_rate_limit(text, int, int) to anon, authenticated;
