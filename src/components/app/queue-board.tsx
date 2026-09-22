"use client";

import Link from "next/link";
import { useCallback, useRef, useTransition } from "react";
import { AnimatedNumber } from "@/components/animated-number";
import { Button, Panel, Rule, cx } from "@/components/ui";
import { toast } from "@/components/toast";
import { useLiveQueue } from "@/lib/use-live-queue";
import { useFlip, useListTransition } from "@/lib/use-list-transition";
import { callNext, setEntryStatus } from "@/app/(app)/queue/actions";
import { STATUS_LABEL, shortTime, sinceShort } from "@/lib/format";
import type { EntryStatus, LiveEntry, LiveQueue } from "@/lib/types";

const OPEN_STATES: EntryStatus[] = ["WAITING", "CALLED", "SERVING"];

export function QueueBoard({
  locationId,
  slug,
  initial,
  initialError,
  timezone,
}: {
  locationId: string;
  slug: string;
  initial: LiveQueue | null;
  initialError?: string | null;
  timezone: string;
}) {
  const { data, error, refresh } = useLiveQueue(locationId, initial, initialError);
  const [pending, startTransition] = useTransition();

  const entries = data?.entries ?? [];
  const active = entries.find((e) => e.status === "CALLED" || e.status === "SERVING") ?? null;
  const waiting = entries.filter((e) => e.status === "WAITING");
  const handled = entries.filter((e) => !OPEN_STATES.includes(e.status));
  const next = waiting[0] ?? null;

  const act = useCallback((run: () => Promise<{ ok: boolean; error?: string }>) => {
    startTransition(async () => {
      const result = await run();
      if (!result.ok) toast(result.error ?? "Something went wrong.", "error");
    });
  }, []);

  // A board that can't be read is not an empty board, and must never look
  // like one.
  if (error && !data) {
    return <QueueUnavailable message={error} onRetry={() => void refresh()} />;
  }

  const quiet = !active && waiting.length === 0 && handled.length === 0;

  return (
    <div className="space-y-10">
      {error && data && (
        <p
          role="status"
          className="rounded-[var(--radius-md)] bg-[var(--color-danger-soft)] px-3.5 py-2.5 t-body-sm text-[var(--color-danger)]"
        >
          Live updates have stopped. What you see may be out of date.
        </p>
      )}

      <NowServing
        active={active}
        next={next}
        pending={pending}
        quiet={quiet}
        slug={slug}
        isOpen={data?.queue?.is_open ?? true}
        onCallNext={() => act(() => callNext(locationId))}
        onComplete={() => active && act(() => setEntryStatus(active.id, "COMPLETED"))}
        onNoShow={() => active && act(() => setEntryStatus(active.id, "NO_SHOW"))}
      />

      {/* When the whole day is still empty, the panel above already says so
          once. Repeating it under a "Waiting — None" heading says it twice. */}
      {!quiet && (
        <WaitingList
          entries={waiting}
          timezone={timezone}
          pending={pending}
          onSkip={(id) => act(() => setEntryStatus(id, "SKIPPED"))}
        />
      )}

      {handled.length > 0 && <HandledToday entries={handled} timezone={timezone} />}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── unavailable */

function QueueUnavailable({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Panel className="p-8 sm:p-10">
      <h2 className="t-h2 text-[var(--color-ink)]">{message}</h2>
      <p className="mt-2 max-w-[48ch] t-body text-[var(--color-ink-2)]">
        Nobody has lost their place — this screen just can&rsquo;t reach the queue
        right now. Your customers can still join.
      </p>
      <Button className="mt-6" onClick={onRetry}>
        Try again
      </Button>
    </Panel>
  );
}

/* ───────────────────────────────────────────────────────────── serving */

function NowServing({
  active,
  next,
  pending,
  quiet,
  slug,
  isOpen,
  onCallNext,
  onComplete,
  onNoShow,
}: {
  active: LiveEntry | null;
  next: LiveEntry | null;
  pending: boolean;
  quiet: boolean;
  slug: string;
  isOpen: boolean;
  onCallNext: () => void;
  onComplete: () => void;
  onNoShow: () => void;
}) {
  // Nothing has happened today: one calm statement and a way to test it,
  // rather than a giant dash and a disabled button.
  if (quiet) {
    return (
      <Panel className="p-8 text-center sm:p-12">
        <h2 className="t-h2 text-[var(--color-ink)]">
          {isOpen ? "Nobody in line yet" : "The queue is closed"}
        </h2>
        <p className="mx-auto mt-2 max-w-[40ch] t-body text-[var(--color-ink-2)]">
          {isOpen
            ? "Anyone who scans your QR code appears here the moment they join."
            : "Open the queue above to let customers take a number."}
        </p>
        <Link
          href={`/q/${slug}`}
          className="mt-6 inline-block t-label text-[var(--color-accent)] underline-offset-4 hover:underline"
        >
          Open your customer page
        </Link>
      </Panel>
    );
  }

  return (
    <Panel className="overflow-hidden">
      <div className="p-6 sm:p-8">
        <p className="t-label text-[var(--color-ink-3)]">
          {active ? "Now serving" : "Counter is free"}
        </p>

        {active ? (
          <div className="mt-4 flex flex-wrap items-end gap-x-8 gap-y-4">
            <AnimatedNumber
              value={active.number}
              prefix="#"
              className="t-num text-[clamp(3.5rem,9vw,5rem)] text-[var(--color-ink)]"
            />

            <div className="min-w-0 flex-1 pb-1.5">
              <p className="truncate t-h3 text-[var(--color-ink)]">
                {active.customer_name ?? "Walk-in"}
              </p>
              <p className="mt-0.5 truncate t-body-sm text-[var(--color-ink-2)]">
                {active.service_name ?? "No service selected"}
                {active.called_at && (
                  <span className="text-[var(--color-ink-3)]">
                    {" · called "}
                    {sinceShort(active.called_at)}
                  </span>
                )}
              </p>

              {/* These act on the customer above, so they sit with them — well
                  away from the primary action below. */}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" disabled={pending} onClick={onComplete}>
                  Complete
                </Button>
                <Button size="sm" variant="tertiary" disabled={pending} onClick={onNoShow}>
                  No show
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-2 t-body text-[var(--color-ink-2)]">
            {next
              ? `#${next.number} is up next.`
              : "Everyone who joined today has been seen."}
          </p>
        )}
      </div>

      {/* The one action this screen exists for. Nothing shares its row, and it
          drops to a neutral control when there is nobody to call — a huge faded
          blue bar reads as a broken button. */}
      <div className="border-t border-[var(--color-line)] bg-[var(--color-sunken)]/60 p-3 sm:px-4">
        <Button
          size="lg"
          variant={next ? "primary" : "secondary"}
          className="w-full"
          disabled={!next}
          loading={pending}
          onClick={onCallNext}
        >
          {next ? `Call next — #${next.number}` : "Nobody waiting"}
        </Button>
      </div>
    </Panel>
  );
}

/* ───────────────────────────────────────────────────────────── waiting */

function WaitingList({
  entries,
  timezone,
  pending,
  onSkip,
}: {
  entries: LiveEntry[];
  timezone: string;
  pending: boolean;
  onSkip: (id: string) => void;
}) {
  const rows = useListTransition(entries, keyOf);
  const listRef = useRef<HTMLUListElement>(null);
  useFlip(listRef, rows.map((r) => r.key).join());

  return (
    <section>
      <header className="flex items-baseline justify-between gap-4">
        <h2 className="t-h2 text-[var(--color-ink)]">Waiting</h2>
        <p className="tnum t-body-sm text-[var(--color-ink-2)]">
          {entries.length === 0
            ? "Nobody"
            : `${entries.length} ${entries.length === 1 ? "person" : "people"}`}
        </p>
      </header>

      {entries.length === 0 ? (
        <p className="mt-3 t-body text-[var(--color-ink-2)]">
          The line is clear. New customers will appear here as they join.
        </p>
      ) : (
        <ul ref={listRef} className="mt-2">
          {rows.map(({ key, item, state }, index) => (
            <li
              key={key}
              data-flip-key={key}
              className={cx(
                state === "entering" && "row-enter",
                state === "leaving" && "row-exit",
              )}
            >
              {index > 0 && <Rule />}
              <WaitingRow
                entry={item}
                isNext={index === 0 && state !== "leaving"}
                timezone={timezone}
                pending={pending}
                onSkip={() => onSkip(item.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function keyOf(entry: LiveEntry) {
  return entry.id;
}

function WaitingRow({
  entry,
  isNext,
  timezone,
  pending,
  onSkip,
}: {
  entry: LiveEntry;
  isNext: boolean;
  timezone: string;
  pending: boolean;
  onSkip: () => void;
}) {
  return (
    <div className="group flex items-center gap-4 py-3.5">
      <span
        className={cx(
          "tnum w-12 shrink-0 text-[1.0625rem] font-semibold tracking-[-0.02em]",
          isNext ? "text-[var(--color-ink)]" : "text-[var(--color-ink-3)]",
        )}
      >
        {entry.number}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate t-body text-[var(--color-ink)]">
          {entry.customer_name ?? "Walk-in"}
        </p>
        <p className="truncate t-meta text-[var(--color-ink-3)] sm:hidden">
          {entry.service_name ?? "—"}
        </p>
      </div>

      <span className="hidden max-w-[14ch] truncate t-body-sm text-[var(--color-ink-2)] sm:block">
        {entry.service_name ?? "—"}
      </span>

      <span className="tnum w-16 shrink-0 text-right t-body-sm text-[var(--color-ink-3)]">
        {shortTime(entry.joined_at, timezone)}
      </span>

      {/* Always present on touch; revealed on hover or keyboard focus on a
          pointer device, so the list reads as names rather than buttons. */}
      <Button
        size="sm"
        variant="tertiary"
        disabled={pending}
        onClick={onSkip}
        className="shrink-0 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
      >
        Skip
        <span className="sr-only"> number {entry.number}</span>
      </Button>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────── handled */

function HandledToday({ entries, timezone }: { entries: LiveEntry[]; timezone: string }) {
  const recent = entries.slice().reverse();

  return (
    <details className="group">
      <summary className="inline-flex cursor-pointer list-none items-center gap-2 t-label text-[var(--color-ink-2)] transition-colors duration-[var(--dur-fast)] hover:text-[var(--color-ink)]">
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
          className="transition-transform duration-[var(--dur-fast)] group-open:rotate-90"
        >
          <path
            d="M6 3.5 10.5 8 6 12.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Handled today ({entries.length})
      </summary>

      <ul className="mt-2 pl-6">
        {recent.slice(0, 20).map((entry, i) => (
          <li key={entry.id}>
            {i > 0 && <Rule />}
            <div className="flex items-center gap-4 py-2.5">
              <span className="tnum w-12 shrink-0 t-body-sm text-[var(--color-ink-3)]">
                {entry.number}
              </span>
              <span className="min-w-0 flex-1 truncate t-body-sm text-[var(--color-ink-2)]">
                {entry.customer_name ?? "Walk-in"}
              </span>
              <span
                className={cx(
                  "t-meta",
                  entry.status === "COMPLETED"
                    ? "text-[var(--color-success)]"
                    : "text-[var(--color-ink-3)]",
                )}
              >
                {STATUS_LABEL[entry.status]}
              </span>
              <span className="tnum w-16 shrink-0 text-right t-meta text-[var(--color-ink-3)]">
                {shortTime(entry.ended_at, timezone)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </details>
  );
}
