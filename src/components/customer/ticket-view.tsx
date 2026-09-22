"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { AnimatedNumber } from "@/components/animated-number";
import { Button, cx } from "@/components/ui";
import { toast } from "@/components/toast";
import { Mark } from "@/components/marketing/chrome";
import { leaveQueue } from "@/app/q/[slug]/actions";
import { useTicket, useTurnAlert } from "@/lib/use-ticket";
import { forgetTicket, rememberTicket } from "@/lib/ticket-store";
import { duration } from "@/lib/format";
import type { Ticket } from "@/lib/types";

const CLOSED = ["COMPLETED", "CANCELLED", "NO_SHOW", "SKIPPED"];

/**
 * The live ticket.
 *
 * One number, at a size nothing else competes with, and three facts underneath:
 * how many people are ahead, how long that is, and who is being served now.
 * There is no "LIVE" badge — the number moving is the proof.
 */
export function TicketView({
  token,
  initial,
  welcome,
}: {
  token: string;
  initial: Ticket;
  welcome: boolean;
}) {
  const router = useRouter();
  const { ticket } = useTicket(token, initial);
  const { permission, enable } = useTurnAlert(ticket);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [pending, startTransition] = useTransition();

  const t = ticket ?? initial;
  const { status } = t.entry;
  const called = status === "CALLED" || status === "SERVING";
  const isNext = !called && t.ahead === 0;

  useEffect(() => {
    rememberTicket(t.business.slug, token);
  }, [t.business.slug, token]);

  function onLeave() {
    startTransition(async () => {
      const result = await leaveQueue(token);
      if (!result.ok) {
        toast(result.error ?? "We couldn't do that. Please try again.", "error");
        return;
      }
      forgetTicket(t.business.slug);
      router.replace(`/q/${t.business.slug}`);
    });
  }

  if (CLOSED.includes(status)) {
    return (
      <Shell business={t.business.name}>
        <div className="text-center">
          <p className="t-num text-[3.5rem] text-[var(--color-ink-3)]">{t.entry.number}</p>
          <p className="mt-7 t-h2 text-[var(--color-ink)]">
            {status === "COMPLETED"
              ? "Thanks for coming in."
              : status === "CANCELLED"
                ? "You left the queue."
                : status === "SKIPPED"
                  ? "Your number was skipped."
                  : "You were marked as a no-show."}
          </p>
          <p className="mx-auto mt-2 max-w-[32ch] t-body text-[var(--color-ink-2)]">
            {status === "COMPLETED"
              ? `See you next time at ${t.business.name}.`
              : "You can join the queue again whenever you like."}
          </p>
          <Link
            href={`/q/${t.business.slug}`}
            className="mt-8 inline-block t-label text-[var(--color-accent)] underline-offset-4 hover:underline"
          >
            Join the queue again
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell business={t.business.name} location={t.location.name}>
      <div className="text-center">
        {/* ────────────────────────────────────────────── the number */}
        <p className="t-label text-[var(--color-ink-3)]">
          {welcome ? "You're in. Your number is" : "Your number"}
        </p>
        <p
          className={cx(
            "t-num mt-2.5 text-[clamp(5rem,26vw,7rem)] transition-colors duration-[var(--dur-slow)]",
            called ? "text-[var(--color-accent)]" : "text-[var(--color-ink)]",
          )}
          style={welcome ? { animation: "msg-in 400ms var(--ease)" } : undefined}
        >
          {t.entry.number}
        </p>

        {/* ────────────────────────────────────────────── what it means */}
        <div className="mt-9 min-h-[5.5rem]">
          {called ? (
            <div key="called" className="msg-in">
              <p className="t-h1 text-[var(--color-accent)]">It&rsquo;s your turn</p>
              <p className="mt-2 t-body text-[var(--color-ink-2)]">
                Please go to the counter at {t.location.name}.
              </p>
            </div>
          ) : isNext ? (
            <div key="next" className="msg-in">
              <p className="t-h1 text-[var(--color-ink)]">You&rsquo;re next</p>
              <p className="mt-2 t-body text-[var(--color-ink-2)]">Start heading back now.</p>
            </div>
          ) : (
            <div key="waiting">
              <p className="t-h2 text-[var(--color-ink)]">
                <AnimatedNumber value={t.ahead} className="tnum" />{" "}
                {t.ahead === 1 ? "person ahead" : "people ahead"}
              </p>
              <p className="mt-1.5 t-body text-[var(--color-ink-2)]">
                about {duration(t.eta_minutes)}
              </p>
            </div>
          )}
        </div>

        {/* ────────────────────────────────────────────── context

            Only shown once someone has actually been called. Before that,
            "Currently serving —" is a dash where a fact should be. */}
        {t.queue.serving_number !== null && (
          <p className="mt-2 flex items-baseline justify-center gap-2 t-body-sm text-[var(--color-ink-3)]">
            Currently serving
            <AnimatedNumber
              value={t.queue.serving_number}
              prefix="#"
              className="tnum font-medium text-[var(--color-ink-2)]"
            />
          </p>
        )}

        {!called && (
          <p className="mx-auto mt-8 max-w-[30ch] t-body-sm text-[var(--color-ink-3)]">
            You can leave and come back — this page keeps itself up to date.
          </p>
        )}

        {/* ────────────────────────────────────────────── actions */}
        <div className="mt-10">
          {permission !== "granted" && !called && (
            <Button variant="secondary" size="lg" className="w-full" onClick={enable}>
              Notify me when I&rsquo;m close
            </Button>
          )}

          {confirmLeave ? (
            <div className="msg-in mt-4 rounded-[var(--radius-lg)] bg-[var(--color-sunken)] p-5">
              <p className="t-body-sm text-[var(--color-ink)]">
                Leave the queue? You&rsquo;ll give up number {t.entry.number}.
              </p>
              <div className="mt-4 flex justify-center gap-2">
                <Button variant="tertiary" onClick={() => setConfirmLeave(false)}>
                  Stay in line
                </Button>
                <Button variant="danger" loading={pending} onClick={onLeave}>
                  Leave queue
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmLeave(true)}
              className="mt-5 rounded-[var(--radius-sm)] px-2 py-1 t-body-sm text-[var(--color-ink-3)] transition-colors duration-[var(--dur-fast)] hover:text-[var(--color-ink-2)]"
            >
              Leave queue
            </button>
          )}
        </div>
      </div>
    </Shell>
  );
}

function Shell({
  business,
  location,
  children,
}: {
  business: string;
  location?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-[var(--color-surface)]">
      <header className="px-5 pt-10 text-center sm:pt-14">
        <p className="t-h3 text-[var(--color-ink)]">{business}</p>
        {location && <p className="mt-0.5 t-body-sm text-[var(--color-ink-3)]">{location}</p>}
      </header>

      <main className="mx-auto flex w-full max-w-[24rem] flex-1 flex-col justify-center px-5 py-10">
        {children}
      </main>

      <footer className="pb-8 text-center">
        <span className="inline-flex items-center gap-1.5 opacity-45">
          <Mark size={12} />
          <span className="t-meta text-[var(--color-ink-3)]">QyoFlow</span>
        </span>
      </footer>
    </div>
  );
}
