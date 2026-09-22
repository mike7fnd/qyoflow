import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/* ───────────────────────────────────────────────────────────────── buttons

   Four roles, and only four. If a button doesn't fit one of them, the problem
   is the screen, not the button.

     primary    the one thing this screen is for
     secondary  a real alternative to the primary action
     tertiary   low stakes; reads as text until you reach for it
     danger     destroys or withdraws something
*/

type Variant = "primary" | "secondary" | "tertiary" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-[var(--color-accent)] text-white shadow-[var(--shadow-1)] hover:bg-[var(--color-accent-hover)] active:bg-[var(--color-accent-press)]",
  secondary:
    "bg-[var(--color-surface)] text-[var(--color-ink)] shadow-[var(--shadow-1)] hover:bg-[var(--color-sunken)] active:bg-[var(--color-hover)]",
  tertiary:
    "text-[var(--color-ink-2)] hover:bg-[var(--color-sunken)] hover:text-[var(--color-ink)] active:bg-[var(--color-hover)]",
  danger:
    "bg-[var(--color-danger)] text-white shadow-[var(--shadow-1)] hover:bg-[var(--color-danger-hover)]",
};

const SIZE: Record<Size, string> = {
  sm: "h-8 px-3 text-[0.8125rem] rounded-[var(--radius-sm)] gap-1.5",
  md: "h-10 px-4 text-[0.875rem] rounded-[var(--radius-md)] gap-2",
  lg: "h-12 px-6 text-[0.9375rem] rounded-[var(--radius-md)] gap-2",
};

const BASE =
  "relative inline-flex select-none items-center justify-center font-medium whitespace-nowrap " +
  "transition-[background-color,box-shadow,opacity] duration-[var(--dur-fast)] ease-[var(--ease)] " +
  "disabled:pointer-events-none disabled:opacity-45";

export function Button({
  variant = "primary",
  size = "md",
  loading,
  className,
  children,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size; loading?: boolean }) {
  return (
    <button
      className={cx(BASE, VARIANT[variant], SIZE[size], className)}
      aria-busy={loading || undefined}
      disabled={props.disabled || loading}
      {...props}
    >
      {/* The label keeps its width while the spinner shows, so the button
          doesn't resize mid-click. */}
      <span className={cx("inline-flex items-center gap-2", loading && "invisible")}>
        {children}
      </span>
      {/* Centred by anchoring to all four edges with auto margins — an
          unanchored absolute box lands wherever its static position happens
          to be. */}
      {loading && <Spinner className="absolute inset-0 m-auto" />}
    </button>
  );
}

