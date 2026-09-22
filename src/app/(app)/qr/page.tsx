import { requireWorkspace } from "@/lib/business";
import { Page, PageHeader } from "@/components/app/page-header";
import { QrPoster } from "@/components/qr-poster";
import { Rule } from "@/components/ui";
import { SITE_URL } from "@/lib/format";

export const metadata = { title: "QR code" };

export default async function QrPage() {
  const { business } = await requireWorkspace();
  const url = `${SITE_URL}/q/${business.slug}`;

  return (
    <Page width="narrow">
      <div className="no-print">
        <PageHeader
          title="Your QR code"
          subtitle="This code never changes. Print it once and leave it up."
        />
      </div>

      <QrPoster slug={business.slug} businessName={business.name} url={url} />

      <section className="no-print mt-14">
        <Rule />
        <h2 className="mt-8 t-h3 text-[var(--color-ink)]">Where to put it</h2>
        <ul className="mt-4 space-y-3">
          {[
            "By the door at eye level, where the line would otherwise start.",
            "At the counter, so staff can point at it instead of explaining.",
            "The link works without the code too — put it on your Facebook page, your receipts or a poster.",
          ].map((item) => (
            <li key={item} className="flex gap-3 t-body text-[var(--color-ink-2)]">
              <span
                aria-hidden="true"
                className="mt-[0.6rem] size-1 shrink-0 rounded-full bg-[var(--color-ink-3)]"
              />
              {item}
            </li>
          ))}
        </ul>
      </section>
    </Page>
  );
}
