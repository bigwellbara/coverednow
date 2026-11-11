import {
  CalendarClock,
  ChevronRight,
  CircleCheck,
  Heart,
  Landmark,
  Lock,
  Share2,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProgressBar } from "@/components/progress-bar";
import { SchoolIcon } from "@/components/school-icon";
import { formatDate, siteUrl, whatsAppShareUrl } from "@/lib/format";
import { getBillService } from "@/modules/billing";
import { termLabel } from "@/modules/billing/domain/bill";
import { BILLER_TYPE_LABELS } from "@/modules/billing/domain/biller";
import { formatMoney } from "@/modules/billing/domain/money";
import {
  dueLabel,
  isOpenForDonations,
  percentFunded,
  remainingCents,
  type PublicBill,
} from "@/modules/billing/domain/public-bill";
import { getPaymentService } from "@/modules/payments";
import { suggestedAmounts } from "@/modules/payments/domain/checkout";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const bill = await getBillService().findPublic((await params).id);
  if (!bill) return { title: "Bill not found - CoveredNow" };
  return {
    title: `${termLabel(bill.term)} fees at ${bill.schoolName} - CoveredNow`,
    description: `${formatMoney(remainingCents(bill))} still needed. Confirmed by the school, paid straight to the school.`,
  };
}

const REACHED: Record<PublicBill["status"], number> = {
  SCHOOL_CONFIRMED: 1,
  PARTIALLY_FUNDED: 1,
  FUNDED: 2,
  PAID: 3,
  RECEIPT_CONFIRMED: 4,
};

