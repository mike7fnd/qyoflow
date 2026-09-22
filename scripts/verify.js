/**
 * End-to-end verification against the live Supabase project.
 * Creates a throwaway owner + business, walks the whole queue lifecycle,
 * probes RLS from an anonymous client, then deletes everything it made.
 */
const fs = require("fs");
const path = require("path");

const root = process.argv[2] || process.cwd();
fs.readFileSync(path.join(root, ".env.local"), "utf8")
  .split(/\r?\n/)
  .forEach((l) => {
    const i = l.indexOf("=");
    if (i > 0 && !l.startsWith("#")) process.env[l.slice(0, i)] = l.slice(i + 1);
  });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
}

async function call(pathname, { method = "GET", key = ANON, jwt, body, prefer } = {}) {
  const headers = {
    apikey: key,
    Authorization: `Bearer ${jwt || key}`,
    "Content-Type": "application/json",
  };
  if (prefer) headers.Prefer = prefer;
  const res = await fetch(URL + pathname, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {}
  return { status: res.status, json, text };
}

const rpc = (fn, args, opts = {}) =>
  call(`/rest/v1/rpc/${fn}`, { method: "POST", body: args, ...opts });

const stamp = Date.now();
const EMAIL = `qyoflow-verify-${stamp}@example.com`;
const PASSWORD = `Verify!${stamp}`;
const SLUG = `verify-shop-${stamp}`;

let userId = null;

(async () => {
  // ---------------------------------------------------------------- schema
  for (const table of [
    "plans", "profiles", "businesses", "locations", "services",
    "business_members", "queues", "queue_entries", "subscriptions",
    "payments", "usage_daily", "audit_logs",
  ]) {
    const r = await call(`/rest/v1/${table}?select=*&limit=1`, { key: SERVICE });
    check(`table ${table} exists`, r.status === 200, r.status !== 200 ? r.text.slice(0, 120) : "");
  }

  // ---------------------------------------------------------------- grants
  const anonForbidden = await rpc("qf_call_next", { p_location_id: "00000000-0000-0000-0000-000000000000" });
  check(
    "anon cannot execute qf_call_next",
    anonForbidden.status === 404 || anonForbidden.status === 401 || anonForbidden.status === 403,
    `status ${anonForbidden.status}`,
  );

  const missing = await rpc("qf_business_page", { p_slug: "definitely-not-a-shop" });
  check("qf_business_page returns null for unknown slug", missing.status === 200 && missing.json === null,
    `status ${missing.status}`);

  // ---------------------------------------------------------------- user
  const created = await call("/auth/v1/admin/users", {
    method: "POST",
    key: SERVICE,
    body: { email: EMAIL, password: PASSWORD, email_confirm: true },
  });
  userId = created.json?.id;
  check("create test auth user", !!userId, created.status !== 200 ? created.text.slice(0, 160) : "");
  if (!userId) return finish();

  const profile = await call(`/rest/v1/profiles?id=eq.${userId}&select=id,email`, { key: SERVICE });
  check("profile row created by trigger", Array.isArray(profile.json) && profile.json.length === 1,
    JSON.stringify(profile.json).slice(0, 120));

  const signIn = await call("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: { email: EMAIL, password: PASSWORD },
  });
  const jwt = signIn.json?.access_token;
  check("sign in returns a session", !!jwt, signIn.status !== 200 ? signIn.text.slice(0, 160) : "");
  if (!jwt) return finish();

  // ---------------------------------------------------------------- onboarding
  const biz = await rpc("qf_create_business", {
    p_name: "Verify Barbershop",
    p_slug: SLUG,
    p_location: "Main",
    p_timezone: "Asia/Manila",
    p_services: [
      { name: "Haircut", price_cents: 15000, duration_min: 20 },
      { name: "Haircut + wash", price_cents: 25000, duration_min: 35 },
    ],
  }, { jwt });
  check("qf_create_business", biz.status === 200 && !!biz.json?.business_id,
    biz.status !== 200 ? biz.text.slice(0, 200) : `slug ${biz.json?.slug}`);
  if (!biz.json?.business_id) return finish();

  const businessId = biz.json.business_id;
  const locationId = biz.json.location_id;

  const dupe = await rpc("qf_create_business", { p_name: "Dupe", p_slug: SLUG }, { jwt });
  check("duplicate slug rejected", dupe.status >= 400 && /SLUG_TAKEN/.test(dupe.text),
    dupe.text.slice(0, 120));

  // ---------------------------------------------------------------- public page
  const page = await rpc("qf_business_page", { p_slug: SLUG });
  const services = page.json?.services ?? [];
  check("qf_business_page as anon", page.status === 200 && services.length === 2,
    `${services.length} services, open=${page.json?.location?.is_open}`);

  const serviceId = services[0]?.id;

  // ---------------------------------------------------------------- join
  const join1 = await rpc("qf_join_queue", {
    p_slug: SLUG, p_service_id: serviceId, p_name: "Ana Santos", p_phone: "09171234567",
  });
  check("anon joins queue -> #1", join1.status === 200 && join1.json?.number === 1,
    join1.status !== 200 ? join1.text.slice(0, 200) : `token ok`);

  const join2 = await rpc("qf_join_queue", { p_slug: SLUG, p_service_id: serviceId, p_name: "Mark Reyes" });
  const join3 = await rpc("qf_join_queue", { p_slug: SLUG, p_service_id: serviceId });
  check("sequential numbering", join2.json?.number === 2 && join3.json?.number === 3,
    `${join2.json?.number}, ${join3.json?.number}`);

  const token1 = join1.json?.token;
  const token2 = join2.json?.token;

  // service belonging to another business must be refused
  const crossTenant = await rpc("qf_join_queue", {
    p_slug: SLUG, p_service_id: "00000000-0000-0000-0000-000000000000",
  });
  check("bogus service id refused", crossTenant.status >= 400 && /SERVICE_UNAVAILABLE/.test(crossTenant.text),
    crossTenant.text.slice(0, 100));

  // ---------------------------------------------------------------- RLS
  const anonEntries = await call("/rest/v1/queue_entries?select=customer_name,customer_phone", {});
  const leaked = Array.isArray(anonEntries.json) ? anonEntries.json.length : -1;
  check("anon cannot read queue_entries (no PII leak)", leaked === 0,
    `status ${anonEntries.status}, rows ${leaked}`);

  const anonQueues = await call("/rest/v1/queues?select=waiting_count,serving_number", {});
  check("anon CAN read queues (needed for live updates)",
    anonQueues.status === 200 && Array.isArray(anonQueues.json) && anonQueues.json.length > 0,
    `rows ${anonQueues.json?.length}`);

  const memberEntries = await call("/rest/v1/queue_entries?select=customer_name&order=number", { jwt });
  check("owner CAN read own queue_entries",
    memberEntries.status === 200 && memberEntries.json?.length === 3,
    `rows ${memberEntries.json?.length}`);

  // ---------------------------------------------------------------- ticket
  const ticket = await rpc("qf_ticket", { p_token: token2 });
  check("qf_ticket: 1 ahead, eta from service durations",
    ticket.json?.ahead === 1 && ticket.json?.eta_minutes === 20,
    `ahead=${ticket.json?.ahead} eta=${ticket.json?.eta_minutes}`);

  // ---------------------------------------------------------------- staff flow
  const called = await rpc("qf_call_next", { p_location_id: locationId }, { jwt });
  check("qf_call_next calls #1", called.json?.called?.number === 1,
    called.status !== 200 ? called.text.slice(0, 200) : "");

  const afterCall = await rpc("qf_ticket", { p_token: token1 });
  check("called ticket reflects CALLED + serving number",
    afterCall.json?.entry?.status === "CALLED" && afterCall.json?.queue?.serving_number === 1,
    `${afterCall.json?.entry?.status} / serving ${afterCall.json?.queue?.serving_number}`);

  const entryId = afterCall.json?.entry?.id;
  const completed = await rpc("qf_set_entry_status", { p_entry_id: entryId, p_status: "COMPLETED" }, { jwt });
  check("qf_set_entry_status COMPLETED", completed.status === 200 && completed.json?.status === "COMPLETED",
    completed.status !== 200 ? completed.text.slice(0, 200) : "");

  const reclose = await rpc("qf_set_entry_status", { p_entry_id: entryId, p_status: "COMPLETED" }, { jwt });
  check("closed entry cannot be re-closed", reclose.status >= 400 && /ALREADY_CLOSED/.test(reclose.text),
    reclose.text.slice(0, 100));

  const waitingCount = await call(`/rest/v1/queues?location_id=eq.${locationId}&select=waiting_count,last_issued`, { key: SERVICE });
  check("waiting_count trigger keeps count honest",
    waitingCount.json?.[0]?.waiting_count === 2 && waitingCount.json?.[0]?.last_issued === 3,
    JSON.stringify(waitingCount.json?.[0]));

  // ---------------------------------------------------------------- leave
  const left = await rpc("qf_leave_queue", { p_token: token2 });
  check("qf_leave_queue cancels", left.json?.status === "CANCELLED", JSON.stringify(left.json));

  // ---------------------------------------------------------------- tenancy
  const other = await call("/auth/v1/admin/users", {
    method: "POST", key: SERVICE,
    body: { email: `qyoflow-intruder-${stamp}@example.com`, password: PASSWORD, email_confirm: true },
  });
  const otherId = other.json?.id;
  const otherSignIn = await call("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: { email: `qyoflow-intruder-${stamp}@example.com`, password: PASSWORD },
  });
  const otherJwt = otherSignIn.json?.access_token;

  if (otherJwt) {
    const steal = await rpc("qf_call_next", { p_location_id: locationId }, { jwt: otherJwt });
    check("another signed-in user cannot call this queue",
      steal.status >= 400 && /FORBIDDEN/.test(steal.text), steal.text.slice(0, 120));

    const peek = await call("/rest/v1/queue_entries?select=customer_name", { jwt: otherJwt });
    check("another user sees none of these entries",
      peek.status === 200 && peek.json?.length === 0, `rows ${peek.json?.length}`);

    const spy = await rpc("qf_live_queue", { p_location_id: locationId }, { jwt: otherJwt });
    check("qf_live_queue refuses a non-member",
      spy.status >= 400 && /FORBIDDEN/.test(spy.text), spy.text.slice(0, 120));
  }

  // ---------------------------------------------------------------- reads
  const live = await rpc("qf_live_queue", { p_location_id: locationId }, { jwt });
  check("qf_live_queue for the owner",
    live.status === 200 && live.json?.entries?.length === 3,
    live.status !== 200 ? live.text.slice(0, 200) : `entries ${live.json?.entries?.length}`);

  const ents = await rpc("qf_entitlements", { p_business_id: businessId }, { jwt });
  check("qf_entitlements reports free plan + usage",
    ents.json?.plan?.tier === "free" && ents.json?.usage_today === 3,
    `tier=${ents.json?.plan?.tier} used=${ents.json?.usage_today} limitReached=${ents.json?.limit_reached}`);

  const stats = await rpc("qf_analytics", { p_business_id: businessId, p_days: 7 }, { jwt });
  check("qf_analytics computes",
    stats.status === 200 && stats.json?.today?.joined === 3 && stats.json?.today?.served === 1,
    stats.status !== 200 ? stats.text.slice(0, 250) : `joined=${stats.json?.today?.joined} served=${stats.json?.today?.served} avgWait=${stats.json?.avg_wait_min} byHour=${JSON.stringify(stats.json?.by_hour)}`);

  const audit = await call(`/rest/v1/audit_logs?business_id=eq.${businessId}&select=action`, { jwt });
  check("audit log records staff actions",
    audit.status === 200 && audit.json?.length >= 2,
    JSON.stringify(audit.json?.map((a) => a.action)));

  // ---------------------------------------------------------------- close queue
  const closed = await rpc("qf_set_queue_open", { p_location_id: locationId, p_open: false }, { jwt });
  check("qf_set_queue_open closes", closed.json?.is_open === false, JSON.stringify(closed.json));

  const joinClosed = await rpc("qf_join_queue", { p_slug: SLUG, p_service_id: serviceId });
  check("closed queue refuses new joins",
    joinClosed.status >= 400 && /CLOSED/.test(joinClosed.text), joinClosed.text.slice(0, 120));

  // ---------------------------------------------------------------- cleanup
  await finish([userId, otherId].filter(Boolean));
})().catch(async (e) => {
  console.error("VERIFY CRASHED:", e);
  await finish(userId ? [userId] : []);
  process.exit(1);
});

async function finish(ids = []) {
  for (const id of ids) {
    const del = await call(`/auth/v1/admin/users/${id}`, { method: "DELETE", key: SERVICE });
    console.log(`cleanup: deleted user ${id.slice(0, 8)}… -> ${del.status}`);
  }
  const passed = results.filter((r) => r.ok).length;
  console.log(`\n${passed}/${results.length} checks passed`);
  const failed = results.filter((r) => !r.ok);
  if (failed.length) {
    console.log("\nFAILURES:");
    failed.forEach((f) => console.log(` - ${f.name}: ${f.detail}`));
  }
}
