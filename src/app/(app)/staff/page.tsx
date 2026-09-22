import { requireWorkspace } from "@/lib/business";
import { createClient } from "@/lib/supabase/server";
import { CounterView } from "@/components/app/counter-view";
import type { LiveQueue } from "@/lib/types";

export const metadata = { title: "Counter" };

export default async function StaffPage() {
  const { business, location } = await requireWorkspace();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("qf_live_queue", { p_location_id: location.id });
  if (error) console.error("qf_live_queue failed", error);

  return (
    <CounterView
      locationId={location.id}
      businessName={business.name}
      initial={(data as LiveQueue) ?? null}
      initialError={error ? "We couldn't load the queue." : null}
    />
  );
}