function Timeline({ bill }: { bill: PublicBill }) {
  const reached = REACHED[bill.status];
  const steps = [
    { label: "Listed", date: bill.createdAt },
    { label: "Confirmed by the school", date: bill.confirmedAt },
    { label: "Fully funded", date: bill.fundedAt },
    { label: "Paid to the school", date: null },
    { label: "School confirmed receipt", date: null },
  ];

  return (
    <ol className="space-y-0">
      {steps.map((step, index) => {
        const done = index <= reached;
        const isLast = index === steps.length - 1;
        return (
          <li key={step.label} className="relative flex gap-3 pb-5 last:pb-0">
            {!isLast && (
              <span
                aria-hidden
                className={`absolute top-6 left-[11px] h-[calc(100%-1.25rem)] w-0.5 ${
                  index < reached ? "bg-brand-600" : "bg-slate-200"
                }`}
              />
            )}
            {done ? (
              <CircleCheck className="relative size-6 shrink-0 text-brand-700" aria-hidden />
            ) : (
              <span
                aria-hidden
                className="relative mt-0.5 size-5 shrink-0 rounded-full border-2 border-slate-300 bg-white"
              />
            )}
            <div className="text-sm">
              <p className={done ? "font-semibold text-slate-900" : "text-slate-500"}>
                {step.label}
                <span className="sr-only">{done ? " (done)" : " (to come)"}</span>
              </p>
              {done && step.date && <p className="text-slate-500">{formatDate(step.date)}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default async function PublicBillPage({ params }: Props) {
  const { id } = await params;
  const bill = await getBillService().findPublic(id);
  if (!bill) notFound();

  const payments = getPaymentService();
  const [supporters, supporterCount] = await Promise.all([
    payments.listSupporters(bill.id, 10),
    payments.countSupporters(bill.id),
  ]);

  const now = new Date();
  const percent = percentFunded(bill);
  const remaining = remainingCents(bill);
  const isOpen = isOpenForDonations(bill, now);
  const shareText = `Help cover ${termLabel(bill.term)} fees at ${bill.schoolName}. ${formatMoney(
    remaining,
  )} still needed, and every dollar is paid straight to the school: ${siteUrl(`/browse/${bill.id}`)}`;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1 text-sm text-slate-600">
        <Link href="/browse" className="inline-flex min-h-11 items-center hover:text-brand-800">
          Browse bills
        </Link>
        <ChevronRight className="size-4" aria-hidden />
        <span aria-current="page">Bill</span>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <header className="space-y-3">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-slate-600">
              <SchoolIcon type={bill.schoolType} className="size-4" />
              {bill.schoolName} · {bill.city}
            </p>
            <h1 className="text-3xl font-bold text-brand-900 sm:text-4xl">
              {termLabel(bill.term)} fees
            </h1>
            <div className="flex flex-wrap gap-2">
              <span className="chip bg-brand-700 text-white">
                <ShieldCheck className="size-3.5" aria-hidden />
                School-verified
              </span>
              <span className="chip bg-gold-100 text-gold-900">{percent}% funded</span>
              {isOpen && (
                <span className="chip bg-slate-200 text-slate-800">
                  <CalendarClock className="size-3.5" aria-hidden />
                  {dueLabel(bill.dueDate, now)}
                </span>
              )}
            </div>
          </header>

          <section className="card space-y-3" aria-label="Funding">
            <p className="flex flex-wrap items-baseline justify-between gap-2">
              <span>
                <span className="text-3xl font-bold text-brand-800">
                  {formatMoney(bill.raisedCents)}
                </span>{" "}
                <span className="text-slate-600">raised of {formatMoney(bill.confirmedCents)}</span>
              </span>
              <span className="text-sm text-slate-600">
                {supporterCount === 1 ? "1 supporter" : `${supporterCount} supporters`}
              </span>
            </p>
            <ProgressBar percent={percent} label={`${percent}% funded`} size="lg" />
            {remaining > 0 && (
              <p className="text-sm text-slate-700">
                <strong>{formatMoney(remaining)}</strong> still needed by{" "}
                {formatDate(bill.dueDate)}.
              </p>
            )}
          </section>

          <section className="card space-y-4" aria-labelledby="student-heading">
            <h2 id="student-heading" className="font-semibold">
              The student
            </h2>
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-full bg-brand-700 font-bold text-white">
                {bill.studentInitials.replaceAll(/[. ]/g, "")}
              </span>
              <div className="text-sm">
                <p className="font-medium text-slate-900">
                  {bill.studentInitials} · {bill.studentLevel}
                </p>
                <p className="text-slate-600">
                  {BILLER_TYPE_LABELS[bill.schoolType]} · identity checked by CoveredNow
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-600">
              To protect students&apos; dignity, we show initials only. The school has
              confirmed this student is enrolled and owes this amount for{" "}
              {termLabel(bill.term)}.
            </p>
          </section>

          <section className="card" aria-labelledby="timeline-heading">
            <h2 id="timeline-heading" className="mb-4 font-semibold">
              Progress
            </h2>
            <Timeline bill={bill} />
          </section>

          <section className="card" aria-labelledby="supporters-heading">
            <h2 id="supporters-heading" className="mb-3 font-semibold">
              Supporters
            </h2>
            {supporters.length === 0 ? (
              <p className="text-sm text-slate-600">Be the first to support this bill.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {supporters.map((supporter, index) => (
                  <li key={index} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <UserRound className="size-4 shrink-0 text-slate-400" aria-hidden />
                      <span className="truncate">{supporter.displayName ?? "Anonymous"}</span>
                    </span>
                    <span className="shrink-0 text-slate-600">
                      {formatMoney(supporter.amountCents)} · {formatDate(supporter.settledAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <section className="card space-y-4 border-brand-200" aria-labelledby="give-heading">
            {isOpen ? (
              <>
                <h2 id="give-heading" className="text-lg font-semibold">
                  Fund this bill
                </h2>
                <div className="grid grid-cols-2 gap-2">
                  {suggestedAmounts(remaining).map((amount, index) => (
                    <Link
                      key={amount}
                      href={`/browse/${bill.id}/give?amount=${amount}`}
                      className={
                        index === 0
                          ? "btn-primary col-span-2"
                          : "btn-secondary border-brand-200 text-brand-800"
                      }
                    >
                      {index === 0 && <Heart className="size-4" aria-hidden />}
                      {index === 0
                        ? `Clear it: ${formatMoney(amount)}`
                        : formatMoney(amount).replace(/\.00$/, "")}
                    </Link>
                  ))}
                </div>
                <Link
                  href={`/browse/${bill.id}/give`}
                  className="block text-center text-sm font-medium text-brand-800 underline"
                >
                  Give another amount
                </Link>
              </>
            ) : (
              <div className="space-y-2 text-center">
                <CircleCheck className="mx-auto size-10 text-brand-700" aria-hidden />
                <h2 id="give-heading" className="text-lg font-semibold">
                  {bill.raisedCents >= bill.confirmedCents
                    ? "Fully funded. Thank you."
                    : "No longer taking donations"}
                </h2>
                <p className="text-sm text-slate-600">
                  <Link href="/browse" className="font-medium text-brand-800 underline">
                    Find another bill to support
                  </Link>
                </p>
              </div>
            )}

            <a
              href={whatsAppShareUrl(shareText)}
              target="_blank"
              rel="noreferrer"
              className="btn-gold w-full"
            >
              <Share2 className="size-4" aria-hidden />
              Share on WhatsApp
            </a>

            <ul className="space-y-2 border-t border-slate-100 pt-4 text-sm text-slate-700">
              <li className="flex gap-2">
                <Landmark className="size-4 shrink-0 text-brand-700" aria-hidden />
                Paid to {bill.schoolName}&apos;s own account, never to the student.
              </li>
              <li className="flex gap-2">
                <ShieldCheck className="size-4 shrink-0 text-brand-700" aria-hidden />
                The amount was confirmed by the school&apos;s bursar.
              </li>
              <li className="flex gap-2">
                <Lock className="size-4 shrink-0 text-brand-700" aria-hidden />
                Pay securely with EcoCash, OneMoney or a bank card through Paynow.
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </main>
  );
}
