"use client";

import { useEffect, useRef, useState } from "react";
import { cx } from "@/components/ui";

/**
 * A number that moves rather than blinks.
 *
 * The digit travels in the direction the value went: counting down reads as the
 * line coming toward you, counting up as it growing. That direction is the only
 * reason this animates at all — a number that changed for no visible reason
 * would just be noise.
 *
 * Pure CSS keyframes; the outgoing value is held for one transition so the two
 * states overlap instead of snapping.
 */
export function AnimatedNumber({
  value,
  prefix,
  className,
}: {
  value: number | string | null | undefined;
  prefix?: string;
  className?: string;
}) {
  const text = value === null || value === undefined || value === "" ? "—" : `${prefix ?? ""}${value}`;

  const [shown, setShown] = useState(text);
  const [leaving, setLeaving] = useState<string | null>(null);
  const [dir, setDir] = useState<"up" | "down">("up");
  const numeric = useRef<number | null>(typeof value === "number" ? value : null);

  useEffect(() => {
    if (text === shown) return;

    const next = typeof value === "number" ? value : Number(value);
    const previous = numeric.current;
    setDir(
      previous !== null && Number.isFinite(next) && next < previous ? "down" : "up",
    );
    if (Number.isFinite(next)) numeric.current = next;

    setLeaving(shown);
    setShown(text);
    const timer = setTimeout(() => setLeaving(null), 260);
    return () => clearTimeout(timer);
  }, [text, shown, value]);

  // The widest of the two values holds the box open, so nothing beside the
  // number shifts while it changes.
  const widest = leaving && leaving.length > shown.length ? leaving : shown;

  return (
    <span className={cx("relative inline-block overflow-hidden align-bottom", className)}>
      <span aria-hidden="true" className="invisible block">
        {widest}
      </span>

      <span className="sr-only">{shown}</span>

      <span
        aria-hidden="true"
        key={shown}
        className={cx(
          "absolute inset-0 block",
          dir === "down" ? "num-roll-down" : "num-roll-up",
        )}
      >
        {shown}
      </span>

      {leaving && (
        <span
          aria-hidden="true"
          className="absolute inset-0 block"
          style={{
            animation: `num-in-${dir === "down" ? "up" : "down"} 260ms var(--ease) reverse forwards`,
          }}
        >
          {leaving}
        </span>
      )}
    </span>
  );
}

/**
 * Counts from the previous value to the new one. For settled statistics, never
 * for a live queue number — those should land, not tick.
 */
export function CountUp({
  value,
  className,
  duration = 600,
}: {
  value: number;
  className?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const from = useRef(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      node.textContent = String(value);
      from.current = value;
      return;
    }

    const start = from.current;
    const delta = value - start;
    if (delta === 0) {
      node.textContent = String(value);
      return;
    }

    const t0 = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const p = Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      node.textContent = String(Math.round(start + delta * eased));
      if (p < 1) frame = requestAnimationFrame(tick);
      else from.current = value;
    });

    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return (
    <span ref={ref} className={className}>
      {value}
    </span>
  );
}
