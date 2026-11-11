"use client";

import { GraduationCap, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";

export function AppHeader({ name }: { name: string }) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <GraduationCap className="size-5 text-emerald-700" aria-hidden />
          CoveredNow
        </Link>
        <div className="flex min-w-0 items-center gap-3 text-sm">
          <Link
            href="/account"
            className="inline-flex min-h-11 min-w-0 items-center text-slate-600 underline-offset-2 hover:underline"
          >
            <span className="truncate">{name}</span>
          </Link>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="inline-flex min-h-11 shrink-0 items-center gap-1 font-medium text-slate-700 hover:text-slate-950"
          >
            <LogOut className="size-4" aria-hidden />
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
