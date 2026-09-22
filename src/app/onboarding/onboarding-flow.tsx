"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { checkSlug, createBusiness } from "./actions";
import { ArrowLeft, Button, Field, Input, LinkButton, Rule, cx } from "@/components/ui";
import { QrPoster } from "@/components/qr-poster";
import { slugify, SITE_URL } from "@/lib/format";

type Draft = { name: string; price: string; minutes: string };

const STEPS = ["Business", "Services", "Launch"] as const;

const SUGGESTED: Draft[] = [
  { name: "Haircut", price: "150", minutes: "20" },
  { name: "Haircut + wash", price: "250", minutes: "35" },
];

/**
 * Two questions and a QR code. Each step asks for one thing, because an owner
 * setting this up is standing behind a counter, not sitting at a desk.
 */
export function OnboardingFlow({ defaultName }: { defaultName: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(defaultName);
  const [slug, setSlug] = useState(slugify(defaultName));
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugFree, setSlugFree] = useState<boolean | null>(null);
  const [services, setServices] = useState<Draft[]>(SUGGESTED);
  const [error, setError] = useState<string | null>(null);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!slugTouched) setSlug(slugify(name));
  }, [name, slugTouched]);

  useEffect(() => {
    if (slug.length < 3) {
      setSlugFree(null);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      const { available } = await checkSlug(slug);
      if (!cancelled) setSlugFree(available);
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [slug]);

  const canContinue =
    step === 0
      ? name.trim().length >= 2 && slug.length >= 3 && slugFree !== false
      : services.some((s) => s.name.trim());

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await createBusiness({
        name: name.trim(),
        slug,
        location: "Main",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Manila",
        services: services
          .filter((s) => s.name.trim())
          .map((s) => ({
            name: s.name.trim(),
            price_cents: Math.round(Number(s.price || 0) * 100),
            duration_min: Math.max(1, Number(s.minutes || 15)),
          })),
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCreatedSlug(result.slug);
      setStep(2);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto w-full max-w-[30rem]">
      <Steps current={step} />

      <div key={step} className="msg-in mt-10">
        {step === 0 && (
          <section>
            <h1 className="t-h1 text-[var(--color-ink)]">What&rsquo;s your business called?</h1>
            <p className="mt-2 t-body text-[var(--color-ink-2)]">
              This is the name customers see when they scan.
            </p>

            <div className="mt-8 space-y-5">
              <Field label="Business name" htmlFor="biz-name">
                <Input
                  id="biz-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ABC Barbershop"
                  autoFocus
                />
              </Field>

              <Field
                label="Your queue address"
                htmlFor="biz-slug"
                error={slugFree === false ? "That address is taken. Try another." : undefined}
                hint={
                  slug.length < 3
                    ? "At least three characters."
                    : slugFree === true
                      ? "Available."
                      : "Printed on your QR code — it can't be changed later."
                }
              >
                <div
                  className={cx(
                    "flex h-10 items-center rounded-[var(--radius-md)] bg-[var(--color-surface)] pl-3.5 pr-1",
                    "shadow-[var(--shadow-1)] transition-shadow duration-[var(--dur-fast)]",
                    "focus-within:shadow-[0_0_0_1px_var(--color-accent),0_0_0_4px_var(--color-accent-soft)]",
                    slugFree === false && "shadow-[0_0_0_1px_var(--color-danger)]",
                  )}
                >
                  <span className="t-body text-[var(--color-ink-3)]">
                    {SITE_URL.replace(/^https?:\/\//, "")}/q/
                  </span>
                  <input
                    id="biz-slug"
                    value={slug}
                    onChange={(e) => {
                      setSlugTouched(true);
                      setSlug(slugify(e.target.value));
                    }}
                    className="h-full min-w-0 flex-1 bg-transparent px-1 t-body outline-none"
                    placeholder="abcbarbers"
                  />
                </div>
              </Field>
            </div>
          </section>
        )}

        {step === 1 && (
          <section>
            <h1 className="t-h1 text-[var(--color-ink)]">What do people line up for?</h1>
            <p className="mt-2 t-body text-[var(--color-ink-2)]">
              The times you set here are how waits get estimated. All of it is
              editable later.
            </p>

            <div className="mt-8 overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-surface)] shadow-[var(--shadow-1)]">
              {services.map((service, i) => (
                <div key={i}>
                  {i > 0 && <Rule />}
                  <ServiceRow
                    value={service}
                    index={i}
                    onChange={(next) =>
                      setServices((prev) => prev.map((s, j) => (j === i ? next : s)))
                    }
                    onRemove={
                      services.length > 1
                        ? () => setServices((prev) => prev.filter((_, j) => j !== i))
                        : undefined
                    }
                  />
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() =>
                setServices((prev) => [...prev, { name: "", price: "", minutes: "15" }])
              }
              className="mt-3 rounded-[var(--radius-sm)] px-2 py-1 t-body-sm text-[var(--color-accent)] underline-offset-4 hover:underline"
            >
              Add another service
            </button>
          </section>
        )}

        {step === 2 && createdSlug && (
          <section className="text-center">
            <h1 className="t-h1 text-[var(--color-ink)]">You&rsquo;re ready.</h1>
            <p className="mx-auto mt-2 max-w-[34ch] t-body text-[var(--color-ink-2)]">
              Put this at your entrance. Anyone who scans it joins your queue.
            </p>

            <div className="mt-9">
              <QrPoster
                slug={createdSlug}
                businessName={name.trim()}
                url={`${SITE_URL}/q/${createdSlug}`}
              />
            </div>

            <div className="mt-9 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <LinkButton href="/dashboard" size="lg">
                Open my dashboard
              </LinkButton>
              <LinkButton href={`/q/${createdSlug}`} variant="secondary" size="lg">
                See the customer page
              </LinkButton>
            </div>
          </section>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-6 t-body-sm text-[var(--color-danger)]">
          {error}
        </p>
      )}

      {step < 2 && (
        <div className="mt-10 flex items-center justify-between gap-4">
          <Button
            variant="tertiary"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className={cx(step === 0 && "invisible")}
          >
            <ArrowLeft />
            Back
          </Button>

          <Button
            size="lg"
            disabled={!canContinue}
            loading={pending}
            onClick={() => (step === 0 ? setStep(1) : submit())}
          >
            {step === 0 ? "Continue" : "Create my queue"}
          </Button>
        </div>
      )}
    </div>
  );
}

function ServiceRow({
  value,
  index,
  onChange,
  onRemove,
}: {
  value: Draft;
  index: number;
  onChange: (next: Draft) => void;
  onRemove?: () => void;
}) {
  return (
    <div className="group flex items-center gap-1.5 px-2 py-1.5">
      <input
        value={value.name}
        onChange={(e) => onChange({ ...value, name: e.target.value })}
        placeholder="Service name"
        aria-label={`Service ${index + 1} name`}
        className="h-10 min-w-0 flex-1 rounded-[var(--radius-sm)] bg-transparent px-2 t-body outline-none focus:bg-[var(--color-sunken)]"
      />

      <div className="flex h-9 shrink-0 items-center rounded-[var(--radius-sm)] bg-[var(--color-sunken)] px-2">
        <span className="t-body-sm text-[var(--color-ink-3)]">₱</span>
        <input
          value={value.price}
          onChange={(e) => onChange({ ...value, price: e.target.value.replace(/\D/g, "") })}
          placeholder="0"
          inputMode="numeric"
          aria-label={`Service ${index + 1} price in pesos`}
          className="tnum w-14 bg-transparent px-1 t-body-sm outline-none"
        />
      </div>

      <div className="flex h-9 shrink-0 items-center rounded-[var(--radius-sm)] bg-[var(--color-sunken)] px-2">
        <input
          value={value.minutes}
          onChange={(e) => onChange({ ...value, minutes: e.target.value.replace(/\D/g, "") })}
          placeholder="15"
          inputMode="numeric"
          aria-label={`Service ${index + 1} duration in minutes`}
          className="tnum w-8 bg-transparent text-right t-body-sm outline-none"
        />
        <span className="ml-1 t-meta text-[var(--color-ink-3)]">min</span>
      </div>

      <button
        type="button"
        onClick={onRemove}
        disabled={!onRemove}
        aria-label={`Remove service ${index + 1}`}
        className="size-9 shrink-0 rounded-[var(--radius-sm)] text-[var(--color-ink-3)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--color-sunken)] hover:text-[var(--color-danger)] disabled:invisible"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="mx-auto">
          <path d="M5 5l6 6M11 5l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

function Steps({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2.5" aria-label="Setup progress">
      {STEPS.map((label, i) => (
        <li key={label} className="flex items-center gap-2.5">
          <span
            aria-current={i === current ? "step" : undefined}
            className={cx(
              "t-body-sm transition-colors duration-[var(--dur-base)]",
              i === current
                ? "font-medium text-[var(--color-ink)]"
                : i < current
                  ? "text-[var(--color-ink-2)]"
                  : "text-[var(--color-ink-3)]",
            )}
          >
            {label}
          </span>
          {i < STEPS.length - 1 && (
            <span aria-hidden="true" className="h-px w-6 bg-[var(--color-line-2)]" />
          )}
        </li>
      ))}
    </ol>
  );
}
