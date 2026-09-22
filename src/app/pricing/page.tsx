import { MarketingFooter, MarketingNav } from "@/components/marketing/chrome";
import { PlanGrid, loadPlans } from "@/components/marketing/plan-grid";
import { Check, Rule, Section } from "@/components/ui";
import { planPrice } from "@/lib/format";

export const metadata = {
  title: "Pricing",
  description: "Start free. Upgrade when your queue does.",
};

const FAQ = [
  [
    "Do my customers need an account?",
    "No. They scan, choose a service, and get a number. No app, no password, nothing to verify. A phone number is optional and only used to text them when they're close.",
  ],
  [
    "What happens when I reach the Free plan's daily limit?",
    "Everyone already in line keeps their number and the queue runs as normal. New customers can join again the next day, or immediately if you upgrade.",
  ],
  [
    "Can I cancel?",
    "Whenever you like. Your plan runs to the end of the period you've paid for and then returns to Free. Your queue history stays.",
  ],
  [
    "How do customers pay for their service?",
    "They don't pay through QyoFlow. We handle the line, not the till — your customers pay you however they already do.",
  ],
  [
    "What if I change something after printing the QR code?",
    "The code points at your queue address, which never changes. Rename your business, add services, change your hours — the printed code keeps working.",
  ],
];

export default async function PricingPage() {
  const plans = await loadPlans();

  return (
    <>
      <MarketingNav />

      <main>
        <Section className="pt-14 pb-10 md:pt-16">
          <h1 className="t-display max-w-[16ch] text-[var(--color-ink)]">
            Start free. Upgrade when the line does.
          </h1>
          <p className="mt-6 max-w-[48ch] text-[1.0625rem] leading-[1.6] tracking-[-0.008em] text-[var(--color-ink-2)]">
            Every plan includes the live queue, your customer page and your own QR
            code. No card required to start.
          </p>
        </Section>

        <Section className="pb-14">
          <PlanGrid showPro />
        </Section>

        {/* ──────────────────────────────────────── comparison */}
        <Section className="py-12">
          <h2 className="t-h1 text-[var(--color-ink)]">Every plan, side by side</h2>

          <div className="mt-8 -mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[40rem] border-collapse text-left">
              <caption className="sr-only">Feature comparison across plans</caption>
              <thead>
                <tr>
                  <th scope="col" className="pb-4 t-label font-medium text-[var(--color-ink-3)]">
                    Feature
                  </th>
                  {plans.map((plan) => (
                    <th key={plan.tier} scope="col" className="pb-4 pl-6">
                      <span className="block t-h3 text-[var(--color-ink)]">{plan.name}</span>
                      <span className="tnum mt-0.5 block t-meta font-normal text-[var(--color-ink-3)]">
                        {planPrice(plan.price_cents)}
                        {plan.price_cents > 0 && "/mo"}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <Row
                  label="Customers per day"
                  values={plans.map((p) =>
                    p.daily_customer_limit === null ? "Unlimited" : String(p.daily_customer_limit),
                  )}
                />
                <Row
                  label="Services"
                  values={plans.map((p) =>
                    p.max_services === null ? "Unlimited" : String(p.max_services),
                  )}
                />
                <Row label="Locations" values={plans.map((p) => String(p.max_locations))} />
                <Row
                  label="Staff accounts"
                  values={plans.map((p) =>
                    p.max_staff === null ? "Unlimited" : String(p.max_staff),
                  )}
                />
                <Row label="SMS notifications" values={plans.map((p) => p.sms_notifications)} />
                <Row label="Advanced analytics" values={plans.map((p) => p.advanced_analytics)} />
                <Row label="Custom branding" values={plans.map((p) => p.custom_branding)} />
                <Row label="API access" values={plans.map((p) => p.api_access)} />
              </tbody>
            </table>
          </div>
        </Section>

        {/* ──────────────────────────────────────── faq */}
        <Section className="py-12">
          <h2 id="faq" className="t-h1 text-[var(--color-ink)]">
            Questions people ask
          </h2>

          <dl className="mt-8">
            {FAQ.map(([question, answer], i) => (
              <div key={question}>
                {i > 0 && <Rule />}
                <div className="grid gap-2 py-6 md:grid-cols-[minmax(0,22rem)_1fr] md:gap-10">
                  <dt className="t-body font-medium text-[var(--color-ink)]">{question}</dt>
                  <dd className="max-w-[62ch] t-body text-[var(--color-ink-2)]">{answer}</dd>
                </div>
              </div>
            ))}
          </dl>
        </Section>
      </main>

      <MarketingFooter />
    </>
  );
}

function Row({ label, values }: { label: string; values: Array<string | boolean> }) {
  return (
    <tr className="border-t border-[var(--color-line)]">
      <th scope="row" className="py-3.5 t-body-sm font-normal text-[var(--color-ink-2)]">
        {label}
      </th>
      {values.map((value, i) => (
        <td key={i} className="py-3.5 pl-6 t-body-sm text-[var(--color-ink)]">
          {typeof value === "boolean" ? (
            value ? (
              <>
                <Check className="text-[var(--color-accent)]" />
                <span className="sr-only">Included</span>
              </>
            ) : (
              <>
                <span aria-hidden="true" className="text-[var(--color-ink-3)]">
                  —
                </span>
                <span className="sr-only">Not included</span>
              </>
            )
          ) : (
            <span className="tnum">{value}</span>
          )}
        </td>
      ))}
    </tr>
  );
}
