import {
  CircleAlert,
  GraduationCap,
  Hourglass,
  Info,
  Share2,
  Undo2,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import graduate from "@/assets/home/graduate.jpg";
import { Confetti, DrawnCheck } from "@/components/celebration";
import { formatDate, siteUrl, whatsAppShareUrl } from "@/lib/format";
import { delay } from "@/lib/motion";
import { getBillService } from "@/modules/billing";
import { termLabel } from "@/modules/billing/domain/bill";
import { formatMoney } from "@/modules/billing/domain/money";
import { requireUser } from "@/modules/identity/adapters/session";
import { getPaymentService } from "@/modules/payments";
import { PrintButton, RefreshWhilePending } from "./client";

export const metadata: Metadata = { title: "Your donation - CoveredNow", robots: { index: false } };
export const dynamic = "force-dynamic";

/** A centred card for a payment that hasn't (or won't) come through. */
function StatusCard(props: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="fade-up card space-y-3 py-10 text-center">
      {props.icon}
      <h1 className="text-2xl font-semibold text-slate-900">{props.title}</h1>
      <div className="mx-auto max-w-sm text-slate-600">{props.children}</div>
      {props.action && <div className="pt-2">{props.action}</div>}
    </section>
  );
}

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
  // Links to the gift's public page, whose preview card shows the gift and the bill.
  const shareText = `I just helped cover school fees on CoveredNow. Every dollar goes straight to the school, never to the student. ${siteUrl(`/gifts/${donation.id}`)}`;
  const settled = donation.status === "SETTLED";

  return (
    <main>
      {settled && (
        <section className="relative isolate overflow-hidden bg-brand-950 text-white print:hidden">
          <div aria-hidden className="ken-burns absolute inset-0 -z-20">
            <Image
              src={graduate}
              alt=""
              fill
              priority
              placeholder="blur"
              sizes="100vw"
              className="object-cover object-top"
            />
          </div>
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-950/80 via-brand-950/85 to-brand-950"
          />
          <Confetti />
          <div className="mx-auto max-w-xl px-4 pt-14 pb-24 text-center sm:pt-20">
            <span className="pop-in inline-block text-gold-400">
              <DrawnCheck className="size-24" />
            </span>
            <h1
              className="fade-up mt-4 text-3xl font-semibold tracking-tight sm:text-4xl"
              style={delay(500)}
            >
              You covered{" "}
              <span className="text-gold-400">{formatMoney(donation.amountCents)}</span> of{" "}
              {bill ? termLabel(bill.term) : "school"} fees!
            </h1>
            <p className="fade-up mt-3 text-brand-50/90" style={delay(650)}>
              Thank you. Your gift is confirmed and will be paid to the school, to help a
              student stay in school this term.
            </p>
          </div>
        </section>
      )}

      <div
        className={`mx-auto max-w-xl space-y-6 px-4 ${settled ? "-mt-14 print:mt-0" : "py-10"}`}
      >
        {donation.status === "INITIATED" && (
          <StatusCard
            title="Waiting for your payment"
            icon={
              <span className="relative mx-auto grid size-16 place-items-center">
                <span className="ping-soft absolute inset-0 rounded-full bg-gold-200" />
                <span className="relative grid size-16 place-items-center rounded-full bg-gold-100 text-gold-700">
                  <Hourglass className="size-8 motion-safe:animate-pulse" aria-hidden />
                </span>
              </span>
            }
            action={
              bill && (
                <Link href={`/browse/${bill.id}/give`} className="btn-secondary">
                  Start again
                </Link>
              )
            }
          >
            <RefreshWhilePending />
            <p aria-live="polite">
              We&apos;re checking with Paynow. This page updates by itself. If you
              closed the payment page, nothing has been charged.
            </p>
          </StatusCard>
        )}

        {donation.status === "FAILED" && (
          <StatusCard
            title="Your payment didn't go through"
            icon={
              <span className="pop-in mx-auto grid size-16 place-items-center rounded-full bg-amber-50 text-amber-600">
                <CircleAlert className="size-8" aria-hidden />
              </span>
            }
            action={
              bill && (
                <Link href={`/browse/${bill.id}/give`} className="btn-primary">
                  Try again
                </Link>
              )
            }
          >
            Nothing was charged. You can try again.
          </StatusCard>
        )}

        {donation.status === "REFUNDED" && (
          <StatusCard
            title="This donation was refunded"
            icon={
              <span className="pop-in mx-auto grid size-16 place-items-center rounded-full bg-slate-100 text-slate-600">
                <Undo2 className="size-8" aria-hidden />
              </span>
            }
          >
            The money has been returned to you. If you didn&apos;t expect this, please
            contact support with reference {donation.reference}.
          </StatusCard>
        )}

        {settled && (
          <>
            {/* The hero is hidden on paper, so the printout gets its own heading. */}
            <p aria-hidden className="hidden text-2xl font-semibold print:block">
              CoveredNow donation receipt
            </p>
            <section
              className="fade-up card relative space-y-4 border-gold-300 shadow-xl shadow-brand-950/10 print:hidden"
              style={delay(800)}
              aria-label="Impact"
            >
              <div className="flex gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-700 text-gold-300">
                  <GraduationCap className="size-6" aria-hidden />
                </span>
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

            <p className="flex gap-2 text-sm text-slate-600 print:hidden">
              <Info className="size-4 shrink-0" aria-hidden />
              {donation.displayName ? (
                <>
                  Your gift counts toward the{" "}
                  <Link href="/leaderboard" className="font-medium text-brand-800 underline">
                    leaderboard
                  </Link>{" "}
                  as &ldquo;{donation.displayName}&rdquo;. If it is ever refunded, it comes off.
                </>
              ) : (
                "You gave anonymously, so your gift stays off the leaderboard."
              )}
            </p>
          </>
        )}

        {/* Styled like a paper receipt, with punched notches at the tear line. */}
        <section
          className="fade-up card relative overflow-hidden p-0"
          style={delay(settled ? 950 : 150)}
          aria-labelledby="receipt-heading"
        >
          <div className="h-1.5 bg-gradient-to-r from-gold-600 via-gold-400 to-gold-300" />
          <div className="p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 id="receipt-heading" className="font-semibold">
                Receipt
              </h2>
              {settled && <PrintButton />}
            </div>
            <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-sm">
              <dt className="text-slate-600">Reference</dt>
              <dd className="font-mono">{donation.reference}</dd>
              <dt className="text-slate-600">Date</dt>
              <dd>{formatDate(donation.settledAt ?? donation.createdAt)}</dd>
              <dt className="text-slate-600">For</dt>
              <dd className="text-right">{billName}</dd>
              <dt className="text-slate-600">Shown as</dt>
              <dd>{donation.displayName ?? "Anonymous"}</dd>
            </dl>
          </div>
          <div aria-hidden className="relative h-0 border-t-2 border-dashed border-slate-200">
            <span className="absolute -top-3 -left-3 size-6 rounded-full border border-slate-200 bg-slate-50" />
            <span className="absolute -top-3 -right-3 size-6 rounded-full border border-slate-200 bg-slate-50" />
          </div>
          <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 p-5 text-sm">
            <dt className="text-slate-600">To the school</dt>
            <dd>{formatMoney(donation.amountCents)}</dd>
            <dt className="text-slate-600">Tip for CoveredNow</dt>
            <dd>{formatMoney(donation.tipCents)}</dd>
            <dt className="text-slate-600">Payment processing</dt>
            <dd>{formatMoney(donation.feeCents)}</dd>
            <dt className="border-t border-slate-200 pt-2 font-semibold">Total</dt>
            <dd className="border-t border-slate-200 pt-2 text-lg font-semibold text-brand-800">
              {formatMoney(donation.totalCents)}
            </dd>
          </dl>
        </section>

        <p className="text-center text-sm print:hidden">
          <Link href="/giving" className="font-medium text-brand-800 underline">
            See all your giving
          </Link>
        </p>
      </div>
    </main>
  );
}
