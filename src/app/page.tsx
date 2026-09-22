import Link from "next/link";
import { HeroDemo } from "@/components/marketing/hero-demo";
import { MarketingFooter, MarketingNav } from "@/components/marketing/chrome";
import { LinkButton, Rule, Section } from "@/components/ui";
import { PlanGrid } from "@/components/marketing/plan-grid";

export default function LandingPage() {
  return (
    <>
      <MarketingNav />

      <main>
        {/* ───────────────────────────────────────────────────── hero

            Headline and product side by side. The phone is the only image on
            the page, and it is the real interface, not an illustration. */}
        <Section className="grid items-center gap-16 py-14 md:grid-cols-[1.05fr_0.95fr] md:gap-12 md:py-20">
          <div>
            <h1 className="t-display max-w-[13ch] text-[var(--color-ink)]">
              A waiting line nobody has to stand in.
            </h1>

            <p className="mt-6 max-w-[46ch] text-[1.0625rem] leading-[1.6] tracking-[-0.008em] text-[var(--color-ink-2)]">
              Customers scan a code at your door, take a number, and go about
              their day. Their phone shows the line moving and tells them when to
              come back.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <LinkButton href="/signup" size="lg">
                Start free
              </LinkButton>
              <LinkButton href="/how-it-works" variant="secondary" size="lg">
                See how it works
              </LinkButton>
            </div>

            <p className="mt-5 t-body-sm text-[var(--color-ink-3)]">
              No card required. Your queue is live in about two minutes.
            </p>
          </div>

          <HeroDemo />
        </Section>

        {/* ──────────────────────────────────────────── how it works

            A numbered list, not three cards. The steps are sequential, and a
            list says that where a row of boxes doesn't. */}
        <Section className="py-14">
          <h2 className="t-h1 max-w-[20ch] text-[var(--color-ink)]">
            Three steps, and nothing to install.
          </h2>

          <ol className="mt-10 grid gap-x-12 gap-y-10 sm:grid-cols-3">
            {[
              [
                "Customers scan",
                "A QR code at your entrance opens your queue page. No app, no account, no sign-up.",
              ],
              [
                "They take a number",
                "They choose a service and get their place in line — then they're free to leave.",
              ],
              [
                "They come back",
                "Their phone follows the line and notifies them when their turn is close.",
              ],
            ].map(([title, body], i) => (
              <li key={title}>
                <span className="tnum t-label text-[var(--color-ink-3)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-2 t-h2 text-[var(--color-ink)]">{title}</h3>
                <p className="mt-2 max-w-[34ch] t-body text-[var(--color-ink-2)]">{body}</p>
              </li>
            ))}
          </ol>
        </Section>

        {/* ──────────────────────────────────────────── the counter side */}
        <Section className="py-14">
          <div className="grid items-center gap-14 md:grid-cols-2 md:gap-16">
            <div>
              <p className="t-eyebrow text-[var(--color-accent)]">At your counter</p>
              <h2 className="mt-3 t-h1 max-w-[16ch] text-[var(--color-ink)]">
                One button runs the whole line.
              </h2>
              <p className="mt-5 max-w-[44ch] t-body text-[var(--color-ink-2)]">
                Your staff taps <span className="text-[var(--color-ink)]">Call next</span>.
                Every waiting phone updates at the same moment. No shouting names
                across a room, no paper tickets, no clipboard.
              </p>

              <ul className="mt-7 space-y-3">
                {[
                  "Works on the phone that's already at your counter",
                  "Complete, skip or mark a no-show in one tap",
                  "Waits, service times and no-shows recorded as you go",
                ].map((item) => (
                  <li key={item} className="flex gap-3 t-body text-[var(--color-ink-2)]">
                    <span
                      aria-hidden="true"
                      className="mt-[0.6rem] size-1 shrink-0 rounded-full bg-[var(--color-ink-3)]"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <CounterPreview />
          </div>
        </Section>

        {/* ──────────────────────────────────────────── use cases */}
        <Section className="py-14">
          <h2 className="t-h1 text-[var(--color-ink)]">Anywhere a line forms.</h2>
          <dl className="mt-10">
            {[
              ["Barbershops and salons", "Walk-ins without the waiting bench"],
              ["Clinics and labs", "Patients wait in the car, not the corridor"],
              ["Restaurants", "A waitlist guests can watch from outside"],
              ["Government offices", "Service counters with numbers people trust"],
            ].map(([term, detail], i) => (
              <div key={term}>
                {i > 0 && <Rule />}
                <div className="grid gap-1 py-5 sm:grid-cols-[minmax(0,22rem)_1fr] sm:gap-8">
                  <dt className="t-body font-medium text-[var(--color-ink)]">{term}</dt>
                  <dd className="t-body text-[var(--color-ink-2)]">{detail}</dd>
                </div>
              </div>
            ))}
          </dl>
        </Section>

        {/* ──────────────────────────────────────────── pricing */}
        <Section className="py-14">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="t-h1 max-w-[18ch] text-[var(--color-ink)]">
              Start free. Upgrade when the line does.
            </h2>
            <Link
              href="/pricing"
              className="t-body-sm text-[var(--color-accent)] underline-offset-4 hover:underline"
            >
              Compare all plans
            </Link>
          </div>

          <div className="mt-10">
            <PlanGrid />
          </div>
        </Section>

        {/* ──────────────────────────────────────────── close */}
        <Section className="py-14">
          <Rule />
          <div className="flex flex-wrap items-end justify-between gap-8 py-14">
            <h2 className="t-h1 max-w-[20ch] text-[var(--color-ink)]">
              Put a code on your door tonight.
            </h2>
            <LinkButton href="/signup" size="lg">
              Start free
            </LinkButton>
          </div>
        </Section>
      </main>

      <MarketingFooter />
    </>
  );
}

/** A still of the staff board — the other half of the product. */
function CounterPreview() {
  return (
    <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-2)] sm:p-7">
      <p className="t-label text-[var(--color-ink-3)]">Now serving</p>

      <div className="mt-3 flex items-end gap-6">
        <span className="t-num text-[3.25rem] text-[var(--color-ink)]">#37</span>
        <span className="pb-2 min-w-0">
          <span className="block truncate t-h3 text-[var(--color-ink)]">Ana Santos</span>
          <span className="block truncate t-body-sm text-[var(--color-ink-2)]">Haircut</span>
        </span>
      </div>

      <div className="mt-6">
        {[
          [38, "Mark Reyes", "Haircut + wash"],
          [39, "John Cruz", "Haircut"],
          [40, "Maria Lopez", "Kids cut"],
        ].map(([num, name, service], i) => (
          <div key={num as number}>
            {i > 0 && <Rule />}
            <div className="flex items-center gap-4 py-2.5">
              <span className="tnum w-9 shrink-0 t-body font-semibold text-[var(--color-ink-3)]">
                {num}
              </span>
              <span className="min-w-0 flex-1 truncate t-body-sm text-[var(--color-ink)]">
                {name}
              </span>
              <span className="shrink-0 t-meta text-[var(--color-ink-3)]">{service}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex h-12 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent)] text-[0.9375rem] font-medium text-white">
        Call next — #38
      </div>
    </div>
  );
}
