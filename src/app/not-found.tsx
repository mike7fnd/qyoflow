import { LinkButton } from "@/components/ui";
import { Wordmark } from "@/components/marketing/chrome";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="px-5 py-5 sm:px-8">
        <Wordmark />
      </header>

      <main className="flex flex-1 items-center justify-center px-5 pb-24">
        <div className="max-w-[34ch] text-center">
          <h1 className="t-h1 text-[var(--color-ink)]">We couldn&rsquo;t find that queue</h1>
          <p className="mt-3 t-body text-[var(--color-ink-2)]">
            The link may be mistyped, or the business may have closed its queue.
            Check the address on the poster and try again.
          </p>
          <LinkButton href="/" variant="secondary" className="mt-7">
            Go to QyoFlow
          </LinkButton>
        </div>
      </main>
    </div>
  );
}
