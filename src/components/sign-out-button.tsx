"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      title="Sign out"
      className="grid size-8 shrink-0 place-items-center rounded-full text-slate-500 transition-colors hover:bg-black/[0.05] hover:text-slate-900"
    >
      <LogOut className="size-4" aria-hidden />
      <span className="sr-only">Sign out</span>
    </button>
  );
}
