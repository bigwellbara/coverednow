"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const LINKS = [
  { href: "/browse", label: "Browse bills" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/map", label: "Map" },
  { href: "/partners", label: "For partners" },
];

const isCurrent = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);

/** The centred links on wide screens, with the current section shown darker. */
export function DesktopNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
      {LINKS.map((link) => {
        const current = isCurrent(pathname, link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={current ? "page" : undefined}
            className={`inline-flex h-8 items-center rounded-full px-3.5 text-[13px] tracking-[-0.01em] transition-colors ${
              current
                ? "bg-black/[0.05] font-medium text-slate-900"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** A menu button for phones and tablets that opens every link in a panel. */
export function MobileMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Closes after navigating, and on Escape.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen((value) => !value)}
        className="grid size-9 place-items-center rounded-full text-slate-700 transition-colors hover:bg-black/[0.05]"
      >
        {open ? <X className="size-[18px]" aria-hidden /> : <Menu className="size-[18px]" aria-hidden />}
        <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
      </button>
      {open && (
        <nav
          id="mobile-menu"
          aria-label="Main"
          className="fade-up absolute inset-x-0 top-full border-b border-black/[0.06] bg-white/95 px-4 pt-2 pb-6 shadow-lg backdrop-blur-xl [--delay:0ms] [animation-duration:0.35s]"
        >
          <ul className="mx-auto max-w-6xl">
            {LINKS.map((link) => (
              <li key={link.href} className="border-b border-black/[0.05] last:border-0">
                <Link
                  href={link.href}
                  aria-current={isCurrent(pathname, link.href) ? "page" : undefined}
                  className="flex min-h-12 items-center text-[17px] font-medium tracking-[-0.01em] text-slate-900 aria-[current=page]:text-gold-700"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
