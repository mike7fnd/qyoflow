"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { startUpgrade, cancelSubscription } from "@/app/(app)/billing/actions";
import { Button, Check, Rule, cx } from "@/components/ui";
import { toast } from "@/components/toast";
import { planPrice } from "@/lib/format";
import { PLAN_COPY, tierRank } from "@/lib/plans";
import type { Entitlements, Plan, PlanTier } from "@/lib/types";

/**
 * Changing plan reads as part of the product, not an advertisement: a list of
 * what each tier costs and includes, with the current one marked and no
 * countdown, discount or banner anywhere near it.
 */
export function PlanSwitcher({
  plans,
  entitlements,
  isOwner,
}: {
  plans: Plan[];
  entitlements: Entitlements;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<PlanTier | null>(null);

  const current = entitlements.plan.tier;
  const subscription = entitlements.subscription;

  function choose(tier: PlanTier) {
    setBusy(tier);
    startTransition(async () => {
      const result = await startUpgrade(tier);
      setBusy(null);

      if (!result.ok) {
        toast(result.error, "error");
        return;
      }
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }
      toast(`You're on ${plans.find((p) => p.tier === result.tier)?.name ?? "your new plan"}`, "success");
      router.refresh();
    });
  }

  return (
    <div>
      <ul>
        {plans.map((plan, i) => {
          const isCurrent = plan.tier === current;
          const isDowngrade = tierRank(plan.tier) < tierRank(current);

          return (
            <li key={plan.tier}>
              {i > 0 && <Rule />}
              <div
                className={cx(
                  "grid gap-x-8 gap-y-4 py-6 sm:grid-cols-[minmax(0,16rem)_1fr_auto] sm:items-start",
                  isCurrent && "sm:items-center",
                )}
              >
                <div>
                  <div className="flex items-baseline gap-2.5">
                    <h3 className="t-h3 text-[var(--color-ink)]">{plan.name}</h3>
                    {isCurrent && (
                      <span className="t-meta text-[var(--color-accent)]">Current plan</span>
                    )}
                  </div>
                  <p className="mt-1 flex items-baseline gap-1">
                    <span className="tnum text-[1.25rem] font-semibold tracking-[-0.03em] text-[var(--color-ink)]">
                      {planPrice(plan.price_cents)}
                    </span>
                    {plan.price_cents > 0 && (
                      <span className="t-body-sm text-[var(--color-ink-3)]">/month</span>
                    )}
                  </p>
                </div>

                <ul className="space-y-1.5">
                  {PLAN_COPY[plan.tier].features.map((feature) => (
                    <li
                      key={feature}
                      className="flex gap-2.5 t-body-sm text-[var(--color-ink-2)]"
                    >
                      <Check className="mt-1 text-[var(--color-ink-3)]" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="sm:pt-1">
                  {!isCurrent && (
                    <Button
                      variant={isDowngrade ? "tertiary" : "primary"}
                      disabled={!isOwner || (pending && busy !== plan.tier)}
                      loading={busy === plan.tier}
                      onClick={() => choose(plan.tier)}
                    >
                      {isDowngrade ? `Move to ${plan.name}` : `Choose ${plan.name}`}
                    </Button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {!isOwner && (
        <p className="mt-6 t-body-sm text-[var(--color-ink-3)]">
          Only the account owner can change the plan.
        </p>
      )}

      {isOwner && subscription && subscription.tier !== "free" && !subscription.cancel_at_period_end && (
        <>
          <Rule className="mt-2" />
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await cancelSubscription();
                if (!result.ok) {
                  toast(result.error ?? "We couldn't do that.", "error");
                  return;
                }
                toast("Your plan will end at the close of this billing period");
                router.refresh();
              })
            }
            className="mt-6 rounded-[var(--radius-sm)] px-2 py-1 t-body-sm text-[var(--color-ink-3)] transition-colors duration-[var(--dur-fast)] hover:text-[var(--color-ink-2)]"
          >
            Cancel subscription
          </button>
        </>
      )}
    </div>
  );
}
