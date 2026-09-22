-- Optional demo data.
--
-- Run AFTER the migrations, and only in a development project. It creates a
-- barbershop with a few services and a queue mid-shift, so the dashboard and the
-- customer page have something to show before your first real customer.
--
-- Replace the owner id below with a real auth.users id first:
--   select id, email from auth.users;

do $seed$
declare
  v_owner uuid := '00000000-0000-0000-0000-000000000000';  -- <- change me
  v_biz uuid;
  v_loc uuid;
  v_haircut uuid;
  v_wash uuid;
  v_queue uuid;
  v_today date;
  i int;
begin
  if not exists (select 1 from auth.users where id = v_owner) then
    raise notice 'Set v_owner to a real auth.users id before running the seed.';
    return;
  end if;

  insert into businesses (owner_id, name, slug, tagline)
  values (v_owner, 'ABC Barbershop', 'abcbarbers', 'Walk-ins welcome')
  on conflict (slug) do update set name = excluded.name
  returning id into v_biz;

  insert into locations (business_id, name, address, timezone)
  values (v_biz, 'Calapan', '123 Rizal St, Calapan City', 'Asia/Manila')
  returning id into v_loc;

  insert into business_members (business_id, user_id, location_id, role)
  values (v_biz, v_owner, v_loc, 'owner')
  on conflict do nothing;

  insert into subscriptions (business_id, tier, status)
  values (v_biz, 'free', 'active')
  on conflict (business_id) do nothing;

  insert into services (location_id, name, price_cents, duration_min, position)
  values (v_loc, 'Haircut', 15000, 20, 0) returning id into v_haircut;
  insert into services (location_id, name, price_cents, duration_min, position)
  values (v_loc, 'Haircut + wash', 25000, 35, 1) returning id into v_wash;
  insert into services (location_id, name, price_cents, duration_min, position)
  values (v_loc, 'Kids cut', 12000, 15, 2);

  v_today := (now() at time zone 'Asia/Manila')::date;

  insert into queues (location_id, service_date, last_issued, serving_number)
  values (v_loc, v_today, 0, null)
  on conflict (location_id, service_date) do nothing
  returning id into v_queue;

  select id into v_queue from queues where location_id = v_loc and service_date = v_today;

  -- Numbers 1-5 completed earlier in the shift.
  for i in 1..5 loop
    insert into queue_entries (queue_id, location_id, business_id, service_id, number,
                               status, customer_name, joined_at, called_at, serving_at, ended_at)
    values (v_queue, v_loc, v_biz, v_haircut, i, 'COMPLETED',
            (array['Ana Santos','Mark Reyes','John Cruz','Maria Lopez','Ben Tan'])[i],
            now() - ((6 - i) * interval '25 minutes'),
            now() - ((6 - i) * interval '25 minutes') + interval '8 minutes',
            now() - ((6 - i) * interval '25 minutes') + interval '9 minutes',
            now() - ((6 - i) * interval '25 minutes') + interval '24 minutes');
  end loop;

  -- Four people still in line.
  for i in 6..9 loop
    insert into queue_entries (queue_id, location_id, business_id, service_id, number,
                               status, customer_name, joined_at)
    values (v_queue, v_loc, v_biz, case when i % 2 = 0 then v_haircut else v_wash end, i,
            'WAITING',
            (array['Rosa Dela Cruz','Paolo Lim','Grace Uy','Nico Garcia'])[i - 5],
            now() - ((10 - i) * interval '6 minutes'));
  end loop;

  update queues set last_issued = 9, serving_number = 5 where id = v_queue;

  insert into usage_daily (business_id, usage_date, joined_count, served_count)
  values (v_biz, v_today, 9, 5)
  on conflict (business_id, usage_date)
    do update set joined_count = 9, served_count = 5;

  raise notice 'Seeded ABC Barbershop at /q/abcbarbers';
end $seed$;
