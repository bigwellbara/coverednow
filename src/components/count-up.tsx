"use client";

import { useEffect, useRef, useState } from "react";
import { formatMoney } from "@/modules/billing/domain/money";

function display(value: number, format: "number" | "money") {
  return format === "money"
    ? formatMoney(value).replace(/\.00$/, "")
    : value.toLocaleString("en-US");
}

/**
 * Counts up to `value` the first time it scrolls into view. The server renders the
 * final figure, and screen readers only ever get that figure, never the ticking one.
 * Money is given in cents and counts in whole dollars.
 */
export function CountUp({
  value,
  format = "number",
  delayMs = 0,
  durationMs = 1600,
}: {
  value: number;
  format?: "number" | "money";
  delayMs?: number;
  durationMs?: number;
}) {
  const [shown, setShown] = useState(value);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const step = format === "money" ? 100 : 1;
    // The real figure stays up until the first frame of the count, so a stalled
    // animation can never leave a zero on screen.

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      observer.disconnect();
      timer = setTimeout(() => {
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min((now - start) / durationMs, 1);
          const eased = 1 - (1 - t) ** 3;
          setShown(t < 1 ? Math.round((value * eased) / step) * step : value);
          if (t < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      }, delayMs);
    });
    observer.observe(element);

    return () => {
      observer.disconnect();
      clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [value, format, delayMs, durationMs]);

  return (
    <>
      <span className="sr-only">{display(value, format)}</span>
      <span ref={ref} aria-hidden className="tabular-nums">
        {display(shown, format)}
      </span>
    </>
  );
}
