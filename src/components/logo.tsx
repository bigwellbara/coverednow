import { ShieldCheck } from "lucide-react";
import Link from "next/link";

/** A graphite tile with a champagne shield, and the name in a quiet semibold. */
export function Logo({
  size = "md",
  tone = "dark",
}: {
  size?: "md" | "lg";
  /** "light" for use on the dark graphite bands. */
  tone?: "dark" | "light";
}) {
  const large = size === "lg";
  return (
    <Link
      href="/"
      className={`inline-flex min-h-9 items-center gap-2 font-semibold tracking-[-0.02em] ${
        tone === "light" ? "text-white" : "text-slate-900"
      } ${large ? "text-xl" : "text-[17px]"}`}
    >
      <span
        className={`grid place-items-center rounded-[7px] ${
          tone === "light" ? "metal-silver text-brand-900" : "metal-graphite text-gold-300"
        } ${large ? "size-8" : "size-6"}`}
      >
        <ShieldCheck className={large ? "size-5" : "size-3.5"} aria-hidden strokeWidth={2.5} />
      </span>
      <span>
        Covered<span className={tone === "light" ? "text-gold-300" : "text-gold-600"}>Now</span>
      </span>
    </Link>
  );
}
