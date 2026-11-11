import Link from "next/link";
import type { ReactNode } from "react";
import { requireAdmin } from "@/modules/identity/adapters/session";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin();
  const linkClass =
    "inline-flex min-h-11 items-center font-medium text-slate-700 hover:text-brand-800";

  return (
    <>
      <nav aria-label="Admin" className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl gap-5 overflow-x-auto px-4 text-sm">
          <Link href="/admin/verifications" className={linkClass}>
            Verifications
          </Link>
          <Link href="/admin/schools" className={linkClass}>
            Schools
          </Link>
          <Link href="/admin/bills" className={linkClass}>
            Bills
          </Link>
          <Link href="/admin/donations" className={linkClass}>
            Donations
          </Link>
        </div>
      </nav>
      {children}
    </>
  );
}
