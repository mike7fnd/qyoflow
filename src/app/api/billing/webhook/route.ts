import { NextResponse } from "next/server";
import { verifyWebhook } from "@/lib/billing";
import { applyPlan } from "@/lib/subscription";
import type { PlanTier } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIERS: PlanTier[] = ["free", "starter", "business", "pro"];

/**
 * Payment provider webhook — the only thing that moves a business onto a paid plan.
 *
 * The body is read raw so the signature covers exactly what was sent. An
 * unverified request gets 401 and changes nothing; the plan and amount are read
 * from the provider's payload, never from a client.
 */
export async function POST(request: Request) {
  const raw = await request.text();

  const signature =
    request.headers.get("paymongo-signature") ?? request.headers.get("Paymongo-Signature");

  if (!(await verifyWebhook(raw, signature))) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let event: {
    data?: {
      attributes?: {
        type?: string;
        data?: { attributes?: { metadata?: Record<string, string>; amount?: number } };
      };
      id?: string;
    };
  };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const type = event.data?.attributes?.type;
  const inner = event.data?.attributes?.data?.attributes;
  const metadata = inner?.metadata ?? {};

  // Anything that isn't a settled payment is acknowledged and ignored, so the
  // provider stops retrying it.
  const settled = type === "payment.paid" || type === "checkout_session.payment.paid";
  if (!settled) return NextResponse.json({ received: true });

  const businessId = metadata.business_id;
  const tier = metadata.tier as PlanTier | undefined;

  if (!businessId || !tier || !TIERS.includes(tier)) {
    return NextResponse.json({ received: true, skipped: "missing metadata" });
  }

  try {
    await applyPlan({
      businessId,
      tier,
      provider: "paymongo",
      providerRef: event.data?.id ?? null,
      amountCents: inner?.amount ?? 0,
    });
  } catch (error) {
    // A 500 tells the provider to retry, which is what we want if our database
    // was briefly unavailable.
    console.error("billing webhook failed", error);
    return NextResponse.json({ error: "could not apply plan" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
