import { requireWorkspace, getEntitlements } from "@/lib/business";
import { createClient } from "@/lib/supabase/server";
import { Page, PageHeader } from "@/components/app/page-header";
import { Check, Panel, Rule } from "@/components/ui";
import { PlanSwitcher } from "@/components/app/plan-switcher";
import { billingMode } from "@/lib/billing";
import { money, planPrice } from "@/lib/format";
import { PLAN_COPY } from "@/lib/plans";
import type { Plan } from "@/lib/types";

export const metadata = { title: "Plan & billing" };

const fullDate = new Intl.DateTimeFormat("en-PH", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

export default async function BillingPage() {
  const { business, role } = await requireWorkspace();
  const supabase = await createClient();

  const [entitlements, plansRes, paymentsRes] = await Promise.all([
    getEntitlements(business.id),
    supabase.from("plans").select("*").order("sort"),
    supabase
      .from("payments")
      .select("*")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  if (!entitlements) {
    return (
      <Page>
        <PageHeader title="Plan & billing" />
        <p className="t-body text-[var(--color-ink-2)]">
          We couldn&rsquo;t load your plan just now. Please refresh the page.
        </p>
      </Page>
    );
  }

  const plan = entitlements.plan;
  const subscription = entitlements.subscription;
  const payments = paymentsRes.data ?? [];
  const renewal = subscription?.current_period_end
    ? fullDate.format(new Date(subscription.current_period_end))
    : null;

  return (
    <Page>
      <PageHeader title="Plan & billing" />

      {/* ───────────────────────────────────── the current arrangement

          Everything an owner checks when they open this page — what they're
          on, what it costs, when it renews, what it includes, and how close
          they are to the limit — before any mention of changing it. */}
      <Panel className="p-6 sm:p-8">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <div>
            <p className="t-label text-[var(--color-ink-3)]">Current plan</p>
            <h2 className="mt-1.5 text-[1.75rem] font-semibold tracking-[-0.03em] text-[var(--color-ink)]">
              {plan.name}
            </h2>
          </div>
          <p className="t-body text-[var(--color-ink-2)]">
            {planPrice(plan.price_cents)}
            {plan.price_cents > 0 && " a month"}
          </p>
        </div>

        {(renewal || plan.daily_customer_limit !== null) && (
          <>
            <Rule className="my-6" />
            <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
              {renewal && plan.price_cents > 0 && (
                <div>
                  <dt className="t-label text-[var(--color-ink-3)]">
                    {subscription?.cancel_at_period_end ? "Access ends" : "Renews on"}
                  </dt>
                  <dd className="mt-1 t-body text-[var(--color-ink)]">{renewal}</dd>
                </div>
              )}
              {plan.daily_customer_limit !== null && (
                <div>
                  <dt className="t-label text-[var(--color-ink-3)]">Customers today</dt>
                  <dd className="mt-1 tnum t-body text-[var(--color-ink)]">
                    {entitlements.usage_today} of {plan.daily_customer_limit}
                  </dd>
                </div>
              )}
            </dl>
          </>
        )}

        <Rule className="my-6" />

        <p className="t-label text-[var(--color-ink-3)]">Included</p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {PLAN_COPY[plan.tier].features.map((feature) => (
            <li key={feature} className="flex gap-2.5 t-body-sm text-[var(--color-ink-2)]">
              <Check className="mt-1 text-[var(--color-accent)]" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </Panel>

      {/* ───────────────────────────────────── change plan */}
      <section className="mt-14">
        <h2 className="t-h2 text-[var(--color-ink)]">Change plan</h2>
        <p className="mt-1.5 max-w-[56ch] t-body-sm text-[var(--color-ink-2)]">
          {billingMode() === "paymongo"
            ? "Pay with GCash, Maya, GrabPay or a card. Change or cancel whenever you like — a cancellation runs to the end of the period you've paid for."
            : "No payment provider is configured on this server, so plan changes apply immediately without a checkout."}
        </p>

        <div className="mt-6">
          <PlanSwitcher
            plans={(plansRes.data ?? []) as Plan[]}
            entitlements={entitlements}
            isOwner={role === "owner"}
          />
        </div>
      </section>

      {/* ───────────────────────────────────── receipts */}
      {payments.length > 0 && (
        <section className="mt-14">
          <h2 className="t-h2 text-[var(--color-ink)]">Payments</h2>
          <ul className="mt-4">
            {payments.map((payment, i) => (
              <li key={payment.id}>
                {i > 0 && <Rule />}
                <div className="flex items-center justify-between gap-4 py-4">
                  <div className="min-w-0">
                    <p className="truncate t-body text-[var(--color-ink)]">
                      {payment.description ?? "Subscription"}
                    </p>
                    <p className="mt-0.5 t-body-sm text-[var(--color-ink-3)]">
                      {fullDate.format(new Date(payment.created_at))}
                    </p>
                  </div>
                  <span className="tnum shrink-0 t-body text-[var(--color-ink-2)]">
                    {money(payment.amount_cents)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Page>
  );
}
