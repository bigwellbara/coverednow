import { CircleCheck, CircleDashed, Plus, School } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { ListRow } from "@/components/list-row";
import { SchoolIcon } from "@/components/school-icon";
import { getBillerService } from "@/modules/billing";
import { BILLER_TYPE_LABELS } from "@/modules/billing/domain/biller";
import { requireAdmin } from "@/modules/identity/adapters/session";
import { AdminHeader } from "../admin-header";

export default async function SchoolsPage() {
  await requireAdmin();
  const schools = await getBillerService().list();
  const verified = schools.filter((school) => school.verified).length;

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <AdminHeader
        title="Schools"
        icon={<School className="size-5" aria-hidden />}
        meta={`${schools.length} in total, ${verified} verified`}
        actions={
          <Link href="/admin/schools/new" className="btn-primary">
            <Plus className="size-4" aria-hidden />
            Add school
          </Link>
        }
      />

      {schools.length === 0 ? (
        <EmptyState
          icon={School}
          title="No schools yet"
          action={
            <Link href="/admin/schools/new" className="btn-primary">
              <Plus className="size-4" aria-hidden />
              Add the first school
            </Link>
          }
        >
          Students can only submit bills for verified schools.
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {schools.map((school, index) => (
            <ListRow
              key={school.id}
              index={index}
              href={`/admin/schools/${school.id}`}
              icon={<SchoolIcon type={school.type} className="size-5" />}
              title={school.name}
              meta={`${BILLER_TYPE_LABELS[school.type]}, ${school.city}`}
              status={
                school.verified ? (
                  <span className="chip bg-brand-50 text-brand-800">
                    <CircleCheck className="size-3.5" aria-hidden />
                    Verified
                  </span>
                ) : (
                  <span className="chip bg-slate-100 text-slate-600">
                    <CircleDashed className="size-3.5" aria-hidden />
                    Not verified
                  </span>
                )
              }
            />
          ))}
        </ul>
      )}
    </main>
  );
}
