"use client";

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";

const EXIT_MS = 180;
const SHIFT_MS = 260;

export type ItemState = "entering" | "present" | "leaving";

export interface Transitioned<T> {
  key: string;
  item: T;
  state: ItemState;
}

function reducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Keeps a removed item in the tree long enough for it to animate out.
 *
 * When staff call #38, that row should be seen leaving the waiting list — the
 * rows below visibly close the gap. React would otherwise unmount it instantly
 * and the list would just be one shorter, which tells the eye nothing about
 * cause and effect.
 */
export function useListTransition<T>(
  items: T[],
  getKey: (item: T) => string,
): Transitioned<T>[] {
  const [rendered, setRendered] = useState<Transitioned<T>[]>(() =>
    items.map((item) => ({ key: getKey(item), item, state: "present" as const })),
  );
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const incoming = new Map(items.map((i) => [getKey(i), i]));

    setRendered((previous) => {
      const seen = new Set(previous.map((r) => r.key));
      const next: Transitioned<T>[] = [];

      for (const row of previous) {
        const stillHere = incoming.get(row.key);
        if (stillHere !== undefined) {
          next.push({ key: row.key, item: stillHere, state: "present" });
        } else if (row.state !== "leaving") {
          next.push({ ...row, state: "leaving" });
        } else {
          next.push(row);
        }
      }

      for (const item of items) {
        const key = getKey(item);
        if (!seen.has(key)) next.push({ key, item, state: "entering" });
      }

      // Preserve the incoming order for everything that survived.
      const order = new Map(items.map((item, i) => [getKey(item), i]));
      return next.sort((a, b) => (order.get(a.key) ?? Infinity) - (order.get(b.key) ?? Infinity));
    });
  }, [items, getKey]);

  // Retire leaving rows, and settle entering ones, once their animation is done.
  useEffect(() => {
    const store = timers.current;

    for (const row of rendered) {
      if (row.state === "present" || store.has(row.key)) continue;

      const delay = row.state === "leaving" ? (reducedMotion() ? 0 : EXIT_MS) : 0;
      const timer = setTimeout(() => {
        store.delete(row.key);
        setRendered((previous) =>
          row.state === "leaving"
            ? previous.filter((r) => r.key !== row.key)
            : previous.map((r) => (r.key === row.key ? { ...r, state: "present" } : r)),
        );
      }, delay);
      store.set(row.key, timer);
    }

    return () => {
      // Only clears on unmount; per-key timers clean themselves up above.
    };
  }, [rendered]);

  useEffect(() => {
    const store = timers.current;
    return () => {
      store.forEach(clearTimeout);
      store.clear();
    };
  }, []);

  return rendered;
}

/**
 * FLIP: after the list re-renders, slide each row from where it was to where it
 * now is. Spatial continuity — a row that moved up one place should be seen
 * moving, not teleporting.
 *
 * Rows opt in with `data-flip-key`. Uses the Web Animations API, so the work
 * happens off the main thread and costs nothing when nothing moved.
 */
export function useFlip(container: RefObject<HTMLElement | null>, signal: unknown) {
  const offsets = useRef(new Map<string, number>());

  useLayoutEffect(() => {
    const root = container.current;
    if (!root) return;

    const nodes = root.querySelectorAll<HTMLElement>("[data-flip-key]");
    const skip = reducedMotion();

    nodes.forEach((node) => {
      const key = node.dataset.flipKey;
      if (!key) return;

      const now = node.offsetTop;
      const before = offsets.current.get(key);
      offsets.current.set(key, now);

      if (skip || before === undefined || Math.abs(before - now) < 1) return;

      node.animate(
        [{ transform: `translateY(${before - now}px)` }, { transform: "translateY(0)" }],
        { duration: SHIFT_MS, easing: "cubic-bezier(0.2, 0, 0, 1)" },
      );
    });

    // Forget rows that have gone, so a recycled key doesn't fly in from nowhere.
    const live = new Set(
      [...nodes].map((n) => n.dataset.flipKey).filter(Boolean) as string[],
    );
    for (const key of offsets.current.keys()) {
      if (!live.has(key)) offsets.current.delete(key);
    }
  }, [container, signal]);
}
