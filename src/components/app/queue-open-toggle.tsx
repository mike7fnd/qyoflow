"use client";

import { useState, useTransition } from "react";
import { setQueueOpen } from "@/app/(app)/queue/actions";
import { toast } from "@/components/toast";
import { cx } from "@/components/ui";

/** The one switch that decides whether new customers can join. */
export function QueueOpenToggle({
  locationId,
  initialOpen,
}: {
  locationId: string;
  initialOpen: boolean;
}) {
  const [open, setOpen] = useState(initialOpen);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !open;
    setOpen(next); // optimistic — reverted below if the server disagrees
    startTransition(async () => {
      const result = await setQueueOpen(locationId, next);
      if (!result.ok) {
        setOpen(!next);
        toast(result.error, "error");
        return;
      }
      toast(next ? "Queue open — customers can join" : "Queue closed to new customers");
    });
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={open}
      onClick={toggle}
      disabled={pending}
      className="group inline-flex min-h-10 items-center gap-2.5 rounded-[var(--radius-md)] px-2 transition-opacity disabled:opacity-60"
    >
      <span
        aria-hidden="true"
        className={cx(
          "relative block h-5 w-9 shrink-0 rounded-full transition-colors duration-[var(--dur-base)] ease-[var(--ease)]",
          open ? "bg-[var(--color-success-dot)]" : "bg-[var(--color-line-2)]",
        )}
      >
        {/* Pinned with left/top rather than relying on the static position of
            an absolutely positioned box, which lands elsewhere and pushes the
            knob onto the label. Travel is 36 − 2 − 16 − 2 = 16px. */}
        <span
          className={cx(
            "absolute left-0.5 top-0.5 size-4 rounded-full bg-white shadow-sm",
            "transition-transform duration-[var(--dur-base)] ease-[var(--ease)]",
            open ? "translate-x-4" : "translate-x-0",
          )}
        />
      </span>
      <span className="t-body-sm text-[var(--color-ink-2)] group-hover:text-[var(--color-ink)]">
        {open ? "Open" : "Closed"}
      </span>
    </button>
  );
}
