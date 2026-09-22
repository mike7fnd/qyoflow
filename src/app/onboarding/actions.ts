"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/format";

const serviceSchema = z.object({
  name: z.string().trim().min(1).max(60),
  price_cents: z.number().int().min(0).max(100_000_00),
  duration_min: z.number().int().min(1).max(480),
});

const setupSchema = z.object({
  name: z.string().trim().min(2, "Give your business a name.").max(80),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/, "Use letters, numbers and dashes."),
  location: z.string().trim().max(60).optional(),
  timezone: z.string().trim().max(64).optional(),
  services: z.array(serviceSchema).min(1, "Add at least one service.").max(20),
});

export type SetupResult =
  | { ok: true; slug: string }
  | { ok: false; error: string };

export async function createBusiness(input: unknown): Promise<SetupResult> {
  const parsed = setupSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check your details." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in again." };

  // One transaction in the database: business, location, membership, services.
  const { data, error } = await supabase.rpc("qf_create_business", {
    p_name: parsed.data.name,
    p_slug: parsed.data.slug,
    p_location: parsed.data.location || "Main",
    p_timezone: parsed.data.timezone || "Asia/Manila",
    p_services: parsed.data.services,
  });

  if (error) return { ok: false, error: friendlyError(error.message) };

  await supabase.from("businesses").update({ onboarded: true }).eq("id", data.business_id);

  revalidatePath("/", "layout");
  return { ok: true, slug: data.slug as string };
}

/** Live check while the owner types their web address. */
export async function checkSlug(slug: string): Promise<{ available: boolean }> {
  if (!/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(slug)) return { available: false };
  const supabase = await createClient();
  const { data } = await supabase.from("businesses").select("id").eq("slug", slug).maybeSingle();
  return { available: !data };
}
