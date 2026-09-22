import Link from "next/link";
import { requireWorkspace, getEntitlements } from "@/lib/business";
import { createClient } from "@/lib/supabase/server";
import { Page, PageHeader } from "@/components/app/page-header";
import { ChevronRight, LinkButton, Rule } from "@/components/ui";
import { UsageMeter } from "@/components/app/usage-meter";
import { TodayPulse } from "@/components/app/today-pulse";
import { duration, longDate } from "@/lib/format";
import type { Analytics, LiveQueue } from "@/lib/types";

export const metadata = { title: "Today" };

export default async function DashboardPage() {
  const { business, location } = await requireWorkspace();
  const supabase = await createClient();

  const [liveRes, statsRes, entitlements] = await Promise.all([
    supabase.rpc("qf_live_queue", { p_location_id: location.id }),
    supabase.rpc("qf_analytics", { p_business_id: business.id, p_days: 1 }),
    getEntitlements(business.id),
  ]);

  const live = (liveRes.data as LiveQueue) ?? null;
  const liveError = liveRes.error ? "We couldn't load the queue." : null;
  const stats = (statsRes.data as Analytics) ?? null;

  return (
    <Page>
      <PageHeader
        title={business.name}
        subtitle={longDate(new Date(), location.timezone)}
        action={<LinkButton href="/queue">Open queue</LinkButton>}
      />

      <TodayPulse locationId={location.id} initial={live} initialError={liveError} />

      {/* Today's totals. Three numbers on a shared rule — a panel each would
          make settled history compete with the live number above. */}
      <section className="mt-12" aria-label="Today so far">
        <Rule />
        {/* Stacked on a phone: three columns at 390px forces "Average wait"
            onto two lines and leaves the row ragged. */}
        <dl className="grid grid-cols-1 divide-y divide-[var(--color-line)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <Figure label="Served" value={stats?.today.served ?? 0} />
          <Figure label="Average wait" value={duration(stats?.avg_wait_min ?? null)} />
          <Figure label="No-shows" value={stats?.today.no_show ?? 0} />
        </dl>
        <Rule />
      </section>

      {entitlements && (
        <div className="mt-8">
          <UsageMeter entitlements={entitlements} />
        </div>
      )}

      <nav className="mt-12" aria-label="Shortcuts">
        {[
          { href: "/qr", title: "QR code", detail: "Download or print it for your door" },
          { href: "/services", title: "Services", detail: "Prices and how long each one takes" },
          {
            href: `/q/${business.slug}`,
            title: "Customer page",
            detail: `qyoflow.com/q/${business.slug}`,
          },
        ].map((item, i, all) => (
          <div key={item.href}>
            <Link
              href={item.href}
              className="group -mx-2 flex items-center justify-between gap-4 rounded-[var(--radius-md)] px-2 py-3.5 transition-colors duration-[var(--dur-fast)] hover:bg-[var(--color-sunken)]"
            >
              <span className="min-w-0">
                <span className="block t-body text-[var(--color-ink)]">{item.title}</span>
                <span className="mt-0.5 block truncate t-body-sm text-[var(--color-ink-3)]">
                  {item.detail}
                </span>
              </span>
              <ChevronRight className="text-[var(--color-ink-3)] transition-transform duration-[var(--dur-fast)] group-hover:translate-x-0.5" />
            </Link>
            {i < all.length - 1 && <Rule />}
          </div>
        ))}
      </nav>
    </Page>
  );
}

function Figure({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-4 sm:block sm:px-5 sm:py-5 sm:first:pl-0 sm:last:pr-0">
      <dd className="tnum order-2 text-[1.5rem] font-semibold tracking-[-0.03em] text-[var(--color-ink)] sm:order-none">
        {value}
      </dd>
      <dt className="t-body-sm text-[var(--color-ink-2)] sm:mt-1">{label}</dt>
    </div>
  );
}
