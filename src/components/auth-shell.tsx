import Link from "next/link";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/marketing/chrome";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="px-5 py-5 sm:px-8">
        <Wordmark />
      </header>

      <main className="flex flex-1 items-center justify-center px-5 pb-20">
        <div className="w-full max-w-[22rem]">
          <h1 className="t-h1 text-[var(--color-ink)]">{title}</h1>
          {subtitle && <p className="mt-2 t-body text-[var(--color-ink-2)]">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </main>

      <footer className="px-5 pb-8 text-center">
        <Link
          href="/"
          className="rounded-[var(--radius-sm)] px-2 py-1 t-body-sm text-[var(--color-ink-3)] transition-colors duration-[var(--dur-fast)] hover:text-[var(--color-ink-2)]"
        >
          Back to QyoFlow
        </Link>
      </footer>
    </div>
  );
}
