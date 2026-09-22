"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatedNumber } from "@/components/animated-number";
import { cx } from "@/components/ui";

/**
 * The hero image is the product.
 *
 * A real ticket, advancing on a loop: the counter calls the next number, the
 * queue ahead shrinks, and it finishes on "You're next". That single sequence
 * explains the product better than any diagram, and it is the same component
 * logic a customer actually sees.
 */

const YOUR_NUMBER = 42;
const FIRST = 37;

export function HeroDemo() {
  const [serving, setServing] = useState(FIRST);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Paused for anyone who asked for less motion — the still frame still
    // shows a complete, understandable ticket.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const step = (value: number, delay: number) => {
      timer.current = setTimeout(() => {
        setServing(value);
        if (value < YOUR_NUMBER - 1) step(value + 1, 2100);
        else step(FIRST, 4000); // hold on "You're next", then start over
      }, delay);
    };

    step(FIRST + 1, 2400);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const ahead = Math.max(YOUR_NUMBER - serving - 1, 0);
  const isNext = ahead === 0;

  return (
    <div
      aria-hidden="true"
      className="mx-auto w-full max-w-[19rem] select-none"
    >
      <div className="rounded-[2.25rem] bg-[#16181c] p-2.5 shadow-[0_32px_64px_-20px_rgba(16,19,23,0.35)]">
        <div className="relative overflow-hidden rounded-[1.75rem] bg-[var(--color-surface)]">
          <div className="absolute left-1/2 top-2 h-5 w-20 -translate-x-1/2 rounded-full bg-[#16181c]" />

          <div className="px-7 pb-10 pt-12 text-center">
            <p className="t-h3 text-[var(--color-ink)]">ABC Barbershop</p>

            <p className="mt-8 t-label text-[var(--color-ink-3)]">Your number</p>
            <p
              className={cx(
                "t-num mt-2 text-[4.25rem] transition-colors duration-[var(--dur-slow)]",
                isNext ? "text-[var(--color-accent)]" : "text-[var(--color-ink)]",
              )}
            >
              {YOUR_NUMBER}
            </p>

            <div className="mt-7 min-h-[4rem]">
              {isNext ? (
                <div className="msg-in">
                  <p className="t-h2 text-[var(--color-accent)]">You&rsquo;re next</p>
                  <p className="mt-1 t-body-sm text-[var(--color-ink-2)]">
                    Start heading back now.
                  </p>
                </div>
              ) : (
                <div>
                  <p className="t-h3 text-[var(--color-ink)]">
                    <AnimatedNumber value={ahead} className="tnum" />{" "}
                    {ahead === 1 ? "person ahead" : "people ahead"}
                  </p>
                  <p className="mt-1 t-body-sm text-[var(--color-ink-2)]">
                    about {ahead * 5} min
                  </p>
                </div>
              )}
            </div>

            <p className="mt-6 flex items-baseline justify-center gap-2 t-body-sm text-[var(--color-ink-3)]">
              Currently serving
              <AnimatedNumber
                value={serving}
                prefix="#"
                className="tnum font-medium text-[var(--color-ink-2)]"
              />
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
