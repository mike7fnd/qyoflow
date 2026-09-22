import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logDbError } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Liveness plus real dependency checks, for an uptime monitor.
 *
 * It also catches a half-applied migration set, which is otherwise invisible
 * until a member of staff opens the queue and sees a screen that can't load.
 * The response body stays coarse on purpose — "which migration is missing" is
 * a hint worth giving an operator in the logs, not a public endpoint.
 */
export async function GET() {
  const startedAt = Date.now();
  const failures: string[] = [];

  try {
    const supabase = await createClient();

    // 1. Base schema (0001) and connectivity.
    const { error: plansError } = await supabase.from("plans").select("tier").limit(1);
    if (plansError) {
      logDbError("health: plans unreadable", plansError);
      return NextResponse.json(
        { status: "degraded", database: "unreachable", ms: Date.now() - startedAt },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }

    // 2. Shared rate limiting (0005). Harmless to call — it counts a bucket
    //    nothing else uses.
    const { error: rateError } = await supabase.rpc("qf_rate_limit", {
      p_bucket: "health-check",
      p_limit: 1_000_000,
      p_window_seconds: 60,
    });
    if (rateError) {
      logDbError("health: qf_rate_limit unavailable (0005_rate_limit.sql)", rateError);
      failures.push("rate-limit");
    }

    // 3. Function grants (0004). After that migration anon must NOT be able to
    //    execute a staff function; reaching its own guard means the revoke
    //    never ran, and the queue functions are likely stale too.
    const { error: callError } = await supabase.rpc("qf_call_next", {
      p_location_id: "00000000-0000-0000-0000-000000000000",
    });
    const reachedGuard = callError?.code === "P0001";
    if (reachedGuard) {
      logDbError(
        "health: anon can execute qf_call_next — 0004_fixes.sql has not been applied",
        callError,
      );
      failures.push("function-grants");
    }

    if (failures.length) {
      return NextResponse.json(
        { status: "degraded", database: "ok", migrations: "incomplete", ms: Date.now() - startedAt },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      { status: "ok", database: "ok", migrations: "ok", ms: Date.now() - startedAt },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    logDbError("health: unexpected failure", error);
    return NextResponse.json(
      { status: "error", ms: Date.now() - startedAt },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
