"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="inline-flex min-h-11 shrink-0 items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-950"
    >
      <LogOut className="size-4" aria-hidden />
      <span className="sr-only sm:not-sr-only">Sign out</span>
    </button>
  );
}
