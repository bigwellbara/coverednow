import { ChevronRight, CircleCheck, CircleDashed, Plus } from "lucide-react";
import Link from "next/link";
import { getBillerService } from "@/modules/billing";
import { BILLER_TYPE_LABELS } from "@/modules/billing/domain/biller";
import { requireAdmin } from "@/modules/identity/adapters/session";

export default async function SchoolsPage() {
  await requireAdmin();
  const schools = await getBillerService().list();

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Schools</h1>
        <Link href="/admin/schools/new" className="btn-primary">
          <Plus className="size-4" aria-hidden />
          Add school
        </Link>
      </div>

      {schools.length === 0 ? (
        <p className="text-slate-600">No schools yet.</p>
      ) : (
        <ul className="space-y-3">
          {schools.map((school) => (
            <li key={school.id}>
              <Link
                href={`/admin/schools/${school.id}`}
                className="card flex items-center justify-between gap-3 hover:border-emerald-700"
              >
                <span>
                  <span className="block font-medium">{school.name}</span>
                  <span className="block text-sm text-slate-500">
                    {BILLER_TYPE_LABELS[school.type]}, {school.city}
                  </span>
                  {school.verified ? (
                    <span className="mt-1 flex items-center gap-1 text-sm text-emerald-800">
                      <CircleCheck className="size-4" aria-hidden />
                      Verified
                    </span>
                  ) : (
                    <span className="mt-1 flex items-center gap-1 text-sm text-slate-600">
                      <CircleDashed className="size-4" aria-hidden />
                      Not verified
                    </span>
                  )}
                </span>
                <ChevronRight
                  className="size-5 shrink-0 text-slate-400"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
