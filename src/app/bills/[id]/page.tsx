import { ArrowLeft, CircleAlert, CircleCheck, Clock } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { getBillService } from "@/modules/billing";
import { BILL_STATUS_LABELS, termLabel } from "@/modules/billing/domain/bill";
import { formatMoney } from "@/modules/billing/domain/money";
import { requireApplicant } from "@/modules/identity/adapters/session";
import { WithdrawBillForm } from "../forms";

export default async function BillPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const owner = await requireApplicant();
  const { id } = await params;
  const bill = await getBillService().findForOwner(owner.id, id);
  if (!bill) notFound();

  const canWithdraw =
    bill.status === "PENDING_SCHOOL" || bill.status === "SCHOOL_CONFIRMED";
  const wasCorrected =
    bill.confirmedCents !== null && bill.confirmedCents !== bill.claimedCents;

  return (
    <>
      <AppHeader name={owner.name} />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <Link
          href="/bills"
          className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-emerald-800"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to bills
        </Link>
        <h1 className="text-2xl font-bold">{bill.billerName}</h1>

        {bill.status === "PENDING_SCHOOL" && (
          <div className="flex gap-3 rounded-xl bg-sky-50 p-4 text-sky-900">
            <Clock className="size-5 shrink-0" aria-hidden />
            <p className="text-sm">
              We&apos;ve asked the school to confirm this bill. There&apos;s nothing
              more you need to do right now.
            </p>
          </div>
        )}
        {bill.status === "SCHOOL_CONFIRMED" && (
          <div className="flex gap-3 rounded-xl bg-emerald-50 p-4 text-emerald-900">
            <CircleCheck className="size-5 shrink-0" aria-hidden />
            <p className="text-sm">
              The school has confirmed this bill.
              {wasCorrected &&
                ` It corrected the amount to ${formatMoney(bill.confirmedCents!)}.`}
            </p>
          </div>
        )}
        {bill.status === "REJECTED" && (
          <div className="flex gap-3 rounded-xl bg-amber-50 p-4 text-amber-900">
            <CircleAlert className="size-5 shrink-0" aria-hidden />
            <p className="text-sm">
              {bill.closedReason ?? "This bill wasn't accepted."} You can submit a
              new bill if something needs correcting.
            </p>
          </div>
        )}

        <section className="card">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-slate-500">Status</dt>
            <dd>{BILL_STATUS_LABELS[bill.status]}</dd>
            <dt className="text-slate-500">Reg number</dt>
            <dd>{bill.regNumber}</dd>
            <dt className="text-slate-500">Term</dt>
            <dd>{termLabel(bill.term)}</dd>
            <dt className="text-slate-500">Amount you entered</dt>
            <dd>{formatMoney(bill.claimedCents)}</dd>
            {bill.confirmedCents !== null && (
              <>
                <dt className="text-slate-500">Amount confirmed</dt>
                <dd className="font-medium">{formatMoney(bill.confirmedCents)}</dd>
              </>
            )}
            <dt className="text-slate-500">Due date</dt>
            <dd>{bill.dueDate.toISOString().slice(0, 10)}</dd>
          </dl>
        </section>

        {canWithdraw && <WithdrawBillForm billId={bill.id} />}
      </main>
    </>
  );
}
