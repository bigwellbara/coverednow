import { GraduationCap, PartyPopper, UserCheck, UsersRound } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ListRow } from "@/components/list-row";
import { getVerificationService } from "@/modules/identity";
import { requireAdmin } from "@/modules/identity/adapters/session";
import { AdminHeader } from "../admin-header";

export default async function VerificationQueuePage() {
  await requireAdmin();
  const queue = await getVerificationService().listAwaitingReview();

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <AdminHeader
        title="Verification queue"
        icon={<UserCheck className="size-5" aria-hidden />}
        meta={queue.length === 1 ? "1 waiting for review" : `${queue.length} waiting for review`}
      />
      {queue.length === 0 ? (
        <EmptyState icon={PartyPopper} title="All caught up">
          Nothing is waiting for review.
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {queue.map((item, index) => (
            <ListRow
              key={item.id}
              index={index}
              href={`/admin/verifications/${item.id}`}
              icon={
                item.applicantRole === "GUARDIAN" ? (
                  <UsersRound className="size-5" aria-hidden />
                ) : (
                  <GraduationCap className="size-5" aria-hidden />
                )
              }
              title={item.applicantName}
              meta={`${item.applicantRole === "GUARDIAN" ? "Guardian" : "Student"}, submitted ${item.submittedAt?.toISOString().slice(0, 10)}`}
            />
          ))}
        </ul>
      )}
    </main>
  );
}
