import { ArrowRight, Compass, Home } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import heroClassroom from "@/assets/home/hero-classroom.jpg";
import { delay } from "@/lib/motion";

export const metadata = { title: "Page not found - CoveredNow" };

export default function NotFound() {
  return (
    <main className="relative isolate flex min-h-[70vh] items-center overflow-hidden bg-brand-950 text-white">
      <div aria-hidden className="ken-burns absolute inset-0 -z-20">
        <Image
          src={heroClassroom}
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
        className="absolute inset-0 -z-10 bg-gradient-to-r from-brand-950/95 via-brand-950/85 to-brand-900/60"
      />

      <div className="mx-auto w-full max-w-6xl px-4 py-20">
        <span className="pop-in grid size-16 place-items-center rounded-2xl bg-white/10 text-gold-400 ring-1 ring-white/20 backdrop-blur">
          <Compass className="size-8" aria-hidden />
        </span>
        <p
          className="fade-up mt-6 text-sm font-semibold tracking-wider text-gold-300 uppercase"
          style={delay(100)}
        >
          Error 404
        </p>
        <h1
          className="fade-up mt-2 max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl"
          style={delay(180)}
        >
          This page has skipped class.
        </h1>
        <p className="fade-up mt-4 max-w-lg text-lg text-brand-50/90" style={delay(260)}>
          We couldn&apos;t find what you were looking for. It may have moved, or the bill
          may no longer be listed.
        </p>
        <div className="fade-up mt-8 flex flex-wrap gap-3" style={delay(340)}>
          <Link
            href="/browse"
            className="group btn-champagne px-6"
          >
            Browse bills
            <ArrowRight
              className="size-4 transition-transform group-hover:translate-x-1"
              aria-hidden
            />
          </Link>
          <Link
            href="/"
            className="btn-secondary border-white/40 bg-white/10 px-6 text-white backdrop-blur hover:bg-white/20"
          >
            <Home className="size-4" aria-hidden />
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
