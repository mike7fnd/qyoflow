/**
 * Screenshots every screen, signed out and signed in, at desktop and phone
 * widths — a visual check you can actually look at after changing the design.
 *
 *   node scripts/shots.js [baseUrl] [outDir]
 *
 * Drives the Edge already installed on the machine (no browser download). It
 * signs up a throwaway owner, walks onboarding, joins the queue as a customer,
 * then deletes everything it created. Point it at a development project.
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright-core");

const BASE = process.argv[2] || "http://localhost:3123";
const OUT = process.argv[3] || path.join(process.cwd(), ".shots");

const root = process.cwd();
fs.readFileSync(path.join(root, ".env.local"), "utf8")
  .split(/\r?\n/)
  .forEach((l) => {
    const i = l.indexOf("=");
    if (i > 0 && !l.startsWith("#")) process.env[l.slice(0, i)] = l.slice(i + 1);
  });

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

const stamp = Date.now();
const EMAIL = `shots-${stamp}@example.com`;
const PASSWORD = `Shots!${stamp}`;
const SLUG = `shots-shop-${stamp}`;

const DESKTOP = { width: 1440, height: 1100 };
const PHONE = { width: 390, height: 844 };

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: "msedge" });

  const shot = async (page, name) => {
    await page.waitForTimeout(700); // let entry transitions settle
    const file = path.join(OUT, `${name}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log("  •", name);
  };

  // ─────────────────────────────────────────────── signed out, desktop
  let ctx = await browser.newContext({ viewport: DESKTOP, deviceScaleFactor: 1 });
  let page = await ctx.newPage();

  console.log("marketing (desktop)");
  for (const [route, name] of [
    ["/", "01-landing"],
    ["/how-it-works", "02-how-it-works"],
    ["/features", "03-features"],
    ["/pricing", "04-pricing"],
    ["/signup", "05-signup"],
    ["/login", "06-login"],
    ["/nope", "07-not-found"],
  ]) {
    await page.goto(BASE + route, { waitUntil: "networkidle" });
    await shot(page, name);
  }

  // ─────────────────────────────────────────────── sign in + onboarding
  //
  // The account is created through the admin API rather than the signup form,
  // so the run doesn't depend on whether the project requires email
  // confirmation. Everything after this point is the real UI.
  console.log("onboarding (desktop)");
  const created = await fetch(`${SUPA}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: SERVICE,
      Authorization: `Bearer ${SERVICE}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: "Test Owner" },
    }),
  });
  if (!created.ok) throw new Error(`could not create user: ${await created.text()}`);

  await page.goto(BASE + "/login", { waitUntil: "networkidle" });
  await page.fill("#email", EMAIL);
  await page.fill("#password", PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(onboarding|dashboard)/, { timeout: 30000 });
  if (!page.url().includes("/onboarding")) {
    await page.goto(BASE + "/onboarding", { waitUntil: "networkidle" });
  }
  await shot(page, "08-onboarding-business");

  await page.fill("#biz-name", "Shots Barbershop");
  await page.fill("#biz-slug", SLUG);
  await page.waitForTimeout(900); // slug availability check
  await page.getByRole("button", { name: "Continue" }).click();
  await shot(page, "09-onboarding-services");

  await page.getByRole("button", { name: "Create my queue" }).click();
  await page.waitForTimeout(3500);
  await shot(page, "10-onboarding-launch");

  // ─────────────────────────────────────────────── empty dashboard
  console.log("app, empty (desktop)");
  for (const [route, name] of [
    ["/dashboard", "11-dashboard-empty"],
    ["/queue", "12-queue-empty"],
    ["/analytics", "13-analytics-empty"],
    ["/services", "14-services"],
    ["/qr", "15-qr"],
    ["/billing", "16-billing"],
    ["/settings", "17-settings"],
  ]) {
    await page.goto(BASE + route, { waitUntil: "networkidle" });
    await shot(page, name);
  }

  // ─────────────────────────────────────────────── customer joins
  console.log("customer (phone)");
  const phoneCtx = await browser.newContext({ viewport: PHONE, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const phone = await phoneCtx.newPage();

  await phone.goto(`${BASE}/q/${SLUG}`, { waitUntil: "networkidle" });
  await shot(phone, "18-customer-business-page");

  await phone.getByRole("button", { name: /Haircut/ }).first().click();
  await shot(phone, "19-customer-confirm");

  await phone.getByRole("button", { name: "Join queue" }).click();
  await phone.waitForURL("**/t/**", { timeout: 30000 });
  await shot(phone, "20-customer-ticket-joined");

  const ticketUrl = phone.url();

  // A few more people, so the board has a real line on it.
  const extraCtx = await browser.newContext({ viewport: PHONE });
  for (const who of ["Mark Reyes", "Grace Uy", "Nico Garcia"]) {
    const p = await extraCtx.newPage();
    await p.goto(`${BASE}/q/${SLUG}`, { waitUntil: "networkidle" });
    await p.evaluate(() => localStorage.clear());
    await p.reload({ waitUntil: "networkidle" });
    await p.getByRole("button", { name: /Haircut|Kids/ }).first().click();
    await p.getByRole("button", { name: /Add your name/ }).click();
    await p.fill('input[aria-label="Your name"]', who);
    await p.getByRole("button", { name: "Join queue" }).click();
    await p.waitForURL("**/t/**", { timeout: 30000 });
    await p.close();
  }

  // ─────────────────────────────────────────────── busy board
  console.log("app, busy");
  await page.goto(BASE + "/queue", { waitUntil: "networkidle" });
  await shot(page, "21-queue-waiting");

  // Captured even if the call fails, so the screenshot shows whatever the
  // staff would actually be looking at.
  try {
    await page.getByRole("button", { name: /Call next/ }).click({ timeout: 8000 });
    await page.waitForTimeout(1400);
  } catch {
    console.log("    (could not call next — capturing the board as-is)");
  }
  await shot(page, "22-queue-serving");

  await page.goto(BASE + "/dashboard", { waitUntil: "networkidle" });
  await shot(page, "23-dashboard-busy");

  await page.goto(BASE + "/analytics", { waitUntil: "networkidle" });
  await shot(page, "24-analytics-busy");

  await page.goto(BASE + "/staff", { waitUntil: "networkidle" });
  await shot(page, "25-counter-desktop");

  // The customer's view of the same moment.
  await phone.goto(ticketUrl, { waitUntil: "networkidle" });
  await shot(phone, "26-customer-ticket-called");

  // ─────────────────────────────────────────────── phone, signed in
  console.log("app (phone)");
  const mobileApp = await browser.newContext({
    viewport: PHONE,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    storageState: await ctx.storageState(),
  });
  const mob = await mobileApp.newPage();

  for (const [route, name] of [
    ["/dashboard", "27-m-dashboard"],
    ["/queue", "28-m-queue"],
    ["/staff", "29-m-counter"],
    ["/billing", "30-m-billing"],
  ]) {
    await mob.goto(BASE + route, { waitUntil: "networkidle" });
    await shot(mob, name);
  }

  await mob.goto(BASE + "/dashboard", { waitUntil: "networkidle" });
  await mob.getByRole("button", { name: "More" }).click();
  await shot(mob, "31-m-more-sheet");

  // phone-width marketing
  await mob.goto(BASE + "/", { waitUntil: "networkidle" });
  await shot(mob, "32-m-landing");
  await mob.goto(BASE + "/pricing", { waitUntil: "networkidle" });
  await shot(mob, "33-m-pricing");

  await browser.close();

  // ─────────────────────────────────────────────── clean up
  const res = await fetch(`${SUPA}/auth/v1/admin/users`, {
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
  });
  const { users = [] } = await res.json();
  for (const u of users.filter((u) => u.email === EMAIL)) {
    await fetch(`${SUPA}/auth/v1/admin/users/${u.id}`, {
      method: "DELETE",
      headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
    });
    console.log("cleanup: removed", u.email);
  }

  console.log("\nScreenshots in", OUT);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
