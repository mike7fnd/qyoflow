"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient, createClient, hasServiceRole } from "@/lib/supabase/server";
import { clientKey, hit } from "@/lib/rate-limit";

const credentials = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(8, "Use at least 8 characters."),
  name: z.string().trim().max(80).optional(),
  next: z.string().optional(),
});

export type AuthState = { error?: string } | undefined;

/** Only same-origin paths are honoured, so ?next= can't bounce anyone off-site. */
function safeNext(next: string | undefined) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/dashboard";
  return next;
}

function alreadyRegistered(message: string) {
  const m = message.toLowerCase();
  return m.includes("already") || m.includes("duplicate") || m.includes("exists");
}

/**
 * Turns a provider error into something a person can act on. Nobody signing up
 * for a queue app should ever read the words "rate limit exceeded".
 */
function humanAuthError(message: string) {
  const m = message.toLowerCase();
  if (alreadyRegistered(m)) return "That email already has an account. Try signing in.";
  if (m.includes("rate limit") || m.includes("too many")) {
    return "Too many attempts just now. Please wait a minute and try again.";
  }
  if (m.includes("password")) return "Use a password of at least 8 characters.";
  if (m.includes("email") && m.includes("invalid")) return "Enter a valid email address.";
  return "We couldn't create your account. Please try again.";
}

/**
 * Creates the owner's account and signs them straight in.
 *
 * The account is created with the service role and marked confirmed, so Supabase
 * never sends a confirmation email. That matters: the built-in SMTP allows only a
 * handful of messages an hour, and once it is spent every subsequent sign-up dies
 * with "Email rate limit exceeded" — which is what a new customer would see.
 *
 * The trade-off is that an address isn't proven to belong to whoever typed it.
 * For a queue owner that is acceptable — the email is a login, not a channel we
 * send anything to — but if you later email receipts or password resets, verify
 * at that point. To go back to Supabase's own flow instead, unset
 * SUPABASE_SERVICE_ROLE_KEY and turn "Confirm email" on; the fallback below takes
 * over.
 */
export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentials.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your details." };
  }
  const { email, password, name } = parsed.data;

  // Creating users with the service role skips Supabase's own throttling, so the
  // throttle has to live here instead.
  if (!hit(await clientKey("signup"), 5, 15 * 60_000)) {
    return { error: "Too many sign-ups from this device. Please try again shortly." };
  }

  const supabase = await createClient();

  if (hasServiceRole()) {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name || null },
    });

    if (error) return { error: humanAuthError(error.message) };

    // Establish the session as the new user, through the normal cookie client.
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) {
      return { error: "Your account was created, but we couldn't sign you in. Try signing in." };
    }
  } else {
    // No service key configured: fall back to Supabase's own sign-up, which may
    // send a confirmation email and is subject to its email quota.
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name || null } },
    });
    if (error) return { error: humanAuthError(error.message) };
  }

  revalidatePath("/", "layout");
  redirect("/onboarding");
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentials.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your details." };
  }

  // Slows down password guessing without getting in a real person's way.
  if (!hit(await clientKey("signin"), 10, 5 * 60_000)) {
    return { error: "Too many attempts. Please wait a minute and try again." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    // Deliberately the same message for a wrong password and an unknown
    // address, so the form can't be used to discover who has an account.
    return { error: "That email and password don't match." };
  }

  revalidatePath("/", "layout");
  redirect(safeNext(parsed.data.next));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
