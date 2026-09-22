"use client";

import Link from "next/link";
import { cx } from "@/components/ui";

/**
 * Board and Counter are two layouts of one thing, not two features.
 *
 * Saying so with a switch is the whole point: Counter mode previously only
 * appeared in the navigation for staff accounts, and since there is no way to
 * invite staff yet, nobody could reach it at all. An owner setting up a tablet
 * at the till needs to find it from the screen they are already on.
 */
const VIEWS = [
  { href: "/queue", label: "Board", hint: "Full list, for a desk" },
  { href: "/counter", label: "Counter", hint: "Big and simple, for a tablet" },
] as const;

export function QueueViewSwitch({ current }: { current: "/queue" | "/counter" }) {
  return (
    <nav
      aria-label="Queue view"
      className="inline-flex rounded-[var(--radius-md)] bg-[var(--color-sunken)] p-0.5"
    >
      {VIEWS.map((view) => {
        const active = view.href === current;
        return (
          <Link
            key={view.href}
            href={view.href}
            title={view.hint}
            aria-current={active ? "page" : undefined}
            className={cx(
              "rounded-[calc(var(--radius-md)-2px)] px-3 py-1.5 t-label transition-colors duration-[var(--dur-fast)]",
              active
                ? "bg-[var(--color-surface)] text-[var(--color-ink)] shadow-[var(--shadow-1)]"
                : "text-[var(--color-ink-2)] hover:text-[var(--color-ink)]",
            )}
          >
            {view.label}
          </Link>
        );
      })}
    </nav>
  );
}
