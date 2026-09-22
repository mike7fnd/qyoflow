import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Business, Entitlements, Location, MemberRole } from "@/lib/types";

export interface Workspace {
  userId: string;
  email: string;
  business: Business;
  location: Location;
  locations: Location[];
  role: MemberRole;
}

/**
 * The signed-in user's business context. Deduped per request, and it re-reads
 * membership from the database every time rather than trusting anything the
 * client sent.
 */
export const getWorkspace = cache(async (): Promise<Workspace | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Owned business first; otherwise the one they're a staff member of.
  const { data: owned } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at")
    .limit(1)
    .maybeSingle();

  let business = owned as Business | null;
  let role: MemberRole = "owner";

  if (!business) {
    const { data: membership } = await supabase
      .from("business_members")
      .select("role, business_id")
      .eq("user_id", user.id)
      .order("created_at")
      .limit(1)
      .maybeSingle();

    if (!membership) return null;

    const { data: biz } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", membership.business_id)
      .maybeSingle();

    if (!biz) return null;
    business = biz as Business;
    role = membership.role as MemberRole;
  }

  const { data: locations } = await supabase
    .from("locations")
    .select("*")
    .eq("business_id", business.id)
    .order("position");

  const list = (locations ?? []) as Location[];
  if (!list.length) return null;

  return {
    userId: user.id,
    email: user.email ?? "",
    business,
    location: list[0],
    locations: list,
    role,
  };
});

/** Use in any page that cannot render without a business. */
export async function requireWorkspace(): Promise<Workspace> {
  const workspace = await getWorkspace();
  if (!workspace) redirect("/onboarding");
  return workspace;
}

export async function getEntitlements(businessId: string): Promise<Entitlements | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("qf_entitlements", { p_business_id: businessId });
  return (data as Entitlements) ?? null;
}
