import { MarketingFooter, MarketingNav } from "@/components/marketing/chrome";
import { LinkButton, Rule, Section } from "@/components/ui";

export const metadata = {
  title: "Features",
  description: "Everything QyoFlow does, and a few things it deliberately doesn't.",
};

const GROUPS = [
  {
    title: "For the people waiting",
    items: [
      ["No account, ever", "A queue number isn't worth a password. They scan and they're in."],
      ["A live position", "Their page updates as the line moves. No refreshing, no guessing."],
      ["An honest estimate", "Waits are calculated from how long your services actually take."],
      ["A nudge when they're close", "Browser notifications, or SMS on paid plans."],
      ["The freedom to leave", "One tap gives their place back, which beats a no-show."],
    ],
  },
  {
    title: "For the counter",
    items: [
      ["One dominant action", "Call next. Everything else is deliberately quieter."],
      [
        "Counter mode",
        "A screen built for the phone or tablet at the till, not a shrunken dashboard.",
      ],
      ["Real states", "Completed, skipped and no-show are three different things here."],
      ["Open and close", "Stop new joins without disturbing the people already in line."],
      ["Live everywhere", "Every open screen updates at the same moment."],
    ],
  },
  {
    title: "For the owner",
    items: [
      ["A permanent QR code", "Print it once. It survives renames, new services and new staff."],
      ["Your own page", "A link for your Facebook page, your receipts and your posters."],
      ["Honest numbers", "Average wait, average service time, and when you're actually busy."],
      ["Service breakdown", "What people come in for, ranked."],
      ["Staff accounts", "Give the counter access to the counter, and nothing else."],
    ],
  },
];

const OMITTED = [
  ["No ticket printer", "The paper queue is the thing we're replacing."],
  [
    "No customer database to manage",
    "Names and numbers are optional, and kept to the day's queue.",
  ],
  ["No app to install", "For you or for them. It's a web page."],
];

export default function FeaturesPage() {
  return (
    <>
      <MarketingNav />

      <main>
        <Section className="pt-14 pb-10 md:pt-16">
          <h1 className="t-display max-w-[18ch] text-[var(--color-ink)]">
            Everything it does, and what it leaves out.
          </h1>
          <p className="mt-6 max-w-[50ch] text-[1.0625rem] leading-[1.6] tracking-[-0.008em] text-[var(--color-ink-2)]">
            QyoFlow is a queue, done properly — not a point-of-sale system with a
            waiting list bolted onto it.
          </p>
        </Section>

        {GROUPS.map((group) => (
          <Section key={group.title} className="py-12">
            <h2 className="t-h1 text-[var(--color-ink)]">{group.title}</h2>
            <dl className="mt-6">
              {group.items.map(([term, detail], i) => (
                <div key={term}>
                  {i > 0 && <Rule />}
                  <div className="grid gap-1 py-5 md:grid-cols-[minmax(0,20rem)_1fr] md:gap-10">
                    <dt className="t-body font-medium text-[var(--color-ink)]">{term}</dt>
                    <dd className="max-w-[60ch] t-body text-[var(--color-ink-2)]">{detail}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </Section>
        ))}

        <Section className="py-10">
          <h2 className="t-h1 text-[var(--color-ink)]">Things we&rsquo;re not building</h2>
          <div className="mt-8 grid gap-8 sm:grid-cols-3">
            {OMITTED.map(([title, body]) => (
              <div key={title}>
                <h3 className="t-h3 text-[var(--color-ink)]">{title}</h3>
                <p className="mt-2 t-body text-[var(--color-ink-2)]">{body}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section className="py-12">
          <Rule />
          <div className="py-14">
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
