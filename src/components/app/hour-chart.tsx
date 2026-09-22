"use client";

import { useState } from "react";
import { hourLabel } from "@/lib/format";
import { cx } from "@/components/ui";

/**
 * Customers joining, by hour of today.
 *
 * One series, so the heading names it and there is no legend to decode. Bars sit
 * on the baseline with 4px rounded tops and a 2px gap; the axis labels only the
 * ends and the middle, because at this size a label per hour is clutter rather
 * than precision. Exact values live in the table below.
 */
export function HourChart({
  data,
  label = "Customers",
}: {
  data: Array<{ hour: number; count: number }>;
  label?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);

  if (!data.length) {
    return (
      <p className="py-8 t-body-sm text-[var(--color-ink-2)]">
        Nobody has joined the queue today yet.
      </p>
    );
  }

  // An hour with nobody in it is information, so the gaps get filled.
  const first = Math.min(...data.map((d) => d.hour));
  const last = Math.max(...data.map((d) => d.hour));
  const byHour = new Map(data.map((d) => [d.hour, d.count]));
  const series = Array.from({ length: last - first + 1 }, (_, i) => ({
    hour: first + i,
    count: byHour.get(first + i) ?? 0,
  }));

  const peak = Math.max(...series.map((d) => d.count), 1);
  const total = series.reduce((sum, d) => sum + d.count, 0);
  const busiest = series.reduce((a, b) => (b.count > a.count ? b : a));

  return (
    <figure className="m-0">
      <figcaption className="sr-only">
        {label} joining by hour today — {total} in total, busiest at{" "}
        {hourLabel(busiest.hour)}.
      </figcaption>

      <div className="relative" onMouseLeave={() => setHover(null)}>
        {hover !== null && (
          <div
            className="pointer-events-none absolute -top-1 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-[var(--radius-sm)] bg-[var(--color-ink)] px-2.5 py-1.5 text-white shadow-[var(--shadow-2)]"
            style={{ left: `${((hover + 0.5) / series.length) * 100}%` }}
          >
            <span className="tnum t-meta font-semibold">{series[hover].count}</span>
            <span className="t-meta text-white/60">
              {" "}
              at {hourLabel(series[hover].hour)}
            </span>
          </div>
        )}

        <div className="flex h-36 items-end gap-0.5">
          {series.map((d, i) => (
            <button
              key={d.hour}
              type="button"
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              aria-label={`${hourLabel(d.hour)}: ${d.count} ${label.toLowerCase()}`}
              // Hit target is the whole column, not just the drawn bar.
              className="flex h-full flex-1 items-end rounded-[4px]"
            >
              <span
                aria-hidden="true"
                className={cx(
                  "block w-full rounded-t-[4px] transition-colors duration-[var(--dur-fast)]",
                  hover === i
                    ? "bg-[var(--color-accent)]"
                    : d.count === 0
                      ? "bg-[var(--color-line)]"
                      : "bg-[var(--color-accent)]/70",
                )}
                style={{ height: d.count === 0 ? "2px" : `${Math.max((d.count / peak) * 100, 4)}%` }}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2.5 flex t-meta text-[var(--color-ink-3)]">
        {series.map((d, i) => {
          const show =
            i === 0 ||
            i === series.length - 1 ||
            (series.length > 5 && i === Math.floor(series.length / 2));
          return (
            <span key={d.hour} className="flex-1 text-center">
              {show ? hourLabel(d.hour) : ""}
            </span>
          );
        })}
      </div>

      <details className="group mt-4">
        <summary className="cursor-pointer list-none t-meta text-[var(--color-ink-3)] transition-colors duration-[var(--dur-fast)] hover:text-[var(--color-ink-2)]">
          <span className="group-open:hidden">Show the numbers</span>
          <span className="hidden group-open:inline">Hide the numbers</span>
        </summary>
        <table className="mt-3 w-full t-body-sm">
          <caption className="sr-only">{label} by hour</caption>
          <thead>
            <tr className="text-left text-[var(--color-ink-3)]">
              <th scope="col" className="pb-1.5 font-medium">
                Hour
              </th>
              <th scope="col" className="pb-1.5 text-right font-medium">
                {label}
              </th>
            </tr>
          </thead>
          <tbody>
            {series.map((d) => (
              <tr key={d.hour} className="border-t border-[var(--color-line)]">
                <th scope="row" className="py-1.5 text-left font-normal text-[var(--color-ink-2)]">
                  {hourLabel(d.hour)}
                </th>
                <td className="tnum py-1.5 text-right text-[var(--color-ink)]">{d.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
