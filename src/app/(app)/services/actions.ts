"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspace, getEntitlements } from "@/lib/business";
import { friendlyError } from "@/lib/format";

const serviceInput = z.object({
  name: z.string().trim().min(1, "Give the service a name.").max(60),
  price_cents: z.number().int().min(0).max(10_000_000),
  duration_min: z.number().int().min(1).max(480),
});

export type Result = { ok: true } | { ok: false; error: string };

export async function createService(input: unknown): Promise<Result> {
  const parsed = serviceInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { business, location } = await requireWorkspace();
  const supabase = await createClient();

  // Service count is a plan entitlement, so it is checked against the plans table
  // rather than anything the form sent.
  const entitlements = await getEntitlements(business.id);
  const max = entitlements?.plan.max_services ?? null;
  if (max != null) {
    const { count } = await supabase
      .from("services")
      .select("id", { count: "exact", head: true })
      .eq("location_id", location.id)
      .eq("active", true);
    if ((count ?? 0) >= max) {
      return {
        ok: false,
        error: `Your plan includes ${max} services. Upgrade to add more.`,
      };
    }
  }

  const { count: positionBase } = await supabase
    .from("services")
    .select("id", { count: "exact", head: true })
    .eq("location_id", location.id);

  const { error } = await supabase.from("services").insert({
    location_id: location.id,
    name: parsed.data.name,
    price_cents: parsed.data.price_cents,
    duration_min: parsed.data.duration_min,
    position: positionBase ?? 0,
  });

  if (error) return { ok: false, error: friendlyError(error.message) };
  revalidatePath("/services");
  return { ok: true };
}

export async function updateService(id: string, input: unknown): Promise<Result> {
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Unknown service." };
  const parsed = serviceInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const supabase = await createClient();
  // RLS restricts this to services under a location the caller manages.
  const { error } = await supabase.from("services").update(parsed.data).eq("id", id);
  if (error) return { ok: false, error: friendlyError(error.message) };

  revalidatePath("/services");
  return { ok: true };
}

/** Services are retired, not deleted — past queue entries still point at them. */
export async function setServiceActive(id: string, active: boolean): Promise<Result> {
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Unknown service." };

  const supabase = await createClient();
  const { error } = await supabase.from("services").update({ active }).eq("id", id);
  if (error) return { ok: false, error: friendlyError(error.message) };

  revalidatePath("/services");
  return { ok: true };
}
