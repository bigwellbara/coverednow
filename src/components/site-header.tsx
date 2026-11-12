import { Heart, Landmark, Lock, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { homePathFor } from "@/modules/identity/domain/account";
import { currentUser } from "@/modules/identity/adapters/session";
import { InstallApp } from "./install-app";
import { DesktopNav, MobileMenu } from "./main-nav";
import { Logo } from "./logo";
import { SignOutButton } from "./sign-out-button";

const HOME_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  STUDENT: "My bills",
  GUARDIAN: "My bills",
  DONOR: "My giving",
};

/** A slim, frosted bar in the style of apple.com: logo, centred links, account. */
export async function SiteHeader() {
  const user = await currentUser();
  const initials = user?.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");

  return (
    <header className="sticky top-0 z-30 border-b border-black/[0.06] bg-white/72 backdrop-blur-xl backdrop-saturate-[1.8] print:hidden">
      <div className="relative mx-auto grid h-12 max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-4">
        <div className="flex items-center">
          <Logo />
        </div>
        <DesktopNav />
        <div className="flex min-w-0 items-center justify-end gap-1.5 text-[13px]">
          {user ? (
            <>
              <Link
                href={user.role === "STUDENT" || user.role === "GUARDIAN" ? "/bills" : homePathFor(user.role)}
                className="hidden h-8 items-center rounded-full px-3 font-medium text-slate-900 transition-colors hover:bg-black/[0.05] sm:inline-flex"
              >
                {HOME_LABELS[user.role] ?? "My account"}
              </Link>
              <Link
                href="/account"
                title={user.name}
                className="metal-silver grid size-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold text-slate-800 transition hover:brightness-95"
              >
                {initials || <UserRound className="size-4" aria-hidden />}
                <span className="sr-only">Your account</span>
              </Link>
              <SignOutButton />
            </>
          ) : (
            <Link
              href="/sign-in"
              className="inline-flex h-8 items-center rounded-full bg-slate-900 px-4 font-medium text-white transition-colors hover:bg-slate-700"
            >
              Sign in
            </Link>
          )}
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}

const footerLink =
  "inline-flex min-h-8 items-center text-[13px] text-white/55 transition-colors hover:text-white";

const PROMISES = [
  { icon: ShieldCheck, text: "Every bill confirmed by the school" },
  { icon: Landmark, text: "Paid to the school, never the student" },
  { icon: Lock, text: "Secure payments through Paynow" },
];

export function SiteFooter() {
  return (
    <footer className="relative isolate mt-16 overflow-hidden bg-brand-900 text-[13px] text-white/55 print:hidden">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <ul className="grid gap-4 border-b border-white/10 pb-10 sm:grid-cols-3">
          {PROMISES.map((promise) => (
            <li key={promise.text} className="flex items-center gap-3 text-sm text-white/85">
              <span className="grid size-9 shrink-0 place-items-center rounded-full border border-white/10 text-gold-300">
                <promise.icon className="size-[18px]" strokeWidth={1.75} aria-hidden />
              </span>
              {promise.text}
            </li>
          ))}
        </ul>

        <div className="grid gap-8 pt-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div className="space-y-3">
            <Logo tone="light" />
            <p className="max-w-xs">Fees covered. Paid straight to the school.</p>
            <p className="inline-flex items-center gap-1.5 text-xs text-white/40">
              Made with <Heart className="size-3.5 fill-gold-400 text-gold-400" aria-label="love" />{" "}
              for students in Zimbabwe
            </p>
            <InstallApp />
          </div>
          <nav aria-label="Footer" className="flex flex-col gap-1">
            <p className="mb-1 text-[13px] font-semibold text-white/90">Give</p>
            <Link href="/browse" className={footerLink}>
              Browse bills
            </Link>
            <Link href="/map" className={footerLink}>
              Map of schools
            </Link>
            <Link href="/#how-it-works" className={footerLink}>
              How it works
            </Link>
            <Link href="/partners" className={footerLink}>
              Companies and CSR
            </Link>
          </nav>
          <nav aria-label="Together" className="flex flex-col gap-1">
            <p className="mb-1 text-[13px] font-semibold text-white/90">Together</p>
            <Link href="/campaigns" className={footerLink}>
              Campaigns
            </Link>
            <Link href="/campaigns/new" className={footerLink}>
              Start a campaign
            </Link>
            <Link href="/leaderboard" className={footerLink}>
              Leaderboard
            </Link>
          </nav>
          <nav aria-label="Get help" className="flex flex-col gap-1">
            <p className="mb-1 text-[13px] font-semibold text-white/90">Get help</p>
            <Link href="/sign-up" className={footerLink}>
              List a bill
            </Link>
            <Link href="/#for-schools" className={footerLink}>
              For schools
            </Link>
          </nav>
        </div>

        <p className="mt-10 border-t border-white/10 pt-6 text-xs text-brand-100/50">
          A FirmwareNerds product. Donations are gifts paid to the school, never to the
          student.
        </p>
      </div>
    </footer>
  );
}
