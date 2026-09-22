import { assertEnv, billingConfigured, isDeployed } from "@/lib/env";

/**
 * Runs once when the server boots. Configuration problems surface here, at
 * deploy time, instead of as a broken page for whoever arrives first.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  assertEnv();

  if (isDeployed() && !billingConfigured()) {
    console.warn(
      "[qyoflow] No payment provider configured — plan changes are applied " +
        "directly without a checkout. Set PAYMONGO_SECRET_KEY and " +
        "PAYMONGO_WEBHOOK_SECRET to take payments.",
    );
  }
}
