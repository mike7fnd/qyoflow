import type { PlanTier } from "./types";
import { SITE_URL } from "./format";

/**
 * Billing sits behind one small interface so the rest of the product never knows
 * who takes the money.
 *
 * Two modes:
 *   manual   — no keys configured. Upgrades are recorded directly, which is what
 *              you want in development and for businesses you invoice offline.
 *   paymongo — GCash, GrabPay, Maya and cards, priced in PHP.
 *
 * NOTE: the PayMongo calls below are written against its Checkout Sessions API but
 * have not been exercised against a live account in this repository. Verify the
 * request shape and the webhook signature scheme against current PayMongo docs
 * before taking real payments.
 */

const PAYMONGO_API = "https://api.paymongo.com/v1";

export type BillingMode = "manual" | "paymongo";

export function billingMode(): BillingMode {
  return process.env.PAYMONGO_SECRET_KEY ? "paymongo" : "manual";
}

function authHeader() {
  const key = process.env.PAYMONGO_SECRET_KEY;
  if (!key) throw new Error("PAYMONGO_SECRET_KEY is not set");
  // PayMongo uses HTTP Basic with the secret key as the username and no password.
  return `Basic ${Buffer.from(`${key}:`).toString("base64")}`;
}

export interface CheckoutRequest {
  businessId: string;
  tier: PlanTier;
  planName: string;
  amountCents: number;
  email?: string;
}

/** Returns a URL to send the owner to, or null when running in manual mode. */
export async function createCheckout(req: CheckoutRequest): Promise<string | null> {
  if (billingMode() === "manual") return null;

  const response = await fetch(`${PAYMONGO_API}/checkout_sessions`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: {
        attributes: {
          line_items: [
            {
              currency: "PHP",
              amount: req.amountCents,
              name: `QyoFlow ${req.planName}`,
              quantity: 1,
            },
          ],
          payment_method_types: ["gcash", "card", "paymaya", "grab_pay"],
          description: `QyoFlow ${req.planName} — monthly`,
          success_url: `${SITE_URL}/billing?upgraded=${req.tier}`,
          cancel_url: `${SITE_URL}/billing?cancelled=1`,
          // Carried back to us on the webhook so we know which business paid.
          metadata: { business_id: req.businessId, tier: req.tier },
          ...(req.email ? { billing: { email: req.email } } : {}),
        },
      },
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`PayMongo checkout failed (${response.status}): ${detail.slice(0, 300)}`);
  }

  const payload = (await response.json()) as {
    data?: { attributes?: { checkout_url?: string } };
  };
  const url = payload.data?.attributes?.checkout_url;
  if (!url) throw new Error("PayMongo did not return a checkout URL");
  return url;
}

/**
 * Verifies a PayMongo webhook signature.
 *
 * The header looks like `t=<timestamp>,te=<test sig>,li=<live sig>`, and the signed
 * payload is `<timestamp>.<raw body>`. We compare in constant time and reject
 * anything older than the tolerance so a captured request can't be replayed.
 */
export async function verifyWebhook(
  rawBody: string,
  signatureHeader: string | null,
  toleranceSeconds = 300,
): Promise<boolean> {
  const secret = process.env.PAYMONGO_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((piece) => {
      const [k, v] = piece.split("=");
      return [k?.trim(), v?.trim()];
    }),
  ) as Record<string, string | undefined>;

  const timestamp = parts.t;
  const provided = parts.li || parts.te;
  if (!timestamp || !provided) return false;

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > toleranceSeconds) return false;

  const crypto = await import("node:crypto");
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(provided, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
