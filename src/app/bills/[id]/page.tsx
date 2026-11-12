import {
  ArrowLeft,
  CircleAlert,
  CircleCheck,
  Clock,
  ExternalLink,
  HeartHandshake,
  Share2,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { BillStatusChip } from "@/components/bill-status-chip";
import { PageHero } from "@/components/page-hero";
import { ProgressBar } from "@/components/progress-bar";
import { siteUrl, whatsAppShareUrl } from "@/lib/format";
import { delay } from "@/lib/motion";
import { getBillService } from "@/modules/billing";
import { BILL_STATUS_LABELS, termLabel } from "@/modules/billing/domain/bill";
import { formatMoney } from "@/modules/billing/domain/money";
import { isPublicStatus, percentFunded } from "@/modules/billing/domain/public-bill";
import { requireApplicant } from "@/modules/identity/adapters/session";
import { getEngagementService } from "@/modules/engagement";
import { WithdrawBillForm } from "../forms";
import { ThankYouForm } from "./thank-you";

const NOTE_STATUS = {
  PENDING: { label: "Waiting for review", className: "bg-gold-100 text-gold-900" },
  APPROVED: { label: "Shared with donors", className: "bg-brand-50 text-brand-800" },
  REJECTED: { label: "Not shared", className: "bg-slate-100 text-slate-600" },
} as const;

const TONES = {
  info: "border-sky-200 bg-sky-50 text-sky-900",
  good: "border-brand-200 bg-brand-50 text-brand-900",
  warn: "border-amber-200 bg-amber-50 text-amber-900",
};

function Notice(props: { tone: keyof typeof TONES; icon: ReactNode; children: ReactNode }) {
  return (
    <div
      className={`fade-up flex gap-3 rounded-2xl border p-4 ${TONES[props.tone]}`}
      style={delay(200)}
    >
      <span className="pop-in shrink-0" style={delay(350)}>
        {props.icon}
      </span>
      <p className="text-sm">{props.children}</p>
    </div>
  );
}

export default async function BillPage({ params }: { params: Promise<{ id: string }> }) {
  const owner = await requireApplicant();
  const { id } = await params;
  const bill = await getBillService().findForOwner(owner.id, id);
  if (!bill) notFound();

  const canWithdraw = bill.status === "PENDING_SCHOOL" || bill.status === "SCHOOL_CONFIRMED";
  const notes = bill.raisedCents > 0 ? await getEngagementService().notesForOwner(owner.id, bill.id) : [];
  const wasCorrected = bill.confirmedCents !== null && bill.confirmedCents !== bill.claimedCents;

  return (
    <main>
      <PageHero
        width="3xl"
        eyebrow={
          <Link
            href="/bills"
            className="inline-flex min-h-11 items-center gap-1 tracking-normal text-brand-100 normal-case hover:text-white"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Back to bills
          </Link>
        }
        title={bill.billerName}
        subtitle={`${termLabel(bill.term)} · ${formatMoney(bill.confirmedCents ?? bill.claimedCents)}`}
      >
        <BillStatusChip status={bill.status} />
      </PageHero>

      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        {bill.status === "PENDING_SCHOOL" && (
          <Notice tone="info" icon={<Clock className="size-5" aria-hidden />}>
            We&apos;ve asked the school to confirm this bill. There&apos;s nothing more you
            need to do right now.
          </Notice>
        )}
        {bill.status === "SCHOOL_CONFIRMED" && (
          <Notice tone="good" icon={<CircleCheck className="size-5" aria-hidden />}>
            The school has confirmed this bill.
            {wasCorrected && ` It corrected the amount to ${formatMoney(bill.confirmedCents!)}.`}
          </Notice>
        )}
        {bill.status === "REJECTED" && (
          <Notice tone="warn" icon={<CircleAlert className="size-5" aria-hidden />}>
            {bill.closedReason ?? "This bill wasn't accepted."} You can submit a new bill if
            something needs correcting.
          </Notice>
        )}

        {isPublicStatus(bill.status) && bill.confirmedCents !== null && (
          <section
            className="fade-up card space-y-4"
            style={delay(250)}
            aria-labelledby="funding-heading"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="funding-heading" className="font-semibold">
                Funding
              </h2>
              <p className="text-sm text-slate-600">
                <span className="text-2xl font-semibold text-brand-800">
                  {formatMoney(bill.raisedCents)}
                </span>{" "}
                of {formatMoney(bill.confirmedCents)}
              </p>
            </div>
            <ProgressBar
              percent={percentFunded({
                confirmedCents: bill.confirmedCents,
                raisedCents: bill.raisedCents,
              })}
              label="Funded so far"
              size="lg"
            />
            <p className="text-sm text-slate-700">
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

        <section className="fade-up card" style={delay(300)} aria-labelledby="details-heading">
          <h2 id="details-heading" className="mb-3 font-semibold">
            Details
          </h2>
          <dl className="divide-y divide-slate-100 text-sm">
            {[
              ["Status", BILL_STATUS_LABELS[bill.status]],
              ["Reg number", bill.regNumber],
              ["Term", termLabel(bill.term)],
              ["Amount you entered", formatMoney(bill.claimedCents)],
              ...(bill.confirmedCents !== null
                ? [["Amount confirmed", formatMoney(bill.confirmedCents)]]
                : []),
              ["Due date", bill.dueDate.toISOString().slice(0, 10)],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 py-2.5">
                <dt className="text-slate-500">{label}</dt>
                <dd
                  className={`text-right ${label === "Amount confirmed" ? "font-semibold text-brand-800" : "text-slate-900"}`}
                >
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {bill.raisedCents > 0 && (
          <section className="fade-up card space-y-4" style={delay(350)} aria-labelledby="thanks-heading">
            <h2 id="thanks-heading" className="flex items-center gap-2 font-semibold">
              <HeartHandshake className="size-5 text-gold-600" aria-hidden />
              Say thank you
            </h2>
            <p className="text-sm text-slate-600">
              Your donors would love to hear from you. Once we&apos;ve checked it, your note
              appears on your public page and is sent to everyone who gave.
            </p>
            {notes.length > 0 && (
              <ul className="space-y-2">
                {notes.map((note) => (
                  <li key={note.id} className="rounded-xl border border-slate-200 p-3 text-sm">
                    <p className="text-slate-800">{note.body}</p>
                    <p className="mt-1">
                      <span className={`chip ${NOTE_STATUS[note.status].className}`}>
                        {NOTE_STATUS[note.status].label}
                      </span>
                    </p>
                  </li>
                ))}
              </ul>
            )}
            {notes.filter((note) => note.status !== "REJECTED").length < 3 && <ThankYouForm billId={bill.id} />}
          </section>
        )}

        {canWithdraw && <WithdrawBillForm billId={bill.id} />}
      </div>
    </main>
  );
}
