import { LinkButton, Panel, cx } from "@/components/ui";
import { planPrice } from "@/lib/format";
import { FALLBACK_PLANS } from "@/lib/plans";
import type { Entitlements } from "@/lib/types";

/**
 * The only upgrade prompt in the product, and it stays quiet until the limit is
 * actually in the way.
 *
 *   plenty left  → nothing at all
 *   nearly there → one line of text and a thin meter
 *   reached      → a panel explaining what stopped and what fixes it
 *
 * No banner, no urgency, no percentage-off. A business that hits the ceiling
 * every day will upgrade because the ceiling is real, not because we shouted.
 */
export function UsageMeter({ entitlements }: { entitlements: Entitlements }) {
  const limit = entitlements.plan.daily_customer_limit;
  if (limit === null) return null;

  const used = entitlements.usage_today;
  const ratio = Math.min(used / limit, 1);

  if (entitlements.limit_reached) {
    const starter = FALLBACK_PLANS.find((p) => p.tier === "starter")!;
    return (
      <Panel className="p-6 sm:p-7">
        <p className="t-h3 text-[var(--color-ink)]">
          Today&rsquo;s limit reached — {used} customers
        </p>
        <p className="mt-1.5 max-w-[52ch] t-body-sm text-[var(--color-ink-2)]">
          Everyone already in line keeps their number. New customers can join
          again tomorrow, or straight away on Starter.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
          <LinkButton href="/billing" size="md">
            View plans
          </LinkButton>
          <span className="t-body-sm text-[var(--color-ink-3)]">
            Starter is {planPrice(starter.price_cents)} a month
          </span>
        </div>
      </Panel>
    );
  }

  // Below 60% this is noise — the owner knows roughly how busy they are.
  if (ratio < 0.6) return null;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <p className="t-body-sm text-[var(--color-ink-2)]">
          <span className="tnum">{used}</span> of {limit} customers today
        </p>
        <LinkButton href="/billing" variant="tertiary" size="sm">
          View plans
        </LinkButton>
      </div>
      <div
        role="progressbar"
        aria-valuenow={used}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-label="Daily customer limit"
        className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--color-sunken)]"
      >
        <div
          className={cx(
            "h-full rounded-full transition-[width] duration-[var(--dur-slow)] ease-[var(--ease)]",
            ratio >= 0.9 ? "bg-[var(--color-warn)]" : "bg-[var(--color-accent)]",
          )}
          style={{ width: `${Math.max(ratio * 100, 2)}%` }}
        />
      </div>
    </div>
  );
}
