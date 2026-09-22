"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspace } from "@/lib/business";
import { billingMode, createCheckout } from "@/lib/billing";
import { applyPlan, markCancelAtPeriodEnd } from "@/lib/subscription";
import type { Plan, PlanTier } from "@/lib/types";

const tierSchema = z.enum(["free", "starter", "business", "pro"]);

export type UpgradeResult =
  | { ok: true; checkoutUrl: string | null; tier: PlanTier }
  | { ok: false; error: string };

/**
 * Starts an upgrade.
 *
 * With a payment provider configured, this only hands back a checkout URL — the
 * plan moves when the provider's webhook confirms the payment. The redirect back
 * from checkout is never treated as proof of anything.
 */
export async function startUpgrade(tier: unknown): Promise<UpgradeResult> {
  const parsed = tierSchema.safeParse(tier);
  if (!parsed.success) return { ok: false, error: "Unknown plan." };

  const { business, role, email } = await requireWorkspace();
  if (role !== "owner") {
    return { ok: false, error: "Only the account owner can change the plan." };
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("plans")
    .select("*")
    .eq("tier", parsed.data)
    .maybeSingle();

  if (!data) return { ok: false, error: "That plan isn't available." };
  const plan = data as Plan;

  if (billingMode() === "paymongo" && plan.price_cents > 0) {
    try {
      const url = await createCheckout({
        businessId: business.id,
        tier: plan.tier,
        planName: plan.name,
        amountCents: plan.price_cents,
        email,
      });
      if (url) return { ok: true, checkoutUrl: url, tier: plan.tier };
    } catch (error) {
      return {
        ok: false,
        error:
          error instanceof Error
            ? `Couldn't start checkout: ${error.message}`
            : "Couldn't start checkout.",
      };
    }
  }

  // Manual mode: no provider configured, so the change is recorded directly.
  try {
    await applyPlan({
      businessId: business.id,
      tier: plan.tier,
      provider: "manual",
      providerRef: null,
      amountCents: plan.price_cents,
    });
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error && error.message.includes("SERVICE_ROLE")
          ? "Billing isn't configured on this server yet."
          : "Couldn't change your plan. Please try again.",
    };
  }

  revalidatePath("/billing");
  revalidatePath("/dashboard");
  return { ok: true, checkoutUrl: null, tier: plan.tier };
}

export async function cancelSubscription(): Promise<{ ok: boolean; error?: string }> {
  const { business, role } = await requireWorkspace();
  if (role !== "owner") return { ok: false, error: "Only the account owner can do that." };

  try {
    await markCancelAtPeriodEnd(business.id);
  } catch {
    return { ok: false, error: "Couldn't update your subscription." };
  }

  revalidatePath("/billing");
  return { ok: true };
}
