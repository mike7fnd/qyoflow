import { requireWorkspace } from "@/lib/business";
import { Page, PageHeader } from "@/components/app/page-header";
import { SettingsForm } from "@/components/app/settings-form";
import { SITE_URL } from "@/lib/format";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { business, location } = await requireWorkspace();

  return (
    <Page width="narrow">
      <PageHeader title="Settings" />

      <SettingsForm
        initial={{
          name: business.name,
          tagline: business.tagline ?? "",
          locationName: location.name,
          address: location.address ?? "",
          timezone: location.timezone,
        }}
      />

      <section className="mt-12">
        <h2 className="t-h3 text-[var(--color-ink)]">Your queue address</h2>
        <p className="mt-2 t-body text-[var(--color-ink)]">
          {SITE_URL.replace(/^https?:\/\//, "")}/q/{business.slug}
        </p>
        <p className="mt-2 max-w-[54ch] t-body-sm text-[var(--color-ink-3)]">
          Fixed, because it&rsquo;s printed on every QR code you&rsquo;ve already put
          up. Get in touch if you need a different one.
        </p>
      </section>
    </Page>
  );
}
