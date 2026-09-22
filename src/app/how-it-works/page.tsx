import { MarketingFooter, MarketingNav } from "@/components/marketing/chrome";
import { HeroDemo } from "@/components/marketing/hero-demo";
import { LinkButton, Rule, Section } from "@/components/ui";

export const metadata = {
  title: "How it works",
  description: "From a code on your door to a queue your customers can walk away from.",
};

const CUSTOMER_STEPS = [
  [
    "They scan the code at your door",
    "It opens a page, not an app store. Nothing to download and no account to create.",
  ],
  [
    "They choose what they came for",
    "Your services, your prices, and roughly how long each one takes.",
  ],
  ["They get a number", "It's theirs. They can sit in the car, get a coffee, or run an errand."],
  [
    "Their phone brings them back",
    "The page follows the line on its own, and can notify them when their turn is close.",
  ],
];

const COUNTER = [
  [
    "Call next",
    "The next number appears on every waiting phone at the same moment. No shouting a name across a room.",
  ],
  [
    "Complete, skip or no-show",
    "One tap each. The difference matters later, when you want to know why people left.",
  ],
  [
    "Close the queue",
    "One switch stops new customers joining. Everyone already in line keeps their place.",
  ],
];

export default function HowItWorksPage() {
  return (
    <>
      <MarketingNav />

      <main>
        <Section className="pt-14 pb-10 md:pt-16">
          <h1 className="t-display max-w-[14ch] text-[var(--color-ink)]">
            A line nobody has to stand in.
          </h1>
          <p className="mt-6 max-w-[52ch] text-[1.0625rem] leading-[1.6] tracking-[-0.008em] text-[var(--color-ink-2)]">
            QyoFlow replaces the physical queue with a number on a phone. Your
            counter works the way it does now — the waiting just stops happening in
            your doorway.
          </p>
        </Section>

        {/* The customer's side, with the real ticket alongside it. */}
        <Section className="py-10">
          <div className="grid items-start gap-16 md:grid-cols-[1fr_auto] md:gap-20">
            <div>
              <p className="t-eyebrow text-[var(--color-accent)]">What the customer does</p>
              <h2 className="mt-3 t-h1 text-[var(--color-ink)]">Scan, tap, walk away.</h2>

              <ol className="mt-8">
                {CUSTOMER_STEPS.map(([title, body], i) => (
                  <li key={title}>
                    {i > 0 && <Rule />}
                    <div className="flex gap-5 py-5">
                      <span className="tnum w-5 shrink-0 t-body-sm text-[var(--color-ink-3)]">
                        {i + 1}
                      </span>
                      <div>
                        <p className="t-body font-medium text-[var(--color-ink)]">{title}</p>
                        <p className="mt-1 max-w-[46ch] t-body text-[var(--color-ink-2)]">
                          {body}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="mx-auto md:sticky md:top-24">
              <HeroDemo />
            </div>
          </div>
        </Section>

        <Section className="py-12">
          <p className="t-eyebrow text-[var(--color-accent)]">What you do</p>
          <h2 className="mt-3 t-h1 max-w-[22ch] text-[var(--color-ink)]">
            Tap one button when you&rsquo;re ready for the next person.
          </h2>

          <div className="mt-10 grid gap-10 sm:grid-cols-3">
            {COUNTER.map(([title, body]) => (
              <div key={title}>
                <h3 className="t-h3 text-[var(--color-ink)]">{title}</h3>
                <p className="mt-2 t-body text-[var(--color-ink-2)]">{body}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section className="py-12">
          <Rule />
          <div className="grid gap-8 py-14 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <h2 className="t-h1 max-w-[22ch] text-[var(--color-ink)]">
                Setting it up takes about two minutes.
              </h2>
              <p className="mt-4 max-w-[52ch] t-body text-[var(--color-ink-2)]">
                Name your business, add what people queue for, print the code. No
                hardware, no ticket printer, nothing to install on a computer.
              </p>
            </div>
            <LinkButton href="/signup" size="lg">
              Start free
            </LinkButton>
          </div>
        </Section>
      </main>

      <MarketingFooter />
    </>
  );
}
