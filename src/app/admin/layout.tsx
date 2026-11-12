import { LayoutDashboard } from "lucide-react";
import type { ReactNode } from "react";
import { requireAdmin } from "@/modules/identity/adapters/session";
import { AdminNav } from "./admin-nav";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin();

  return (
    <>
      <div className="relative isolate overflow-hidden bg-gradient-to-br from-brand-800 via-brand-900 to-brand-950">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(rgb(255_255_255/0.07)_1px,transparent_1px)] [background-size:20px_20px]"
        />
        <div className="mx-auto max-w-5xl px-4 pt-5">
          <p className="mb-3 inline-flex items-center gap-2 text-xs font-semibold tracking-wider text-gold-300 uppercase">
            <LayoutDashboard className="size-4" aria-hidden />
            Admin
          </p>
          <AdminNav />
        </div>
      </div>
      {children}
    </>
  );
}
