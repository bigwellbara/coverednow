import { ArrowLeft, CircleAlert, CircleCheck, Clock, ExternalLink, Share2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBillService } from "@/modules/billing";
import { BILL_STATUS_LABELS, termLabel } from "@/modules/billing/domain/bill";
import { formatMoney } from "@/modules/billing/domain/money";
import { ProgressBar } from "@/components/progress-bar";
import { siteUrl, whatsAppShareUrl } from "@/lib/format";
import {
  isPublicStatus,
  percentFunded,
} from "@/modules/billing/domain/public-bill";
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
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <Link
          href="/bills"
          className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-brand-800"
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
          <div className="flex gap-3 rounded-xl bg-brand-50 p-4 text-brand-900">
            <CircleCheck className="size-5 shrink-0" aria-hidden />
            <p className="text-sm">
              The school has confirmed this bill.
              {wasCorrected &&
                ` It corrected the amount to ${formatMoney(bill.confirmedCents!)}.`}
            </p>
          </div>
        )}
        {isPublicStatus(bill.status) && bill.confirmedCents !== null && (
          <section className="card space-y-3" aria-labelledby="funding-heading">
            <h2 id="funding-heading" className="font-semibold">
              Funding
            </h2>
            <ProgressBar
              percent={percentFunded({
                confirmedCents: bill.confirmedCents,
                raisedCents: bill.raisedCents,
              })}
              label="Funded so far"
            />
            <p className="text-sm text-slate-700">
              {formatMoney(bill.raisedCents)} raised of {formatMoney(bill.confirmedCents)}.
              Donations are paid to the school, not to you.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href={`/browse/${bill.id}`} className="btn-secondary">
                <ExternalLink className="size-4" aria-hidden />
                See your public page
              </Link>
              <a
                href={whatsAppShareUrl(
                  `My school fees are listed on CoveredNow, confirmed by my school. Any help is paid straight to the school: ${siteUrl(`/browse/${bill.id}`)}`,
                )}
                target="_blank"
                rel="noreferrer"
                className="btn-gold"
              >
                <Share2 className="size-4" aria-hidden />
                Share on WhatsApp
              </a>
            </div>
            <p className="text-xs text-slate-500">
              Your public page shows only your initials, level and school.
            </p>
          </section>
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
