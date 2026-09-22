import Link from "next/link";
import { LinkButton, Rule, Section } from "@/components/ui";

export function Wordmark({ className }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <Mark />
      <span className="text-[0.9375rem] font-semibold tracking-[-0.02em] text-[var(--color-ink)]">
        QyoFlow
      </span>
    </Link>
  );
}

/** Three bars advancing — a line in motion, which is the whole idea. */
export function Mark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="1" y="3.5" width="4.5" height="11" rx="2.25" fill="currentColor" className="text-[var(--color-accent)]" opacity="0.32" />
      <rect x="6.75" y="3.5" width="4.5" height="11" rx="2.25" fill="currentColor" className="text-[var(--color-accent)]" opacity="0.62" />
      <rect x="12.5" y="3.5" width="4.5" height="11" rx="2.25" fill="currentColor" className="text-[var(--color-accent)]" />
    </svg>
  );
}

const NAV = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
];

export function MarketingNav() {
  return (
    <header className="sticky top-0 z-40 bg-[var(--color-page)]/85 backdrop-blur-xl">
      <Section className="flex h-16 items-center justify-between gap-6">
        <Wordmark />

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-[var(--radius-sm)] px-3 py-1.5 t-body-sm text-[var(--color-ink-2)] transition-colors duration-[var(--dur-fast)] hover:text-[var(--color-ink)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <Link
            href="/login"
            className="hidden rounded-[var(--radius-sm)] px-3 py-1.5 t-body-sm text-[var(--color-ink-2)] transition-colors duration-[var(--dur-fast)] hover:text-[var(--color-ink)] sm:block"
          >
            Sign in
          </Link>
          <LinkButton href="/signup" size="sm">
            Start free
          </LinkButton>
        </div>
      </Section>
      <Rule />
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="mt-16">
      <Section>
        <Rule />
        <div className="grid gap-10 py-10 sm:grid-cols-[1fr_auto]">
          <div>
            <Wordmark />
            <p className="mt-3 max-w-[32ch] t-body-sm text-[var(--color-ink-3)]">
              A waiting line nobody has to stand in.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-14 gap-y-8 sm:grid-cols-3">
            <FooterGroup
              title="Product"
              links={[
                { href: "/how-it-works", label: "How it works" },
                { href: "/features", label: "Features" },
                { href: "/pricing", label: "Pricing" },
              ]}
            />
            <FooterGroup
              title="Get started"
              links={[
                { href: "/signup", label: "Create an account" },
                { href: "/login", label: "Sign in" },
              ]}
            />
            <FooterGroup
              title="Support"
              links={[
                { href: "/pricing#faq", label: "Common questions" },
                { href: "mailto:hello@qyoflow.com", label: "Email us" },
              ]}
            />
          </div>
        </div>

        <Rule />
        <p className="py-6 t-meta text-[var(--color-ink-3)]">
          © {new Date().getFullYear()} QyoFlow
        </p>
      </Section>
    </footer>
  );
}

function FooterGroup({
  title,
  links,
}: {
  title: string;
  links: Array<{ href: string; label: string }>;
}) {
  return (
    <div>
      <p className="t-label text-[var(--color-ink)]">{title}</p>
      <ul className="mt-3 space-y-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="t-body-sm text-[var(--color-ink-2)] transition-colors duration-[var(--dur-fast)] hover:text-[var(--color-ink)]"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
