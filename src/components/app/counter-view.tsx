"use client";

import { useCallback, useRef, useTransition } from "react";
import { AnimatedNumber } from "@/components/animated-number";
import { Button, Rule, StatusDot, cx } from "@/components/ui";
import { toast } from "@/components/toast";
import { useLiveQueue } from "@/lib/use-live-queue";
import { useFlip, useListTransition } from "@/lib/use-list-transition";
import { callNext, setEntryStatus } from "@/app/(app)/queue/actions";
import type { LiveEntry, LiveQueue } from "@/lib/types";

/**
 * Counter mode.
 *
 * Built for someone standing up, holding a phone, looking at a customer — not a
 * shrunken dashboard. The number fills the top of the screen so it can be read
 * at arm's length, and the primary action sits in the bottom third where a
 * thumb already is.
 */
export function CounterView({
  locationId,
  businessName,
  initial,
  initialError,
}: {
  locationId: string;
  businessName: string;
  initial: LiveQueue | null;
  initialError?: string | null;
}) {
  const { data, error, refresh } = useLiveQueue(locationId, initial, initialError);
  const [pending, startTransition] = useTransition();

  const entries = data?.entries ?? [];
  const active = entries.find((e) => e.status === "CALLED" || e.status === "SERVING") ?? null;
  const waiting = entries.filter((e) => e.status === "WAITING");
  const next = waiting[0] ?? null;
  const open = data?.queue?.is_open ?? true;

  const act = useCallback((run: () => Promise<{ ok: boolean; error?: string }>) => {
    startTransition(async () => {
      const result = await run();
      if (!result.ok) toast(result.error ?? "Something went wrong.", "error");
    });
  }, []);

  // Staff must never be shown an empty counter when the real problem is that
  // we couldn't read the queue.
  if (error && !data) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-[32rem] flex-col justify-center px-5 text-center">
        <h1 className="t-h2 text-[var(--color-ink)]">{error}</h1>
        <p className="mx-auto mt-2 max-w-[34ch] t-body text-[var(--color-ink-2)]">
          Nobody has lost their place. Customers can still join while this screen
          reconnects.
        </p>
        <Button size="lg" className="mx-auto mt-7" onClick={() => void refresh()}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[32rem] flex-col px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-6">
      <header className="flex items-center justify-between gap-4">
        <p className="min-w-0 truncate t-h3 text-[var(--color-ink)]">{businessName}</p>
        {!open && <StatusDot tone="idle">Closed</StatusDot>}
      </header>

      {error && (
        <p
          role="status"
          className="mt-3 rounded-[var(--radius-md)] bg-[var(--color-danger-soft)] px-3.5 py-2.5 text-center t-body-sm text-[var(--color-danger)]"
        >
          Live updates have stopped — this may be out of date.
        </p>
      )}

      {/* ───────────────────────────────────────────────── now serving */}
      <div className="flex flex-1 flex-col justify-center py-8 text-center">
        <p className="t-label text-[var(--color-ink-3)]">
          {active ? "Now serving" : "Counter is free"}
        </p>

        {active ? (
          <AnimatedNumber
            value={active.number}
            prefix="#"
            className="t-num mt-3 text-[clamp(5rem,24vw,7.5rem)] text-[var(--color-ink)]"
          />
        ) : (
          // A giant em dash reads as a broken value. A sentence doesn't.
          <p className="mt-4 t-h2 text-[var(--color-ink-2)]">
            {next ? `#${next.number} is up next` : "Nobody is waiting"}
          </p>
        )}

        <div className="mt-4 min-h-[3.25rem]">
          {active && (
            <div key={active.id} className="msg-in">
              <p className="t-h2 text-[var(--color-ink)]">
                {active.customer_name ?? "Walk-in"}
              </p>
              {active.service_name && (
                <p className="mt-0.5 t-body text-[var(--color-ink-2)]">{active.service_name}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ───────────────────────────────────────────────── up next */}
      <section aria-label="Up next" className="mb-6">
        <div className="flex items-baseline justify-between">
          <h2 className="t-label text-[var(--color-ink-3)]">Up next</h2>
          <p className="tnum t-body-sm text-[var(--color-ink-3)]">{waiting.length} waiting</p>
        </div>

        {waiting.length === 0 ? (
          <p className="mt-3 t-body-sm text-[var(--color-ink-2)]">The queue is clear.</p>
        ) : (
          <UpNext entries={waiting.slice(0, 4)} />
        )}
      </section>

      {/* ───────────────────────────────────────────────── actions

          Complete and No show belong to the customer being served, so they sit
          above the divider. Call next stands alone below it. */}
      <div>
        {active && (
          <div className="mb-3 grid grid-cols-2 gap-3">
            <Button
              variant="secondary"
              size="lg"
              disabled={pending}
              onClick={() => act(() => setEntryStatus(active.id, "COMPLETED"))}
            >
              Complete
            </Button>
            <Button
              variant="tertiary"
              size="lg"
              disabled={pending}
              onClick={() => act(() => setEntryStatus(active.id, "NO_SHOW"))}
            >
              No show
            </Button>
          </div>
        )}

        <Button
          size="lg"
          className="h-14 w-full text-[1.0625rem]"
          disabled={!next}
          loading={pending}
          onClick={() => act(() => callNext(locationId))}
        >
          {next ? `Call next — #${next.number}` : "Nobody waiting"}
        </Button>
      </div>
    </div>
  );
}

function UpNext({ entries }: { entries: LiveEntry[] }) {
  const rows = useListTransition(entries, (e) => e.id);
  const ref = useRef<HTMLUListElement>(null);
  useFlip(ref, rows.map((r) => r.key).join());

  return (
    <ul ref={ref} className="mt-1">
      {rows.map(({ key, item, state }, i) => (
        <li
          key={key}
          data-flip-key={key}
          className={cx(state === "entering" && "row-enter", state === "leaving" && "row-exit")}
        >
          {i > 0 && <Rule />}
          <div className="flex items-center gap-4 py-2.5">
            <span
              className={cx(
                "tnum w-12 shrink-0 text-[1.0625rem] font-semibold tracking-[-0.02em]",
                i === 0 ? "text-[var(--color-ink)]" : "text-[var(--color-ink-3)]",
              )}
            >
              {item.number}
            </span>
            <span className="min-w-0 flex-1 truncate t-body text-[var(--color-ink)]">
              {item.customer_name ?? "Walk-in"}
            </span>
            <span className="max-w-[12ch] shrink-0 truncate t-body-sm text-[var(--color-ink-3)]">
              {item.service_name ?? ""}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
