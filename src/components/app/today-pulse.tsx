"use client";

import { AnimatedNumber } from "@/components/animated-number";
import { StatusDot } from "@/components/ui";
import { useLiveQueue } from "@/lib/use-live-queue";
import type { LiveQueue } from "@/lib/types";

/**
 * The one part of the dashboard that changes while you are looking at it.
 *
 * No panel around it: this is the page's subject, not an item on it. Everything
 * below is settled history, and sits in lighter type to say so.
 */
export function TodayPulse({
  locationId,
  initial,
  initialError,
}: {
  locationId: string;
  initial: LiveQueue | null;
  initialError?: string | null;
}) {
  const { data, error } = useLiveQueue(locationId, initial, initialError);

  if (error && !data) {
    return (
      <section aria-label="Live queue status">
        <h2 className="t-label text-[var(--color-ink-3)]">In the queue</h2>
        <p className="mt-3 t-h2 text-[var(--color-ink)]">We couldn&rsquo;t load the queue</p>
        <p className="mt-1.5 max-w-[42ch] t-body text-[var(--color-ink-2)]">
          Nobody has lost their place. Open the queue page to try again.
        </p>
      </section>
    );
  }

  const waiting = data?.queue?.waiting ?? 0;
  const serving = data?.queue?.serving_number ?? null;
  const open = data?.queue?.is_open ?? true;

  return (
    <section aria-label="Live queue status">
      <div className="flex items-baseline gap-3">
        <h2 className="t-label text-[var(--color-ink-3)]">
          {waiting === 1 ? "Person waiting" : "People waiting"}
        </h2>
        {/* The dot earns its place here: "closed" isn't otherwise visible
            from this screen. */}
        {!open && <StatusDot tone="idle">Closed</StatusDot>}
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-x-12 gap-y-5">
        <AnimatedNumber
          value={waiting}
          className={`t-num text-[clamp(4rem,12vw,6rem)] ${
            waiting === 0 ? "text-[var(--color-ink-3)]" : "text-[var(--color-ink)]"
          }`}
        />

        {serving !== null && (
          <div className="pb-2">
            <p className="t-label text-[var(--color-ink-3)]">Now serving</p>
            <AnimatedNumber
              value={serving}
              prefix="#"
              className="t-num mt-1.5 text-[1.75rem] text-[var(--color-ink)]"
            />
          </div>
        )}
      </div>
    </section>
  );
}
