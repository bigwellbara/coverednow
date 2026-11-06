import Link from "next/link";
import type { ReactNode } from "react";
import { AppHeader } from "@/components/app-header";
import { requireAdmin } from "@/modules/identity/adapters/session";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();
  const linkClass =
    "inline-flex min-h-11 items-center font-medium text-slate-700 hover:text-emerald-800";

  return (
    <>
      <AppHeader name={admin.name} />
      <nav aria-label="Admin" className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl gap-5 px-4 text-sm">
          <Link href="/admin/verifications" className={linkClass}>
            Verifications
          </Link>
          <Link href="/admin/schools" className={linkClass}>
            Schools
          </Link>
        </div>
      </nav>
      {children}
    </>
  );
}
