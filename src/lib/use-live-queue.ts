"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { fetchLiveQueue } from "@/app/(app)/queue/actions";
import type { LiveQueue } from "@/lib/types";

/**
 * Keeps the staff board in sync.
 *
 * Realtime tells us *that* something changed; we then re-read the whole board
 * through the same function the page rendered from. One source of truth, no
 * client-side merge logic to drift, and the refetch is still RLS-filtered.
 *
 * A failed refresh is reported, never hidden. An empty board and an unreachable
 * board look identical otherwise, and the difference matters a great deal to
 * whoever is standing at the counter.
 */
export function useLiveQueue(
  locationId: string,
  initial: LiveQueue | null,
  initialError?: string | null,
) {
  const [data, setData] = useState<LiveQueue | null>(initial);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [syncing, setSyncing] = useState(false);
  const inflight = useRef(false);
  const queued = useRef(false);

  const refresh = useCallback(async () => {
    // Coalesce bursts: calling the next customer touches two tables and fires
    // several events within a few milliseconds.
    if (inflight.current) {
      queued.current = true;
      return;
    }
    inflight.current = true;
    setSyncing(true);
    try {
      const result = await fetchLiveQueue(locationId);
      if (result.ok) {
        setData(result.data);
        setError(null);
      } else {
        setError(result.error);
      }
    } catch {
      setError("We couldn't reach the queue.");
    } finally {
      inflight.current = false;
      setSyncing(false);
      if (queued.current) {
        queued.current = false;
        void refresh();
      }
    }
  }, [locationId]);

  useEffect(() => {
    const client = supabase();
    const channel = client
      .channel(`queue:${locationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "queue_entries",
          filter: `location_id=eq.${locationId}`,
        },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "queues", filter: `location_id=eq.${locationId}` },
        () => void refresh(),
      )
      .subscribe();

    // A tab that slept through a shift should not show a stale line.
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      void client.removeChannel(channel);
    };
  }, [locationId, refresh]);

  return { data, error, refresh, syncing, setData };
}
