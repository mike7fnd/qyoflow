"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "@/app/auth/actions";
import { Mark } from "@/components/marketing/chrome";
import { Rule, cx } from "@/components/ui";
import type { MemberRole } from "@/lib/types";

type Item = { href: string; label: string; icon: () => React.ReactElement };

/** Running the shop. */
const OPERATE: Item[] = [
  { href: "/dashboard", label: "Today", icon: IconToday },
  { href: "/queue", label: "Queue", icon: IconQueue },
  { href: "/analytics", label: "Analytics", icon: IconChart },
];

/** Setting it up. Visited rarely, so it sits below a rule, not in the same list. */
const CONFIGURE: Item[] = [
  { href: "/services", label: "Services", icon: IconTag },
  { href: "/qr", label: "QR code", icon: IconQr },
  { href: "/billing", label: "Plan & billing", icon: IconCard },
  { href: "/settings", label: "Settings", icon: IconGear },
];

/** Staff get the counter and nothing that could change the business. */
const STAFF: Item[] = [
  { href: "/staff", label: "Counter", icon: IconQueue },
  { href: "/queue", label: "Queue", icon: IconToday },
];

export function AppNav({
  businessName,
  slug,
  email,
  role,
  planName,
}: {
  businessName: string;
  slug: string;
  email: string;
  role: MemberRole;
  planName: string;
}) {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);

  const isStaff = role === "staff";
  const operate = isStaff ? STAFF : OPERATE;
  const configure = isStaff ? [] : CONFIGURE;

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  // Close the sheet on navigation, and on Escape.
  useEffect(() => setSheetOpen(false), [pathname]);
  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSheetOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [sheetOpen]);

  return (
    <>
      {/* ───────────────────────────────────────────────── desktop rail */}
      <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col bg-[var(--color-surface)] px-3 py-5 shadow-[1px_0_0_var(--color-line)] md:flex">
        <Link
          href="/dashboard"
          className="mx-2 flex items-center gap-2 rounded-[var(--radius-sm)]"
        >
          <Mark size={18} />
          <span className="text-[0.9375rem] font-semibold tracking-[-0.02em]">QyoFlow</span>
        </Link>

        <div className="mx-2 mt-6">
          <p className="truncate t-label text-[var(--color-ink)]">{businessName}</p>
          <p className="mt-0.5 truncate t-meta text-[var(--color-ink-3)]">/q/{slug}</p>
        </div>

        <nav aria-label="Main" className="mt-6 flex-1">
          <ul className="space-y-0.5">
            {operate.map((item) => (
              <li key={item.href}>
                <NavLink item={item} active={isActive(item.href)} />
              </li>
            ))}
          </ul>

          {configure.length > 0 && (
            <>
              <Rule className="mx-2 my-4" />
              <ul className="space-y-0.5">
                {configure.map((item) => (
                  <li key={item.href}>
                    <NavLink item={item} active={isActive(item.href)} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </nav>

        <div className="mx-2 border-t border-[var(--color-line)] pt-4">
          {!isStaff && (
            <p className="t-meta text-[var(--color-ink-3)]">{planName} plan</p>
          )}
          <p className="mt-1 truncate t-meta text-[var(--color-ink-3)]">{email}</p>
          <form action={signOut}>
            <button
              type="submit"
              className="mt-2 rounded-[var(--radius-sm)] t-label text-[var(--color-ink-2)] transition-colors duration-[var(--dur-fast)] hover:text-[var(--color-ink)]"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* ───────────────────────────────────────────────── mobile tab bar

          Four destinations plus More. Anything deeper lives in the sheet, so
          the bar never becomes a row of seven 40px targets. */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-line)] bg-[var(--color-surface)]/92 backdrop-blur-xl md:hidden"
      >
        <ul className="flex items-stretch">
          {operate.map((item) => (
            <TabLink key={item.href} item={item} active={isActive(item.href)} />
          ))}

          {configure.length > 0 && (
            <li className="flex-1">
              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                aria-expanded={sheetOpen}
                className={cx(
                  "flex min-h-12 w-full flex-col items-center justify-center gap-1 py-2",
                  configure.some((i) => isActive(i.href))
                    ? "text-[var(--color-ink)]"
                    : "text-[var(--color-ink-3)]",
                )}
              >
                <IconMore />
                <span className="text-[0.625rem] font-medium">More</span>
              </button>
            </li>
          )}
        </ul>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>

      {/* ───────────────────────────────────────────────── more sheet */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setSheetOpen(false)}
            className="absolute inset-0 bg-[var(--color-ink)]/25"
            style={{ animation: "msg-in var(--dur-base) var(--ease)" }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="More"
            className="absolute inset-x-0 bottom-0 rounded-t-[var(--radius-lg)] bg-[var(--color-surface)] pb-[env(safe-area-inset-bottom)] shadow-[var(--shadow-3)]"
            style={{ animation: "toast-in var(--dur-slow) var(--ease)" }}
          >
            <div className="mx-auto mt-3 h-1 w-9 rounded-full bg-[var(--color-line-2)]" />
            <ul className="p-3">
              {configure.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cx(
                      "flex min-h-12 items-center gap-3 rounded-[var(--radius-md)] px-3 t-body",
                      isActive(item.href)
                        ? "bg-[var(--color-sunken)] text-[var(--color-ink)]"
                        : "text-[var(--color-ink-2)]",
                    )}
                  >
                    <item.icon />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>

            <Rule className="mx-3" />

            <div className="flex items-center justify-between p-4">
              <p className="min-w-0 truncate t-meta text-[var(--color-ink-3)]">{email}</p>
              <form action={signOut}>
                <button
                  type="submit"
                  className="rounded-[var(--radius-sm)] px-2 py-1 t-label text-[var(--color-ink-2)]"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Active state: the label goes to full-strength ink and the row picks up a
 * quiet fill. No coloured pill — on a page you are already looking at, a bright
 * indicator is redundant.
 */
function NavLink({ item, active }: { item: Item; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cx(
        "flex items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 py-1.5 t-body-sm",
        "transition-colors duration-[var(--dur-fast)]",
        active
          ? "bg-[var(--color-sunken)] font-medium text-[var(--color-ink)]"
          : "text-[var(--color-ink-2)] hover:bg-[var(--color-sunken)]/70 hover:text-[var(--color-ink)]",
      )}
    >
      <Icon />
      {item.label}
    </Link>
  );
}

function TabLink({ item, active }: { item: Item; active: boolean }) {
  const Icon = item.icon;
  return (
    <li className="flex-1">
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cx(
          "flex min-h-12 flex-col items-center justify-center gap-1 py-2 transition-colors duration-[var(--dur-fast)]",
          active ? "text-[var(--color-ink)]" : "text-[var(--color-ink-3)]",
        )}
      >
        <Icon />
        <span className="text-[0.625rem] font-medium">{item.label}</span>
      </Link>
    </li>
  );
}

/* ───────────────────────────────────────────────────────────────── icons */

const S = { width: 18, height: 18, viewBox: "0 0 18 18", fill: "none", "aria-hidden": true } as const;
const K = {
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function IconToday() {
  return (
    <svg {...S}>
      <rect x="2.75" y="3.75" width="12.5" height="11" rx="2.5" {...K} />
      <path d="M2.75 7.25h12.5M6.25 2.5v2.5M11.75 2.5v2.5" {...K} />
    </svg>
  );
}

function IconQueue() {
  return (
    <svg {...S}>
      <path d="M3.25 5.5h11.5M3.25 9h11.5M3.25 12.5h6.5" {...K} />
    </svg>
  );
}

function IconChart() {
  return (
    <svg {...S}>
      <path d="M3.25 14v-3M7.5 14V7M11.75 14v-4.5M16 14V4" {...K} />
    </svg>
  );
}

function IconTag() {
  return (
    <svg {...S}>
      <path d="M3 8.2V3.75h4.45L15 11.3 11.3 15 3 8.2z" {...K} />
      <circle cx="6" cy="6" r="1" fill="currentColor" />
    </svg>
  );
}

function IconQr() {
  return (
    <svg {...S}>
      <rect x="3" y="3" width="5" height="5" rx="1.5" {...K} />
      <rect x="10" y="3" width="5" height="5" rx="1.5" {...K} />
      <rect x="3" y="10" width="5" height="5" rx="1.5" {...K} />
      <path d="M10 10h2.25M15 10v2.25M10 15h5" {...K} />
    </svg>
  );
}

function IconCard() {
  return (
    <svg {...S}>
      <rect x="2.25" y="4.25" width="13.5" height="9.5" rx="2.5" {...K} />
      <path d="M2.25 7.75h13.5" {...K} />
    </svg>
  );
}

function IconGear() {
  return (
    <svg {...S}>
      <circle cx="9" cy="9" r="2.4" {...K} />
      <path d="M9 2.4v1.3M9 14.3v1.3M15.6 9h-1.3M3.7 9H2.4M13.67 4.33l-.92.92M5.25 12.75l-.92.92M13.67 13.67l-.92-.92M5.25 5.25l-.92-.92" {...K} />
    </svg>
  );
}

function IconMore() {
  return (
    <svg {...S}>
      <circle cx="4" cy="9" r="1.3" fill="currentColor" />
      <circle cx="9" cy="9" r="1.3" fill="currentColor" />
      <circle cx="14" cy="9" r="1.3" fill="currentColor" />
    </svg>
  );
}
