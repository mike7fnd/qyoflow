import { requireWorkspace } from "@/lib/business";
import { createClient } from "@/lib/supabase/server";
import { QueueBoard } from "@/components/app/queue-board";
import { Page, PageHeader } from "@/components/app/page-header";
import { QueueOpenToggle } from "@/components/app/queue-open-toggle";
import { QueueViewSwitch } from "@/components/app/queue-view-switch";
import { logDbError } from "@/lib/log";
import type { LiveQueue } from "@/lib/types";

export const metadata = { title: "Queue" };

export default async function QueuePage() {
  const { business, location } = await requireWorkspace();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("qf_live_queue", {
    p_location_id: location.id,
  });
  if (error) logDbError("queue page: qf_live_queue failed", error);

  const live = (data as LiveQueue) ?? null;

  return (
    <Page>
      <PageHeader
        title="Queue"
        subtitle={location.name}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <QueueViewSwitch current="/queue" />
            <QueueOpenToggle
              locationId={location.id}
              initialOpen={live?.queue?.is_open ?? location.is_open}
            />
          </div>
        }
      />
      <QueueBoard
        locationId={location.id}
        slug={business.slug}
        initial={live}
        initialError={error ? "We couldn't load the queue." : null}
        timezone={location.timezone}
      />
    </Page>
  );
}
