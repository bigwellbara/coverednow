import { ArrowLeft, FileText } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { getVerificationService } from "@/modules/identity";
import { requireAdmin } from "@/modules/identity/adapters/session";
import { DOCUMENT_KIND_LABELS } from "@/modules/identity/domain/verification";
import { ReviewForms } from "./review-forms";

export default async function VerificationReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdmin();
  const { id } = await params;
  const item = await getVerificationService().findForReview(id);
  if (!item) notFound();

  const awaitingDecision = item.status === "PENDING" && item.submittedAt !== null;

  return (
    <>
      <AppHeader name={admin.name} />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <Link
          href="/admin/verifications"
          className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-emerald-800"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to queue
        </Link>
        <h1 className="text-2xl font-bold">{item.applicantName}</h1>

        <section className="card">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-slate-500">Applying as</dt>
            <dd>{item.applicantRole === "GUARDIAN" ? "Guardian" : "Student"}</dd>
            <dt className="text-slate-500">Phone</dt>
            <dd>{item.applicantPhone}</dd>
            <dt className="text-slate-500">Student</dt>
            <dd>
              {item.student
                ? `${item.student.firstName} ${item.student.lastName}, ${item.student.level}`
                : "Not provided"}
            </dd>
            <dt className="text-slate-500">Status</dt>
            <dd>{item.status}</dd>
          </dl>
        </section>

        <section className="card space-y-3" aria-labelledby="documents-heading">
          <h2 id="documents-heading" className="font-semibold">
            Documents
          </h2>
          <p className="text-sm text-slate-500">Each view is recorded.</p>
          <ul className="space-y-2">
            {item.documents.map((document) => (
              <li key={document.id}>
                <a
                  href={`/admin/verifications/documents/${document.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center gap-2 font-medium text-emerald-800 underline"
                >
                  <FileText className="size-4" aria-hidden />
                  {DOCUMENT_KIND_LABELS[document.kind]}
                </a>
              </li>
            ))}
          </ul>
        </section>

        {awaitingDecision ? (
          <section className="card">
            <ReviewForms id={item.id} />
          </section>
        ) : (
          <p className="text-slate-600">
            This application is not awaiting a decision.
          </p>
        )}
      </main>
    </>
  );
}
