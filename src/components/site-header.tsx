import { UserRound } from "lucide-react";
import Link from "next/link";
import { homePathFor } from "@/modules/identity/domain/account";
import { currentUser } from "@/modules/identity/adapters/session";
import { Logo } from "./logo";
import { SignOutButton } from "./sign-out-button";

const navLink =
  "inline-flex min-h-11 items-center whitespace-nowrap font-medium text-slate-700 hover:text-brand-800";

const HOME_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  STUDENT: "My bills",
  GUARDIAN: "My bills",
  DONOR: "My giving",
};

export async function SiteHeader() {
  const user = await currentUser();

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-6 text-sm md:flex">
          <Link href="/browse" className={navLink}>
            Browse bills
          </Link>
          <Link href="/#how-it-works" className={navLink}>
            How it works
          </Link>
          <Link href="/#for-schools" className={navLink}>
            For schools
          </Link>
        </nav>
        <div className="flex min-w-0 items-center gap-3 text-sm">
          <Link href="/browse" className={`${navLink} md:hidden`}>
            Browse
          </Link>
          {user ? (
            <>
              <Link
                href={user.role === "STUDENT" || user.role === "GUARDIAN" ? "/bills" : homePathFor(user.role)}
                className={`${navLink} text-brand-800`}
              >
                {HOME_LABELS[user.role] ?? "My account"}
              </Link>
              <Link
                href="/account"
                className="inline-flex min-h-11 min-w-0 items-center gap-1 text-slate-600 hover:text-slate-950"
              >
                <UserRound className="size-4 shrink-0" aria-hidden />
                <span className="hidden max-w-32 truncate lg:inline">{user.name}</span>
                <span className="sr-only lg:hidden">Your account</span>
              </Link>
              <SignOutButton />
            </>
          ) : (
            <Link href="/sign-in" className="btn-gold min-h-10 py-1.5">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 text-sm text-slate-600 sm:grid-cols-[1fr_auto]">
        <div className="space-y-2">
          <Logo />
          <p>Fees covered. Paid straight to the school.</p>
          <p className="text-xs text-slate-500">
            A FirmwareNerds product. Donations are gifts paid to the school, never to the
            student.
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-col gap-1">
          <Link href="/browse" className="inline-flex min-h-9 items-center hover:text-brand-800">
            Browse bills
          </Link>
          <Link href="/#how-it-works" className="inline-flex min-h-9 items-center hover:text-brand-800">
            How it works
          </Link>
          <Link href="/sign-up" className="inline-flex min-h-9 items-center hover:text-brand-800">
            List a bill
          </Link>
        </nav>
      </div>
    </footer>
  );
}
