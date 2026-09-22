"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { getTicket } from "@/app/q/[slug]/actions";
import type { Ticket } from "@/lib/types";

/**
 * The customer's live ticket.
 *
 * Their phone subscribes to the queue row — which holds counts and the number
 * being served, and no personal data — then re-reads its own ticket through
 * qf_ticket(). That keeps other customers' names off this device entirely, while
 * still updating the moment the line moves.
 */
export function useTicket(token: string, initial: Ticket | null) {
  const [ticket, setTicket] = useState<Ticket | null>(initial);
  const queueId = ticket?.queue.id ?? initial?.queue.id ?? null;
  const inflight = useRef(false);

  const refresh = useCallback(async () => {
    if (inflight.current) return;
    inflight.current = true;
    try {
      const next = await getTicket(token);
      if (next) setTicket(next);
    } finally {
      inflight.current = false;
    }
  }, [token]);

  useEffect(() => {
    if (!queueId) return;
    const client = supabase();
    const channel = client
      .channel(`ticket:${token}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "queues", filter: `id=eq.${queueId}` },
        () => void refresh(),
      )
      .subscribe();

    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    // Realtime carries the moment-to-moment updates; this is the safety net for a
    // phone that dropped its websocket in a pocket.
    const poll = setInterval(() => void refresh(), 45_000);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(poll);
      void client.removeChannel(channel);
    };
  }, [queueId, token, refresh]);

  return { ticket, refresh };
}

/** Browser notifications, asked for at the one moment they make sense. */
export function useTurnAlert(ticket: Ticket | null) {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const alerted = useRef<string | null>(null);

  useEffect(() => {
    if (typeof Notification !== "undefined") setPermission(Notification.permission);
  }, []);

  const enable = useCallback(async () => {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    setPermission(result);
  }, []);

  useEffect(() => {
    if (!ticket || permission !== "granted") return;

    const nearly = ticket.ahead <= 2 && ticket.entry.status === "WAITING";
    const called = ticket.entry.status === "CALLED";
    const stage = called ? "called" : nearly ? "nearly" : null;
    if (!stage || alerted.current === stage) return;
    alerted.current = stage;

    const body = called
      ? "It's your turn. Please head to the counter."
      : `You're ${ticket.ahead === 0 ? "next" : `${ticket.ahead} away`}. Start heading back.`;

    try {
      new Notification(ticket.business.name, { body, tag: "qyoflow-turn" });
      navigator.vibrate?.([120, 60, 120]);
    } catch {
      // Notifications can be blocked at the OS level after being granted.
    }
  }, [ticket, permission]);

  return { permission, enable };
}
