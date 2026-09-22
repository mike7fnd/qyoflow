import { requireWorkspace } from "@/lib/business";
import { createClient } from "@/lib/supabase/server";
import { Page, PageHeader } from "@/components/app/page-header";
import { ServiceManager } from "@/components/app/service-manager";
import type { Service } from "@/lib/types";

export const metadata = { title: "Services" };

export default async function ServicesPage() {
  const { location } = await requireWorkspace();
  const supabase = await createClient();

  const { data } = await supabase
    .from("services")
    .select("*")
    .eq("location_id", location.id)
    .order("position");

  return (
    <Page width="narrow">
      <PageHeader
        title="Services"
        subtitle="What people queue for, and how long each one usually takes."
      />
      <ServiceManager services={(data ?? []) as Service[]} />
    </Page>
  );
}
