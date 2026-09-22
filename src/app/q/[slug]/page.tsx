import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { JoinFlow } from "@/components/customer/join-flow";
import { Mark } from "@/components/marketing/chrome";
import { duration } from "@/lib/format";
import type { BusinessPage } from "@/lib/types";

export const dynamic = "force-dynamic";

async function load(slug: string): Promise<BusinessPage | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("qf_business_page", { p_slug: slug });
  return (data as BusinessPage) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await load(slug);
  if (!page) return { title: "Queue not found" };
  return {
    title: `${page.business.name} — join the queue`,
    description:
      page.business.tagline ??
      `Get your place in line at ${page.business.name} without standing in it.`,
  };
}

export default async function PublicBusinessPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await load(slug);
  if (!page) notFound();

  const open = page.location.is_open && page.queue.is_open;

  return (
    <div className="flex min-h-dvh flex-col">
      <main className="mx-auto w-full max-w-[26rem] flex-1 px-5 pb-16 pt-12 sm:pt-16">
        <header className="text-center">
          <h1 className="t-h1 text-[var(--color-ink)]">{page.business.name}</h1>
          {page.business.tagline && (
            <p className="mt-1.5 t-body text-[var(--color-ink-2)]">{page.business.tagline}</p>
          )}

          <p className="mt-4 inline-flex items-center gap-2 t-body-sm text-[var(--color-ink-2)]">
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full"
              style={{
                background: open ? "var(--color-success-dot)" : "var(--color-ink-3)",
              }}
            />
            {open
              ? page.queue.waiting === 0
                ? "Open · no wait"
                : `Open · about ${duration(page.queue.eta_minutes)} wait`
              : "Closed"}
          </p>
        </header>

        <div className="mt-10">
          <JoinFlow page={page} />
        </div>

        {page.location.address && (
          <p className="mt-14 text-center t-body-sm text-[var(--color-ink-3)]">
            {page.location.address}
          </p>
        )}
      </main>

      <footer className="pb-8 text-center">
        <span className="inline-flex items-center gap-1.5 opacity-45">
          <Mark size={12} />
          <span className="t-meta text-[var(--color-ink-3)]">QyoFlow</span>
        </span>
      </footer>
    </div>
  );
}
