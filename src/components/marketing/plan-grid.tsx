import { createClient } from "@/lib/supabase/server";
import { FALLBACK_PLANS, PLAN_COPY } from "@/lib/plans";
import { planPrice } from "@/lib/format";
import type { Plan } from "@/lib/types";
import { Check, LinkButton, cx } from "@/components/ui";

/** Prices come from the same table the server enforces limits against. */
export async function loadPlans(): Promise<Plan[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("plans").select("*").order("sort");
    if (data?.length) return data as Plan[];
  } catch {
    // Database not reachable — the marketing site still has to render.
  }
  return FALLBACK_PLANS;
}

/**
 * A plan is a genuine independent object you choose between, so it gets a
 * surface. Only the recommended one is raised; the rest sit flat so the page
 * doesn't read as a row of equally shouty boxes.
 */
export async function PlanGrid({ showPro = false }: { showPro?: boolean }) {
  const all = await loadPlans();
  const plans = showPro ? all : all.filter((p) => p.tier !== "pro");

  return (
    <div className={cx("grid gap-4", showPro ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3")}>
      {plans.map((plan) => {
        const copy = PLAN_COPY[plan.tier];
        const featured = copy.highlight;

        return (
          <div
            key={plan.tier}
            className={cx(
              "flex flex-col rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6",
              featured ? "shadow-[var(--shadow-2)]" : "shadow-[var(--shadow-1)]",
            )}
          >
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="t-h3 text-[var(--color-ink)]">{plan.name}</h3>
              {featured && (
                <span className="t-meta text-[var(--color-accent)]">Recommended</span>
              )}
            </div>

            <p className="mt-4 flex items-baseline gap-1">
              <span className="tnum text-[1.75rem] font-semibold tracking-[-0.03em] text-[var(--color-ink)]">
                {planPrice(plan.price_cents)}
              </span>
              {plan.price_cents > 0 && (
                <span className="t-body-sm text-[var(--color-ink-3)]">/month</span>
              )}
            </p>
            <p className="mt-1 t-body-sm text-[var(--color-ink-2)]">{plan.blurb}</p>

            <ul className="mt-6 flex-1 space-y-2.5">
              {copy.features.map((feature) => (
                <li key={feature} className="flex gap-2.5 t-body-sm text-[var(--color-ink-2)]">
                  <Check className="mt-1 text-[var(--color-accent)]" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <LinkButton
              href={plan.tier === "pro" ? "mailto:hello@qyoflow.com" : "/signup"}
              variant={featured ? "primary" : "secondary"}
              className="mt-7 w-full"
            >
              {copy.cta}
            </LinkButton>
          </div>
        );
      })}
    </div>
  );
}
