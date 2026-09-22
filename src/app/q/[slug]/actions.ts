"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/format";
import { allow, clientKey } from "@/lib/rate-limit";
import type { Ticket } from "@/lib/types";

const joinSchema = z.object({
  slug: z.string().trim().min(1).max(40),
  serviceId: z.string().uuid(),
  name: z.string().trim().max(60).optional(),
  // Optional on purpose: a phone number buys notifications, it does not buy a place
  // in line. Nothing here is required to queue.
  phone: z
    .string()
    .trim()
    .max(20)
    .regex(/^[0-9+()\-\s]*$/, "That doesn't look like a phone number.")
    .optional(),
});

export type JoinResult =
  | { ok: true; token: string; number: number }
  | { ok: false; error: string };

export async function joinQueue(input: unknown): Promise<JoinResult> {
  const parsed = joinSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check your details." };
  }

  // A person joins a queue a handful of times a day, not a hundred.
  if (!(await allow(await clientKey("join"), 8, 60_000))) {
    return { ok: false, error: "Too many attempts. Please wait a moment and try again." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("qf_join_queue", {
    p_slug: parsed.data.slug,
    p_service_id: parsed.data.serviceId,
    p_name: parsed.data.name || null,
    p_phone: parsed.data.phone || null,
  });

  if (error) return { ok: false, error: friendlyError(error.message) };
  return { ok: true, token: data.token as string, number: data.number as number };
}

export async function getTicket(token: string): Promise<Ticket | null> {
  if (!z.string().uuid().safeParse(token).success) return null;
  const supabase = await createClient();
  const { data } = await supabase.rpc("qf_ticket", { p_token: token });
  return (data as Ticket) ?? null;
}

export async function leaveQueue(token: string): Promise<{ ok: boolean; error?: string }> {
  if (!z.string().uuid().safeParse(token).success) {
    return { ok: false, error: "We couldn't find that ticket." };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("qf_leave_queue", { p_token: token });
  if (error) return { ok: false, error: friendlyError(error.message) };
  return { ok: true };
}
