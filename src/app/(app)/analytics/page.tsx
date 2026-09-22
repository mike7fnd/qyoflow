import { requireWorkspace, getEntitlements } from "@/lib/business";
import { createClient } from "@/lib/supabase/server";
import { Page, PageHeader } from "@/components/app/page-header";
import { Empty, LinkButton, Panel, Rule } from "@/components/ui";
import { HourChart } from "@/components/app/hour-chart";
import { duration, hourLabel } from "@/lib/format";
import type { Analytics } from "@/lib/types";

export const metadata = { title: "Analytics" };

export default async function AnalyticsPage() {
  const { business } = await requireWorkspace();
  const supabase = await createClient();

  const entitlements = await getEntitlements(business.id);
  const days = entitlements?.plan.advanced_analytics ? 30 : 7;

  const { data } = await supabase.rpc("qf_analytics", {
    p_business_id: business.id,
    p_days: days,
  });
  const stats = (data as Analytics) ?? null;

  if (!stats || stats.totals.joined === 0) {
    return (
      <Page>
        <PageHeader title="Analytics" />
        <Panel>
          <Empty
            title="Nothing to show yet"
            body="Once people start joining your queue, you'll see how busy each hour is and how long they actually wait."
            action={
              <LinkButton href="/qr" variant="secondary">
                Get your QR code
              </LinkButton>
            }
          />
        </Panel>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader title="Analytics" subtitle={`Last ${days} days`} />

      {/* Today's headline, then the shape of the day beneath it. */}
      <section aria-label="Today">
        <p className="t-label text-[var(--color-ink-3)]">Served today</p>
        <p className="t-num mt-2.5 text-[clamp(3.5rem,10vw,4.5rem)] text-[var(--color-ink)]">
          {stats.today.served}
        </p>
        {stats.today.joined > stats.today.served && (
          <p className="mt-2 t-body-sm text-[var(--color-ink-2)]">
            {stats.today.joined} joined · {stats.today.left} left ·{" "}
            {stats.today.no_show} didn&rsquo;t show
          </p>
        )}
      </section>

      <section className="mt-12" aria-label="When people joined today">
        <h2 className="t-h3 text-[var(--color-ink)]">When people joined today</h2>
        <div className="mt-5">
          <HourChart data={stats.by_hour} />
        </div>
      </section>

      {/* Three answers, on a shared rule rather than in three boxes. */}
      <section className="mt-12" aria-label="Averages">
        <Rule />
        <dl className="grid grid-cols-1 divide-y divide-[var(--color-line)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <Figure
            value={duration(stats.avg_wait_min)}
            label="Average wait"
            detail="Joining to being called"
          />
          <Figure
            value={duration(stats.avg_service_min)}
            label="Average service"
            detail="Being called to done"
          />
          <Figure
            value={stats.peak_hour !== null ? hourLabel(stats.peak_hour) : "—"}
            label="Busiest hour"
            detail={`Across ${days} days`}
          />
        </dl>
        <Rule />
      </section>

      {stats.by_service.length > 0 && (
        <section className="mt-12" aria-label="Most requested services">
          <h2 className="t-h3 text-[var(--color-ink)]">Most requested</h2>
          <ul className="mt-4">
            {stats.by_service.slice(0, 6).map((row, i) => (
              <li key={row.name}>
                {i > 0 && <Rule />}
                <div className="flex items-center justify-between gap-4 py-3">
                  <span className="min-w-0 truncate t-body text-[var(--color-ink)]">
                    {row.name}
                  </span>
                  <span className="tnum shrink-0 t-body text-[var(--color-ink-2)]">
                    {row.count}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!entitlements?.plan.advanced_analytics && (
        <p className="mt-12 max-w-[52ch] t-body-sm text-[var(--color-ink-3)]">
          You&rsquo;re seeing {days} days of history.{" "}
          <a
            href="/billing"
            className="text-[var(--color-accent)] underline-offset-4 hover:underline"
          >
            Business
          </a>{" "}
          keeps 30 days, with per-service and per-staff breakdowns.
        </p>
      )}
    </Page>
  );
}

function Figure({
  value,
  label,
  detail,
}: {
  value: React.ReactNode;
  label: string;
  detail: string;
}) {
  return (
    <div className="py-5 sm:px-5 sm:first:pl-0 sm:last:pr-0">
      <dd className="tnum text-[1.5rem] font-semibold tracking-[-0.03em] text-[var(--color-ink)]">
        {value}
      </dd>
      <dt className="mt-1 t-body-sm text-[var(--color-ink-2)]">{label}</dt>
      <p className="mt-0.5 t-meta text-[var(--color-ink-3)]">{detail}</p>
    </div>
  );
}