export function LinkButton({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={cx(BASE, VARIANT[variant], SIZE[size], className)} {...props} />;
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cx("size-4 animate-spin", className)}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="2" opacity="0.25" />
      <path
        d="M14.25 8A6.25 6.25 0 0 0 8 1.75"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ──────────────────────────────────────────────────────────────── surfaces */

/**
 * A panel is for something that is genuinely a separate object: a form, a list,
 * a receipt. Grouping alone is whitespace's job, not a panel's.
 */
export function Panel({ className, children, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cx(
        "rounded-[var(--radius-lg)] bg-[var(--color-surface)] shadow-[var(--shadow-1)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/** Marketing width. Wider than the app, because it has nothing to read closely. */
export function Section({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx("mx-auto w-full max-w-[68rem] px-5 sm:px-8", className)}>{children}</div>;
}

export function Rule({ className }: { className?: string }) {
  return <div role="separator" className={cx("h-px bg-[var(--color-line)]", className)} />;
}

/* ─────────────────────────────────────────────────────────────────── state */

/**
 * A quiet status indicator. Only rendered where the state is genuinely not
 * obvious from the rest of the screen.
 */
export function StatusDot({
  tone = "live",
  children,
}: {
  tone?: "live" | "idle";
  children: ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-2 text-[var(--color-ink-2)] t-label">
      <span
        aria-hidden="true"
        className={cx(
          "relative block size-1.5 rounded-full",
          tone === "live"
            ? "bg-[var(--color-success-dot)] live-dot after:absolute after:inset-0 after:rounded-full after:bg-[var(--color-success-dot)]"
            : "bg-[var(--color-ink-3)]",
        )}
      />
      {children}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────── forms */

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block t-label text-[var(--color-ink)]">
        {label}
      </label>
      {children}
      {/* Error replaces the hint rather than stacking under it. */}
      {error ? (
        <p className="mt-1.5 t-meta text-[var(--color-danger)]">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 t-meta text-[var(--color-ink-3)]">{hint}</p>
      ) : null}
    </div>
  );
}

const FIELD_BASE =
  "w-full rounded-[var(--radius-md)] bg-[var(--color-surface)] px-3.5 t-body " +
  "shadow-[var(--shadow-1)] transition-shadow duration-[var(--dur-fast)] " +
  "focus:outline-none focus:shadow-[0_0_0_1px_var(--color-accent),0_0_0_4px_var(--color-accent-soft)]";

export function Input({
  className,
  invalid,
  ...props
}: ComponentProps<"input"> & { invalid?: boolean }) {
  return (
    <input
      className={cx(
        FIELD_BASE,
        "h-10",
        invalid && "shadow-[0_0_0_1px_var(--color-danger)]",
        className,
      )}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cx(FIELD_BASE, "select-field h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cx(FIELD_BASE, "min-h-24 py-2.5", className)} {...props} />;
}

/* ───────────────────────────────────────────────────────────── empty state */

export function Empty({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="px-6 py-14 text-center">
      <p className="t-h3 text-[var(--color-ink)]">{title}</p>
      <p className="mx-auto mt-1.5 max-w-[38ch] t-body-sm text-[var(--color-ink-2)]">{body}</p>
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cx("skeleton", className)} />;
}

/* ─────────────────────────────────────────────────────────────────── icons

   One 16px grid, 1.5 stroke, round caps. Used for navigation and for actions
   whose meaning a word alone doesn't carry — never as decoration. */

const ICON = {
  width: 16,
  height: 16,
  viewBox: "0 0 16 16",
  fill: "none",
  "aria-hidden": true,
} as const;

const STROKE = {
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function Check({ className }: { className?: string }) {
  return (
    <svg {...ICON} className={cx("shrink-0", className)}>
      <path d="M3 8.5 6.2 11.7 13 4.8" {...STROKE} />
    </svg>
  );
}

export function ChevronRight({ className }: { className?: string }) {
  return (
    <svg {...ICON} className={cx("shrink-0", className)}>
      <path d="M6 3.5 10.5 8 6 12.5" {...STROKE} />
    </svg>
  );
}

export function ArrowLeft({ className }: { className?: string }) {
  return (
    <svg {...ICON} className={cx("shrink-0", className)}>
      <path d="M9.5 3.5 5 8l4.5 4.5M5 8h7" {...STROKE} />
    </svg>
  );
}

export function Copy({ className }: { className?: string }) {
  return (
    <svg {...ICON} className={cx("shrink-0", className)}>
      <rect x="5.75" y="5.75" width="7.5" height="7.5" rx="2" {...STROKE} />
      <path d="M10.25 3.75a2 2 0 0 0-2-2h-3.5a3 3 0 0 0-3 3v3.5a2 2 0 0 0 2 2" {...STROKE} />
    </svg>
  );
}

export function Download({ className }: { className?: string }) {
  return (
    <svg {...ICON} className={cx("shrink-0", className)}>
      <path d="M8 2.5v7.5m0 0L5.25 7.25M8 10l2.75-2.75M2.75 11.5v1a1.5 1.5 0 0 0 1.5 1.5h7.5a1.5 1.5 0 0 0 1.5-1.5v-1" {...STROKE} />
    </svg>
  );
}

export function Printer({ className }: { className?: string }) {
  return (
    <svg {...ICON} className={cx("shrink-0", className)}>
      <path d="M4.5 6V2.5h7V6M4.5 11.5h7V14h-7z" {...STROKE} />
      <path d="M4.5 6h-1A1.5 1.5 0 0 0 2 7.5v2A1.5 1.5 0 0 0 3.5 11h9A1.5 1.5 0 0 0 14 9.5v-2A1.5 1.5 0 0 0 12.5 6h-1" {...STROKE} />
    </svg>
  );
}
