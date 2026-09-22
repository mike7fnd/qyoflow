"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspace } from "@/lib/business";
import { friendlyError } from "@/lib/format";

const settingsSchema = z.object({
  name: z.string().trim().min(2, "Give your business a name.").max(80),
  tagline: z.string().trim().max(120).optional(),
  locationName: z.string().trim().min(1, "Name this location.").max(60),
  address: z.string().trim().max(200).optional(),
  timezone: z.string().trim().min(1).max(64),
});

export type Result = { ok: true } | { ok: false; error: string };

export async function updateSettings(input: unknown): Promise<Result> {
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { business, location, role } = await requireWorkspace();
  if (role === "staff") return { ok: false, error: "You don't have access to this." };

  const supabase = await createClient();

  // The slug is intentionally not editable: it is printed on QR codes that are
  // already on someone's door.
  const { error: bizError } = await supabase
    .from("businesses")
    .update({ name: parsed.data.name, tagline: parsed.data.tagline || null })
    .eq("id", business.id);
  if (bizError) return { ok: false, error: friendlyError(bizError.message) };

  const { error: locError } = await supabase
    .from("locations")
    .update({
      name: parsed.data.locationName,
      address: parsed.data.address || null,
      timezone: parsed.data.timezone,
    })
    .eq("id", location.id);
  if (locError) return { ok: false, error: friendlyError(locError.message) };

  revalidatePath("/settings");
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}
