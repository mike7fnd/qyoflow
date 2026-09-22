"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/format";
import { logDbError } from "@/lib/log";
import type { EntryStatus, LiveQueue } from "@/lib/types";

const uuid = z.string().uuid();
const statusSchema = z.enum(["SERVING", "COMPLETED", "SKIPPED", "NO_SHOW", "WAITING"]);

export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: string };

/**
 * Every action here is a thin wrapper. The identifiers are validated as UUIDs and
 * then handed to a database function that re-checks membership itself — passing a
 * location you don't own just raises FORBIDDEN in Postgres.
 */

export async function callNext(locationId: string): Promise<ActionResult<{ number: number | null }>> {
  const id = uuid.safeParse(locationId);
  if (!id.success) return { ok: false, error: "Unknown location." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("qf_call_next", { p_location_id: id.data });
  if (error) return { ok: false, error: friendlyError(error.message) };

  revalidatePath("/queue");
  revalidatePath("/dashboard");
  return { ok: true, data: { number: data?.called?.number ?? null } };
}

export async function setEntryStatus(
  entryId: string,
  status: EntryStatus,
): Promise<ActionResult> {
  const id = uuid.safeParse(entryId);
  const next = statusSchema.safeParse(status);
  if (!id.success || !next.success) return { ok: false, error: "That action isn't available." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("qf_set_entry_status", {
    p_entry_id: id.data,
    p_status: next.data,
  });
  if (error) return { ok: false, error: friendlyError(error.message) };

  revalidatePath("/queue");
  revalidatePath("/dashboard");
  return { ok: true, data: null };
}

export async function setQueueOpen(
  locationId: string,
  open: boolean,
): Promise<ActionResult<{ is_open: boolean }>> {
  const id = uuid.safeParse(locationId);
  if (!id.success) return { ok: false, error: "Unknown location." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("qf_set_queue_open", {
    p_location_id: id.data,
    p_open: open,
  });
  if (error) return { ok: false, error: friendlyError(error.message) };

  revalidatePath("/queue");
  return { ok: true, data: { is_open: data.is_open as boolean } };
}

/**
 * Called after a realtime ping, to pull the authoritative board in one round trip.
 *
 * Returns the failure rather than swallowing it: a board that renders "nobody in
 * line" when the fetch actually failed would tell staff the opposite of the
 * truth, which is the worst thing this screen could do.
 */
export async function fetchLiveQueue(locationId: string): Promise<ActionResult<LiveQueue>> {
  const id = uuid.safeParse(locationId);
  if (!id.success) return { ok: false, error: "Unknown location." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("qf_live_queue", { p_location_id: id.data });

  if (error) {
    logDbError("fetchLiveQueue: qf_live_queue failed", error);
    return { ok: false, error: "We couldn't load the queue." };
  }
  return { ok: true, data: data as LiveQueue };
}
