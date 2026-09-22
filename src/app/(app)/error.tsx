"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui";
import { Page } from "@/components/app/page-header";

/**
 * What a person can do about it, in their words. The actual exception goes to
 * the console for whoever is on call — never onto the screen.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Page width="narrow">
      <div className="py-16">
        <h1 className="t-h1 text-[var(--color-ink)]">Something went wrong</h1>
        <p className="mt-3 max-w-[44ch] t-body text-[var(--color-ink-2)]">
          We couldn&rsquo;t load this page. Your queue is still running — nobody
          has lost their place.
        </p>

        <div className="mt-8 flex flex-wrap gap-2">
          <Button onClick={reset}>Try again</Button>
          <Button variant="tertiary" onClick={() => window.location.reload()}>
            Reload the page
          </Button>
        </div>

        {error.digest && (
          <p className="mt-10 t-meta text-[var(--color-ink-3)]">
            If you contact us, quote reference {error.digest}.
          </p>
        )}
      </div>
    </Page>
  );
}
