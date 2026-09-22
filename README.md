# QyoFlow

A digital waiting line for businesses that would rather not have one. Customers
scan a QR code, get a number, and leave; their phone shows the line moving and
tells them when to come back. Staff tap one button.

Next.js 15 (App Router) · Supabase (Postgres, Auth, Realtime, RLS) · Tailwind v4.

---

## Running it

```bash
npm install
cp .env.example .env.local     # then fill in your Supabase keys
npm run dev
```

### Supabase setup

1. Create a project at [supabase.com](https://supabase.com/dashboard).
2. Run the migrations **in order** in the SQL editor:
   - `supabase/migrations/0001_schema.sql`
   - `supabase/migrations/0002_functions.sql`
   - `supabase/migrations/0003_rls.sql`
   - `supabase/migrations/0004_fixes.sql` — only needed if you ran `0002` before
     it was corrected. It is idempotent, so running it anyway is harmless.
3. Copy your project URL, anon key and service-role key into `.env.local`.
4. Optional: edit the owner id at the top of `supabase/seed.sql` and run it for a
   demo barbershop at `/q/abcbarbers`.

### Sign-up and email

Auth is email and password. Owner accounts are created **server-side with the
service role and marked confirmed**, so Supabase never sends a confirmation
email — nothing to configure in the dashboard, and no "Email rate limit
exceeded" once the built-in SMTP quota (a handful of messages an hour) is spent.
That failure used to surface to whoever was signing up at the time.

Two consequences worth knowing:

- An address isn't proven to belong to whoever typed it. Fine while email is
  only a login; if you later send receipts or password resets, verify at that
  point rather than at sign-up.
- Supabase's own sign-up throttling is bypassed along with its email, so the
  throttle lives in the app instead (`src/lib/rate-limit.ts`): five sign-ups and
  ten sign-in attempts per address-block, per window. That counter is
  in-process — move it to Redis or Postgres before running more than one
  instance.

Unset `SUPABASE_SERVICE_ROLE_KEY` to fall back to `supabase.auth.signUp()` and
Supabase's own confirmation flow.

> **`next.config` must stay `.mjs`.** With a `.ts` config, Next transpiles it at
> runtime through SWC, which needs a server vendor chunk the Windows build does
> not reliably emit; `next start` then returns 500 on every route with
> `Cannot find module './vendor-chunks/@swc.js'`.

Realtime must be enabled for `queues` and `queue_entries`. `0003` adds both to
the `supabase_realtime` publication; confirm under **Database → Replication**.

---

## How it fits together

```
Customer                       Business
────────                       ────────
/q/<slug>      join flow       /dashboard   today at a glance
/t/<token>     live ticket     /queue       the board + Call next
                               /staff       counter mode (phone/tablet)
                               /services    what people queue for
                               /analytics   waits, peaks, service mix
                               /qr          the printable poster
                               /billing     plan + payments
                               /settings    name, address, time zone
```

### The security model

The frontend is never trusted. Concretely:

- **Every write goes through a `SECURITY DEFINER` function** (`supabase/migrations/0002_functions.sql`).
  `qf_join_queue`, `qf_call_next` and `qf_set_entry_status` re-derive ownership,
  plan limits and queue state from the database. Passing someone else's
  `businessId`, a forged `queueNumber`, or a `tier` you haven't paid for changes
  nothing — those values are inputs to a check, not instructions.
- **RLS is on for every table**, default-deny. Anonymous visitors can read what a
  poster in a shop window shows: the business, its services, and how long the line
  is. They cannot select `queue_entries` at all, which is why the customer's live
  page reads through `qf_ticket(token)` instead.
- **Plan limits live in the `plans` table**, and the same rows drive both the
  pricing page and the enforcement inside `qf_join_queue`. The UI cannot promise
  something the server will refuse.
- **`applyPlan()` is deliberately not a server action** (`src/lib/subscription.ts`).
  Exporting it from a `"use server"` module would make it callable from any
  browser with any arguments. It runs with the service role, reached only from the
  owner-verified upgrade path and the billing webhook.
- **The billing webhook verifies its signature** over the raw body and rejects
  anything outside a five-minute window. The redirect back from checkout is never
  treated as proof of payment.
- **Rate limiting** on the public join path (`src/lib/rate-limit.ts`). It is
  in-process, so it holds for one instance — move it to Redis or Postgres before
  scaling out.

### Queue state machine

`WAITING → CALLED → SERVING → COMPLETED`, with `SKIPPED`, `CANCELLED` and
`NO_SHOW` as explicit terminal states. Keeping them distinct is what makes the
analytics answerable: "people who left" and "people who didn't show up" are
different problems with different fixes.

### Realtime

Two channels, deliberately shaped by who is allowed to see what:

- **Staff** subscribe to `queue_entries` for their location. RLS filters the
  stream, and a change triggers a re-read of the whole board through
  `qf_live_queue` — one source of truth, no client-side merge logic to drift.
- **Customers** subscribe to the `queues` row, which holds counts and the number
  being served and no personal data at all. Their own ticket is re-read through
  `qf_ticket`. Other customers' names never reach their device.

---

## Design

The whole system lives at the top of `src/app/globals.css`: one accent
(`#175CD3`), three neutral inks, three radii, three elevations, and nine type
steps exposed as classes (`.t-display` … `.t-meta`, plus `.t-num` for live
figures). Components reference those classes rather than raw pixel values, so
hierarchy stays consistent across screens built weeks apart. Three font weights
(400/500/600) and one icon set, drawn on a 16px grid.

Surfaces carry a hairline ring in their shadow instead of a `border`, and panels
are used only for things that are genuinely separate objects — a form, a list, a
receipt. Grouping is whitespace's job.

**Motion is state, never decoration.** There is no on-load animation anywhere:
pages arrive composed. What does animate: a queue number slides in the direction
the value moved, a row collapses out of the list when it is called so the rows
below visibly close the gap, and the status line changes when its meaning does.
It is all CSS keyframes plus a small FLIP helper
(`src/lib/use-list-transition.ts`) using the Web Animations API — no animation
library. `prefers-reduced-motion` disables the lot.

Buttons come in exactly four roles: primary, secondary, tertiary, danger. Icons
appear on a button only where the verb alone is ambiguous (download / print /
copy all produce the same artwork).

Light-only by design. There is no dark theme.

### Base-layer gotcha

Element resets in `globals.css` sit inside `@layer base`. They must: unlayered
CSS outranks every cascade layer, so an unlayered `button { color: inherit }`
silently beats `text-[var(--color-ink-3)]` and every muted button renders black.

## Looking at it

```bash
npm run shots
```

`scripts/shots.js` drives the Edge already installed on the machine through
`playwright-core` (no browser download). It signs in, walks onboarding, joins the
queue as a customer, and screenshots every screen at desktop and phone widths
into `.shots/`, then deletes the account it created. Point it at a development
project.

---

## Billing

Billing sits behind one interface (`src/lib/billing.ts`) with two modes:

- **manual** — no keys set. Plan changes apply directly. This is the default and
  is what you want in development.
- **paymongo** — set `PAYMONGO_SECRET_KEY` and `PAYMONGO_WEBHOOK_SECRET`. GCash,
  Maya, GrabPay and cards, priced in PHP.

Point the provider's webhook at `POST /api/billing/webhook`.

> The PayMongo request shape and the webhook signature scheme are written from
> their documented behaviour but have **not** been exercised against a live
> account. Verify both against current PayMongo docs before taking real money.

---

## Verification

```bash
npm run verify
```

Runs `scripts/verify.js` against whatever project `.env.local` points at. It
creates a throwaway owner and business, walks the whole lifecycle, probes RLS
from both an anonymous and a signed-in attacker, then deletes everything it made.
Point it at a development project, not production.

The stack has been exercised against a live Supabase project: a throwaway owner
is created, walked through onboarding, three anonymous customers join, staff call
and complete them, and a second signed-in user tries to reach into the first
one's queue. 42 checks, covering the schema, the grants, every RPC, the
`waiting_count` trigger, and tenant isolation from both an anonymous and a
signed-in attacker.

That run found two real bugs, both since fixed:

- `qf_live_queue` called `row_to_jsonb()`, which does not exist in Postgres. The
  staff board and counter mode failed outright.
- `CREATE FUNCTION` grants `EXECUTE` to `PUBLIC` by default, so the grant list at
  the end of `0002` was decorative — anon could invoke the staff functions. They
  still failed on the membership check inside, so nothing leaked, but the grants
  now actually restrict. Both fixes are in `0004_fixes.sql`.

## What is built, and what isn't

Built: the whole MVP loop — signup, onboarding, services, QR poster, the public
join flow, the live customer ticket, the staff board and counter mode, analytics,
plans with server-side enforcement, and audit logging.

Not built yet, in rough order of usefulness:

- **SMS notifications.** The plan flag and the phone field exist; no provider is
  wired up. Browser notifications work today.
- **Staff invitations.** `business_members` and role gating are in place, but
  there is no UI to invite someone — insert the row by hand for now.
- **Multiple locations.** The schema supports them and Pro allows 25; the UI
  currently uses the first location. A location switcher is the missing piece.
- **Platform admin.** No cross-business console.
- **Automated tests.** None.
