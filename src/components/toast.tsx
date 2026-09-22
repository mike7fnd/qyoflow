"use client";

import { useEffect, useState } from "react";

/**
 * A minimal toast. No provider to wire up, no dependency — a module-level store
 * any component can push to.
 *
 * Toasts are for confirmations that would otherwise be invisible: a link copied,
 * a QR downloaded, a plan changed. Anything the user can already see the result
 * of doesn't get one.
 */

export type ToastTone = "neutral" | "success" | "error";

type Toast = { id: number; message: string; tone: ToastTone; leaving?: boolean };

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<(t: Toast[]) => void>();

function emit() {
  listeners.forEach((l) => l([...toasts]));
}

function dismiss(id: number) {
  toasts = toasts.map((t) => (t.id === id ? { ...t, leaving: true } : t));
  emit();
  // Let the exit animation finish before the node leaves the tree.
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  }, 180);
}

export function toast(message: string, tone: ToastTone = "neutral") {
  const id = nextId++;
  // Never stack more than three; the oldest goes first.
  toasts = [...toasts.slice(-2), { id, message, tone }];
  emit();
  setTimeout(() => dismiss(id), tone === "error" ? 6000 : 3600);
  return id;
}

export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);

  useEffect(() => {
    listeners.add(setItems);
    return () => {
      listeners.delete(setItems);
    };
  }, []);

  if (!items.length) return null;

  return (
    <div
      // Bottom-centre on mobile where the thumb is, bottom-left on desktop where
      // it won't cover the primary action.
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:items-start sm:pl-6"
      role="status"
      aria-live="polite"
    >
      {items.map((t) => (
        <div
          key={t.id}
          style={{
            animation: t.leaving
              ? "toast-out var(--dur-fast) var(--ease-exit) forwards"
              : "toast-in var(--dur-base) var(--ease)",
          }}
          className="pointer-events-auto flex max-w-[min(30rem,calc(100vw-2rem))] items-center gap-2.5 rounded-[var(--radius-md)] bg-[var(--color-ink)] px-4 py-2.5 text-white shadow-[var(--shadow-3)]"
        >
          {t.tone !== "neutral" && (
            <span
              aria-hidden="true"
              className="size-1.5 shrink-0 rounded-full"
              style={{
                background:
                  t.tone === "success"
                    ? "var(--color-success-dot)"
                    : "var(--color-danger)",
              }}
            />
          )}
          <span className="t-body-sm">{t.message}</span>
        </div>
      ))}
    </div>
  );
}
