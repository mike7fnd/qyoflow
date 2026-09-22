import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Liveness plus a real dependency check, for an uptime monitor.
 *
 * Reads the `plans` table because it is public, tiny, and present on every
 * correctly migrated database — so a 200 here means the app can actually reach
 * Postgres, not just that the process is up.
 */
export async function GET() {
  const startedAt = Date.now();

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("plans").select("tier").limit(1);

    if (error) {
      return NextResponse.json(
        { status: "degraded", database: "unreachable", ms: Date.now() - startedAt },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      { status: "ok", database: "ok", ms: Date.now() - startedAt },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { status: "error", ms: Date.now() - startedAt },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
