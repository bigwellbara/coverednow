import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { getVerificationService } from "@/modules/identity";
import { requireAdmin } from "@/modules/identity/adapters/session";

export default async function VerificationQueuePage() {
  await requireAdmin();
  const queue = await getVerificationService().listAwaitingReview();

  return (
    <>
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <h1 className="text-2xl font-bold">Verification queue</h1>
        {queue.length === 0 ? (
          <p className="text-slate-600">Nothing is waiting for review.</p>
        ) : (
          <ul className="space-y-3">
            {queue.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/admin/verifications/${item.id}`}
                  className="card flex items-center justify-between gap-3 hover:border-emerald-700"
                >
                  <span>
                    <span className="block font-medium">{item.applicantName}</span>
                    <span className="block text-sm text-slate-500">
                      {item.applicantRole === "GUARDIAN" ? "Guardian" : "Student"},
                      submitted {item.submittedAt?.toISOString().slice(0, 10)}
                    </span>
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
    </>
  );
}
