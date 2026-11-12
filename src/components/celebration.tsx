import type { CSSProperties } from "react";
import { delay } from "@/lib/motion";

const COLORS = [
  "bg-gold-400",
  "bg-gold-500",
  "bg-brand-300",
  "bg-brand-100",
  "bg-white",
  "bg-gold-200",
];
const SHAPES = ["h-3 w-1.5", "size-2", "h-1.5 w-3", "size-1.5 rounded-full"];

/**
 * A single burst of confetti that falls once and fades. The pieces are placed by
 * a fixed pattern rather than at random, so server and browser always agree.
 * Hidden entirely for visitors who ask for reduced motion.
 */
export function Confetti({ count = 40 }: { count?: number }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className={`confetti absolute -top-4 rounded-[2px] ${COLORS[i % COLORS.length]} ${
            SHAPES[i % SHAPES.length]
          }`}
          style={
            {
              left: `${(i * 37 + 11) % 100}%`,
              "--delay": `${(i * 173) % 1400}ms`,
              "--duration": `${2800 + ((i * 311) % 1800)}ms`,
              "--spin": `${360 + ((i * 97) % 540)}deg`,
              "--fall": `${22 + ((i * 7) % 12)}rem`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

/** A check mark in a ring that draws itself in, for a finished payment. */
export function DrawnCheck({ className = "size-20" }: { className?: string }) {
  return (
    <svg viewBox="0 0 52 52" className={className} aria-hidden>
      <circle cx="26" cy="26" r="25" className="fill-gold-500/15" />
      <circle
        cx="26"
        cy="26"
        r="23"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        pathLength={1}
        className="draw"
        style={delay(150)}
      />
      <path
        d="M15 27l7.5 7.5L37 19"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        className="draw"
        style={delay(650)}
      />
    </svg>
  );
}
