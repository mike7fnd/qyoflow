/**
 * Loads the real pages in a browser and fails on any CSP violation, console
 * error, or failed request. A policy that only looks right in curl is worth
 * nothing.
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright-core");

const BASE = process.argv[2];
const root = process.cwd();
fs.readFileSync(path.join(root, ".env.local"), "utf8")
  .split(/\r?\n/)
  .forEach((l) => {
    const i = l.indexOf("=");
    if (i > 0 && !l.startsWith("#")) process.env[l.slice(0, i)] = l.slice(i + 1);
  });
const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const h = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` };

const stamp = Date.now();
const EMAIL = `csp-${stamp}@example.com`;
const PASSWORD = `Csp!${stamp}`;
const SLUG = `csp-shop-${stamp}`;

let failures = 0;

(async () => {
  const browser = await chromium.launch({ channel: "msedge" });
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();

  const problems = [];
  page.on("console", (m) => {
    const t = m.text();
    if (m.type() === "error" && !/favicon/i.test(t)) problems.push(`console: ${t}`);
  });
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  page.on("requestfailed", (r) => {
    const f = r.failure()?.errorText ?? "";
    if (!/ERR_ABORTED/.test(f)) problems.push(`request failed: ${r.url()} (${f})`);
  });

  const visit = async (route, label) => {
    problems.length = 0;
    await page.goto(BASE + route, { waitUntil: "networkidle" });
    await page.waitForTimeout(900);
    if (problems.length) {
      failures++;
      console.log(`  FAIL ${label}`);
      problems.slice(0, 4).forEach((p) => console.log(`       ${p}`));
    } else {
      console.log(`  ok   ${label}`);
    }
  };

  console.log("public pages");
  for (const [r, l] of [
    ["/", "landing"],
    ["/pricing", "pricing"],
    ["/how-it-works", "how-it-works"],
    ["/features", "features"],
    ["/signup", "signup"],
  ]) {
    await visit(r, l);
  }

  // Account, so the signed-in surfaces and the QR canvas get exercised too.
  await fetch(`${SUPA}/auth/v1/admin/users`, {
    method: "POST",
    headers: { ...h, "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, email_confirm: true }),
  });

  await page.goto(BASE + "/login", { waitUntil: "networkidle" });
  await page.fill("#email", EMAIL);
  await page.fill("#password", PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(onboarding|dashboard)/, { timeout: 30000 });

  await page.goto(BASE + "/onboarding", { waitUntil: "networkidle" });
  await page.fill("#biz-name", "CSP Shop");
  await page.fill("#biz-slug", SLUG);
  await page.waitForTimeout(900);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Create my queue" }).click();
  await page.waitForTimeout(3500);

  console.log("signed-in pages");
  for (const [r, l] of [
    ["/dashboard", "dashboard"],
    ["/queue", "queue (realtime websocket)"],
    ["/services", "services"],
    ["/qr", "qr (canvas + data: image)"],
    ["/billing", "billing"],
    ["/settings", "settings"],
    ["/counter", "counter"],
  ]) {
    await visit(r, l);
  }

  console.log("customer pages");
  await visit(`/q/${SLUG}`, "business page");

  // The QR image must actually have rendered, not been blocked by img-src.
  await page.goto(BASE + "/qr", { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  const qr = await page.evaluate(() => {
    const img = document.querySelector('img[alt^="QR code"]');
    return img ? { src: img.getAttribute("src")?.slice(0, 20), w: img.naturalWidth } : null;
  });
  if (qr && qr.w > 0) console.log(`  ok   QR rendered (${qr.src}…, ${qr.w}px)`);
  else {
    failures++;
    console.log("  FAIL QR did not render", JSON.stringify(qr));
  }

  await browser.close();

  const { users = [] } = await (await fetch(`${SUPA}/auth/v1/admin/users`, { headers: h })).json();
  for (const u of users.filter((u) => u.email === EMAIL)) {
    await fetch(`${SUPA}/auth/v1/admin/users/${u.id}`, { method: "DELETE", headers: h });
    console.log("  cleanup:", u.email);
  }

  console.log(failures ? `\n${failures} page(s) with problems` : "\nNo CSP or console errors.");
  process.exit(failures ? 1 : 0);
})();
