import { createAdminClient } from "@/lib/supabase/server";
import type { PlanTier } from "@/lib/types";

/**
 * The single place a plan actually changes.
 *
 * Deliberately NOT a server action: if this were exported from a "use server"
 * module it would be callable from any browser with any arguments, which is
 * exactly the "set subscription=pro in DevTools" attack. It runs with the service
 * role instead, and only ever from trusted server paths — the owner-verified
 * upgrade action, and the billing webhook after a payment settles.
 */
export async function applyPlan(opts: {
  businessId: string;
  tier: PlanTier;
  provider: string;
  providerRef: string | null;
  amountCents: number;
}) {
  const supabase = createAdminClient();
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const { error: bizError } = await supabase
    .from("businesses")
    .update({ plan: opts.tier })
    .eq("id", opts.businessId);
  if (bizError) throw new Error(bizError.message);

  const { error: subError } = await supabase.from("subscriptions").upsert(
    {
      business_id: opts.businessId,
      tier: opts.tier,
      status: "active",
      provider: opts.provider,
      provider_ref: opts.providerRef,
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      cancel_at_period_end: false,
      updated_at: now.toISOString(),
    },
    { onConflict: "business_id" },
  );
  if (subError) throw new Error(subError.message);

  if (opts.amountCents > 0) {
    await supabase.from("payments").insert({
      business_id: opts.businessId,
      amount_cents: opts.amountCents,
      currency: "PHP",
      status: "paid",
      provider: opts.provider,
      provider_ref: opts.providerRef,
      description: `QyoFlow ${opts.tier} — monthly`,
    });
  }

  await supabase.from("audit_logs").insert({
    business_id: opts.businessId,
    action: "billing.plan_changed",
    target: opts.tier,
    meta: { provider: opts.provider, provider_ref: opts.providerRef },
  });
}

export async function markCancelAtPeriodEnd(businessId: string) {
  const supabase = createAdminClient();
  await supabase
    .from("subscriptions")
    .update({ cancel_at_period_end: true, updated_at: new Date().toISOString() })
    .eq("business_id", businessId);
}
