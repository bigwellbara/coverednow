import { ArrowLeft, FileText } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBillService } from "@/modules/billing";
import { BILL_STATUS_LABELS, termLabel } from "@/modules/billing/domain/bill";
import { formatMoney } from "@/modules/billing/domain/money";
import { requireAdmin } from "@/modules/identity/adapters/session";
import { RejectBillForm, ResendLinksForm } from "../forms";

export default async function AdminBillPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const bill = await getBillService().findForAdmin(id);
  if (!bill) notFound();

  const isWaiting = bill.status === "PENDING_SCHOOL";
  const canReject = isWaiting || bill.status === "SCHOOL_CONFIRMED";

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <Link
        href="/admin/bills"
        className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-emerald-800"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to bills
      </Link>
      <h1 className="text-2xl font-bold">{bill.billerName}</h1>

      <section className="card space-y-3">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-slate-500">Status</dt>
          <dd>{BILL_STATUS_LABELS[bill.status]}</dd>
          <dt className="text-slate-500">Student</dt>
          <dd>
            {bill.student
              ? `${bill.student.firstName} ${bill.student.lastName}, ${bill.student.level}`
              : "Unknown"}
          </dd>
          <dt className="text-slate-500">Reg number</dt>
          <dd>{bill.regNumber}</dd>
          <dt className="text-slate-500">Term</dt>
          <dd>{termLabel(bill.term)}</dd>
          <dt className="text-slate-500">Amount claimed</dt>
          <dd>{formatMoney(bill.claimedCents)}</dd>
          <dt className="text-slate-500">Amount confirmed</dt>
          <dd>
            {bill.confirmedCents === null
              ? "Not yet"
              : formatMoney(bill.confirmedCents)}
          </dd>
          <dt className="text-slate-500">Due date</dt>
          <dd>{bill.dueDate.toISOString().slice(0, 10)}</dd>
          {bill.closedReason && (
            <>
              <dt className="text-slate-500">Reason</dt>
              <dd>{bill.closedReason}</dd>
            </>
          )}
        </dl>
        <a
          href={`/admin/bills/${bill.id}/statement`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center gap-2 font-medium text-emerald-800 underline"
        >
          <FileText className="size-4" aria-hidden />
          Fee statement
        </a>
        <p className="text-sm text-slate-500">Each view is recorded.</p>
      </section>

      <section className="card space-y-3" aria-labelledby="links-heading">
        <h2 id="links-heading" className="font-semibold">
          School confirmation links
        </h2>
        {bill.confirmations.length === 0 ? (
          <p className="text-sm text-slate-600">None sent yet.</p>
        ) : (
          <ul className="divide-y divide-slate-200 text-sm">
            {bill.confirmations.map((confirmation) => (
              <li key={confirmation.id} className="py-2">
                <p className="font-medium">{confirmation.contactName}</p>
                <p className="text-slate-600">
                  {confirmation.respondedAt
                    ? `Answered ${confirmation.status.toLowerCase()} on ${confirmation.respondedAt.toISOString().slice(0, 10)}`
                    : confirmation.sentAt
                      ? `Sent ${confirmation.sentAt.toISOString().slice(0, 10)}, expires ${confirmation.expiresAt.toISOString().slice(0, 10)}`
                      : "Not delivered"}
                </p>
              </li>
            ))}
          </ul>
        )}
        {isWaiting && <ResendLinksForm billId={bill.id} />}
      </section>

      {canReject && (
        <section className="card">
          <RejectBillForm billId={bill.id} />
        </section>
      )}
    </main>
  );
}
