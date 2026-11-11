import {
  CircleAlert,
  CircleCheck,
  GraduationCap,
  Hourglass,
  Info,
  Share2,
  Undo2,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDate, siteUrl, whatsAppShareUrl } from "@/lib/format";
import { getBillService } from "@/modules/billing";
import { termLabel } from "@/modules/billing/domain/bill";
import { formatMoney } from "@/modules/billing/domain/money";
import { requireUser } from "@/modules/identity/adapters/session";
import { getPaymentService } from "@/modules/payments";
import { PrintButton, RefreshWhilePending } from "./client";

export const metadata: Metadata = { title: "Your donation - CoveredNow", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function DonationPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const payments = getPaymentService();

  let donation = await payments.findForDonor(user.id, id);
  if (!donation) notFound();
  // Asks the gateway directly, in case its message to our webhook is late.
  if (donation.status === "INITIATED") {
    donation = (await payments.refresh(donation.reference)) ?? donation;
  }

  const bill = await getBillService().findPublic(donation.billId);
  const billName = bill
    ? `${termLabel(bill.term)} fees at ${bill.schoolName}`
    : "a student's school fees";
  const shareText = `I helped cover school fees on CoveredNow. Every dollar goes straight to the school, never to the student. ${siteUrl("/browse")}`;

  return (
    <main className="mx-auto max-w-xl space-y-6 px-4 py-10">
      {donation.status === "INITIATED" && (
        <section className="card space-y-3 text-center">
          <RefreshWhilePending />
          <Hourglass className="mx-auto size-10 text-gold-600" aria-hidden />
          <h1 className="text-2xl font-bold">Waiting for your payment</h1>
          <p className="text-slate-600" aria-live="polite">
            We&apos;re checking with Paynow. This page updates by itself. If you
            closed the payment page, nothing has been charged.
          </p>
          {bill && (
            <Link href={`/browse/${bill.id}/give`} className="btn-secondary">
              Start again
            </Link>
          )}
        </section>
      )}

      {donation.status === "FAILED" && (
        <section className="card space-y-3 text-center">
          <CircleAlert className="mx-auto size-10 text-amber-600" aria-hidden />
          <h1 className="text-2xl font-bold">Your payment didn&apos;t go through</h1>
          <p className="text-slate-600">Nothing was charged. You can try again.</p>
          {bill && (
            <Link href={`/browse/${bill.id}/give`} className="btn-primary">
              Try again
            </Link>
          )}
        </section>
      )}

      {donation.status === "REFUNDED" && (
        <section className="card space-y-3 text-center">
          <Undo2 className="mx-auto size-10 text-slate-600" aria-hidden />
          <h1 className="text-2xl font-bold">This donation was refunded</h1>
          <p className="text-slate-600">
            The money has been returned to you. If you didn&apos;t expect this, please
            contact support with reference {donation.reference}.
          </p>
        </section>
      )}

      {donation.status === "SETTLED" && (
        <>
          <section className="space-y-3 text-center">
            <CircleCheck className="mx-auto size-14 text-brand-700" aria-hidden />
            <h1 className="text-3xl font-bold text-brand-900">
              You covered {formatMoney(donation.amountCents)} of {bill ? termLabel(bill.term) : "school"} fees!
            </h1>
            <p className="text-slate-600">
              Thank you. Your gift is confirmed and will be paid to the school, to help a
              student stay in school this term.
            </p>
          </section>

          <section className="card space-y-4 border-gold-300 bg-gold-50/60" aria-label="Impact">
            <div className="flex gap-3">
              <GraduationCap className="size-5 shrink-0 text-brand-700" aria-hidden />
              <div className="text-sm">
                <p className="font-semibold">{billName}</p>
                {bill && (
                  <p className="text-slate-600">
                    For {bill.studentInitials}, {bill.studentLevel}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {bill && (
                <Link href={`/browse/${bill.id}`} className="btn-primary">
                  Track this bill
                </Link>
              )}
              <a
                href={whatsAppShareUrl(shareText)}
                target="_blank"
                rel="noreferrer"
                className="btn-gold"
              >
                <Share2 className="size-4" aria-hidden />
                Share on WhatsApp
              </a>
            </div>
          </section>

          <p className="flex gap-2 text-sm text-slate-600">
            <Info className="size-4 shrink-0" aria-hidden />
            Your gift counts toward leaderboards once the school confirms it received
            the payment.
          </p>
        </>
      )}

      <section className="card" aria-labelledby="receipt-heading">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="receipt-heading" className="font-semibold">
            Receipt
          </h2>
          {donation.status === "SETTLED" && <PrintButton />}
        </div>
        <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-sm">
          <dt className="text-slate-600">Reference</dt>
          <dd className="font-mono">{donation.reference}</dd>
          <dt className="text-slate-600">Date</dt>
          <dd>{formatDate(donation.settledAt ?? donation.createdAt)}</dd>
          <dt className="text-slate-600">For</dt>
          <dd className="text-right">{billName}</dd>
          <dt className="text-slate-600">To the school</dt>
          <dd>{formatMoney(donation.amountCents)}</dd>
          <dt className="text-slate-600">Tip for CoveredNow</dt>
          <dd>{formatMoney(donation.tipCents)}</dd>
          <dt className="text-slate-600">Payment processing</dt>
          <dd>{formatMoney(donation.feeCents)}</dd>
          <dt className="border-t border-slate-200 pt-2 font-semibold">Total</dt>
          <dd className="border-t border-slate-200 pt-2 font-semibold">
            {formatMoney(donation.totalCents)}
          </dd>
          <dt className="text-slate-600">Shown as</dt>
          <dd>{donation.displayName ?? "Anonymous"}</dd>
        </dl>
      </section>

      <p className="text-center text-sm print:hidden">
        <Link href="/giving" className="font-medium text-brand-800 underline">
          See all your giving
        </Link>
      </p>
    </main>
  );
}
