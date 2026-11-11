import { ShieldCheck } from "lucide-react";
import Link from "next/link";

export function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  const large = size === "lg";
  return (
    <Link
      href="/"
      className={`inline-flex min-h-11 items-center gap-2 font-bold tracking-tight text-brand-800 ${
        large ? "text-2xl" : "text-xl"
      }`}
    >
      <span className="grid place-items-center rounded-lg bg-brand-700 p-1 text-gold-400">
        <ShieldCheck className={large ? "size-7" : "size-5"} aria-hidden strokeWidth={2.5} />
      </span>
      CoveredNow
    </Link>
  );
}
