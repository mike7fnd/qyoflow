import type { ReactNode } from "react";
import { cx } from "@/components/ui";

/**
 * Every app screen sits in the same column and starts at the same baseline.
 * Width is capped so long lists stay readable on a wide monitor instead of
 * stretching to the window edge.
 */
export function Page({
  children,
  width = "default",
}: {
  children: ReactNode;
  width?: "default" | "narrow";
}) {
  return (
    <div
      className={cx(
        "mx-auto w-full px-5 pb-20 pt-8 sm:px-8 sm:pt-12 md:pb-16",
        width === "narrow" ? "max-w-[38rem]" : "max-w-[58rem]",
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
      <div className="min-w-0">
        <h1 className="t-h1 text-[var(--color-ink)]">{title}</h1>
        {subtitle && <p className="mt-1.5 t-body text-[var(--color-ink-2)]">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
