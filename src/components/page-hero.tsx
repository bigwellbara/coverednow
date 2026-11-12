import Image, { type StaticImageData } from "next/image";
import type { ReactNode } from "react";
import { delay } from "@/lib/motion";

const WIDTHS = {
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
} as const;

/**
 * The dark green band that opens a page, matching the home page hero. With an
 * `image` it shows a slowly zooming photo behind a green wash; without one it uses
 * a gradient and a dot pattern. Photos are stock, so they're always decorative.
 */
export function PageHero(props: {
  title: ReactNode;
  eyebrow?: ReactNode;
  subtitle?: ReactNode;
  image?: StaticImageData;
  /** Buttons or links beside the title. */
  actions?: ReactNode;
  /** Shown under the title, such as stats or a breadcrumb. */
  children?: ReactNode;
  width?: keyof typeof WIDTHS;
  /** Extra space at the bottom, for a card that overlaps the band. */
  overlap?: boolean;
}) {
  const width = WIDTHS[props.width ?? "6xl"];

  return (
    <section className="relative isolate overflow-hidden bg-brand-950 text-white">
      {props.image ? (
        <>
          <div aria-hidden className="ken-burns absolute inset-0 -z-20">
            <Image
              src={props.image}
              alt=""
              fill
              priority
              placeholder="blur"
              sizes="100vw"
              className="object-cover"
            />
          </div>
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-gradient-to-r from-brand-950/95 via-brand-950/80 to-brand-950/55"
          />
        </>
      ) : (
        <>
          {/* Graphite with a soft light from above, like brushed metal. */}
          <div
            aria-hidden
            className="absolute inset-0 -z-20 bg-gradient-to-b from-brand-700 via-brand-800 to-brand-950"
          />
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_60%_at_50%_-10%,rgb(255_255_255/0.12),transparent)]"
          />
        </>
      )}

      <div
        className={`mx-auto ${width} px-4 pt-12 sm:pt-16 ${props.overlap ? "pb-20 sm:pb-24" : "pb-12 sm:pb-16"}`}
      >
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-5">
          <div className="min-w-0">
            {props.eyebrow && (
              <div className="fade-up mb-2 text-[13px] font-medium tracking-[0.02em] text-gold-300">
                {props.eyebrow}
              </div>
            )}
            <h1
              className="fade-up text-[2rem] leading-[1.1] font-semibold tracking-[-0.03em] sm:text-5xl"
              style={delay(80)}
            >
              {props.title}
            </h1>
            {props.subtitle && (
              <p
                className="fade-up mt-4 max-w-2xl text-[17px] leading-relaxed text-white/70 sm:text-lg"
                style={delay(160)}
              >
                {props.subtitle}
              </p>
            )}
          </div>
          {props.actions && (
            <div className="fade-up flex flex-wrap gap-3" style={delay(240)}>
              {props.actions}
            </div>
          )}
        </div>
        {props.children && (
          <div className="fade-up mt-6" style={delay(300)}>
            {props.children}
          </div>
        )}
      </div>
    </section>
  );
}

/** A primary button that reads well on the dark hero. */
export const heroButton =
  "btn-champagne";
/** A secondary button that reads well on the dark hero. */
export const heroGhostButton =
  "btn-secondary border-white/25 bg-white/[0.08] text-white backdrop-blur hover:border-white/40 hover:bg-white/15";
