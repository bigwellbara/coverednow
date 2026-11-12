import type { CSSProperties } from "react";

/** Staggers a `fade-up`, `pop-in` or `draw` element; see globals.css. */
export function delay(ms: number): CSSProperties {
  return { "--delay": `${ms}ms` } as CSSProperties;
}

/** A delay for the nth item of a list, capped so long lists don't keep people waiting. */
export function stagger(index: number, stepMs = 60, startMs = 0): CSSProperties {
  return delay(startMs + Math.min(index, 8) * stepMs);
}
