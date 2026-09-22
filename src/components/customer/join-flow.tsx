"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { joinQueue } from "@/app/q/[slug]/actions";
import { ArrowLeft, Button, Input, Rule } from "@/components/ui";
import { toast } from "@/components/toast";
import { duration, money } from "@/lib/format";
import { rememberTicket, recallTicket } from "@/lib/ticket-store";
import type { BusinessPage } from "@/lib/types";

/**
 * Pick a service, confirm, done. Two screens, three taps, no account.
 *
 * Name and phone sit behind a disclosure because neither is required to hold a
 * place — putting them on the front screen would imply they are.
 */
export function JoinFlow({ page }: { page: BusinessPage }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [details, setDetails] = useState(false);
  const [pending, startTransition] = useTransition();
  const [existing, setExisting] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setExisting(recallTicket(page.business.slug));
    setChecked(true);
  }, [page.business.slug]);

  const service = page.services.find((s) => s.id === selected) ?? null;
  const closed = !page.location.is_open || !page.queue.is_open;

  function submit() {
    if (!service) return;
    startTransition(async () => {
      const result = await joinQueue({
        slug: page.business.slug,
        serviceId: service.id,
        name: name.trim() || undefined,
        phone: phone.trim() || undefined,
      });

      if (!result.ok) {
        toast(result.error, "error");
        return;
      }
      rememberTicket(page.business.slug, result.token);
      router.push(`/t/${result.token}?welcome=1`);
    });
  }

  // Hold the layout still for the one frame it takes to read localStorage,
  // rather than flashing the service list and replacing it.
  if (!checked) return <div className="h-64" aria-hidden="true" />;

  if (existing) {
    return (
      <div className="text-center">
        <p className="t-body text-[var(--color-ink-2)]">You&rsquo;re already in this queue.</p>
        <Button size="lg" className="mt-5 w-full" onClick={() => router.push(`/t/${existing}`)}>
          See my number
        </Button>
        <button
          type="button"
          onClick={() => setExisting(null)}
          className="mt-4 rounded-[var(--radius-sm)] px-2 py-1 t-body-sm text-[var(--color-ink-3)] hover:text-[var(--color-ink-2)]"
        >
          Join again for someone else
        </button>
      </div>
    );
  }

  if (closed) {
    return (
      <div className="rounded-[var(--radius-lg)] bg-[var(--color-sunken)] px-6 py-10 text-center">
        <p className="t-h3 text-[var(--color-ink)]">The queue is closed right now</p>
        <p className="mx-auto mt-1.5 max-w-[28ch] t-body-sm text-[var(--color-ink-2)]">
          Come back when {page.business.name} reopens.
        </p>
      </div>
    );
  }

  /* ─────────────────────────────────────────────────────── choose */
  if (!service) {
    return (
      <div>
        <h2 className="t-h3 text-[var(--color-ink)]">What are you here for?</h2>

        {page.services.length === 0 ? (
          <p className="mt-4 t-body text-[var(--color-ink-2)]">
            This business hasn&rsquo;t added any services yet.
          </p>
        ) : (
          <ul className="mt-4 overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-surface)] shadow-[var(--shadow-1)]">
            {page.services.map((s, i) => (
              <li key={s.id}>
                {i > 0 && <Rule />}
                <button
                  type="button"
                  onClick={() => setSelected(s.id)}
                  className="flex min-h-16 w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors duration-[var(--dur-fast)] hover:bg-[var(--color-sunken)] active:bg-[var(--color-hover)]"
                >
                  <span className="min-w-0">
                    <span className="block truncate t-body text-[var(--color-ink)]">{s.name}</span>
                    <span className="mt-0.5 block t-body-sm text-[var(--color-ink-3)]">
                      about {duration(s.duration_min)}
                    </span>
                  </span>
                  {s.price_cents > 0 && (
                    <span className="tnum shrink-0 t-body text-[var(--color-ink-2)]">
                      {money(s.price_cents)}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  /* ─────────────────────────────────────────────────────── confirm */
  return (
    <div className="msg-in">
      <button
        type="button"
        onClick={() => setSelected(null)}
        className="-ml-2 inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-2 py-1 t-body-sm text-[var(--color-ink-2)] transition-colors duration-[var(--dur-fast)] hover:text-[var(--color-ink)]"
      >
        <ArrowLeft />
        {service.name}
      </button>

      <div className="mt-8 text-center">
        <p className="t-label text-[var(--color-ink-3)]">Estimated wait</p>
        <p className="t-num mt-2 text-[3.5rem] text-[var(--color-ink)]">
          {page.queue.eta_minutes > 0 ? page.queue.eta_minutes : 0}
          <span className="ml-1.5 text-[1.125rem] font-normal tracking-normal text-[var(--color-ink-3)]">
            min
          </span>
        </p>
        <p className="mt-2 t-body-sm text-[var(--color-ink-2)]">
          {page.queue.waiting === 0
            ? "Nobody ahead of you"
            : `${page.queue.waiting} ${page.queue.waiting === 1 ? "person" : "people"} ahead`}
        </p>
      </div>

      <div className="mt-8">
        {details ? (
          <div className="msg-in space-y-3">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              autoComplete="name"
              aria-label="Your name"
            />
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Mobile number"
              inputMode="tel"
              autoComplete="tel"
              aria-label="Mobile number"
            />
            <p className="t-meta text-[var(--color-ink-3)]">
              Only used to call you by name and text you when you&rsquo;re close.
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setDetails(true)}
            className="rounded-[var(--radius-sm)] px-2 py-1 t-body-sm text-[var(--color-accent)] underline-offset-4 hover:underline"
          >
            Add your name or number
            <span className="text-[var(--color-ink-3)]"> — optional</span>
          </button>
        )}
      </div>

      <Button size="lg" className="mt-8 w-full" loading={pending} onClick={submit}>
        Join queue
      </Button>
    </div>
  );
}
