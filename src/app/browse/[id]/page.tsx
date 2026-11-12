import {
  CalendarClock,
  ChevronRight,
  CircleCheck,
  Heart,
  Landmark,
  Lock,
  MessageSquareHeart,
  Share2,
  ShieldCheck,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Confetti } from "@/components/celebration";
import { LocalAmount } from "@/components/local-amount";
import { PageHero } from "@/components/page-hero";
import { getUsdRates } from "@/lib/exchange-rates";
import { ProgressBar } from "@/components/progress-bar";
import { SchoolIcon } from "@/components/school-icon";
import { formatDate, siteUrl, whatsAppShareUrl } from "@/lib/format";
import { delay, stagger } from "@/lib/motion";
import { getBillService } from "@/modules/billing";
import { getEngagementService } from "@/modules/engagement";
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
        const isNext = index === reached + 1;
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
              <span className="pop-in relative shrink-0" style={stagger(index, 120, 200)}>
                <CircleCheck className="size-6 rounded-full bg-white text-brand-700" aria-hidden />
              </span>
            ) : (
              <span aria-hidden className="relative mt-0.5 ml-0.5 flex size-5 shrink-0">
                {/* The step that comes next pulses gently, to show where things are. */}
                {isNext && <span className="ping-soft absolute inset-0 rounded-full bg-gold-400" />}
                <span
                  className={`relative size-5 rounded-full border-2 bg-white ${
                    isNext ? "border-gold-500" : "border-slate-300"
                  }`}
                />
              </span>
            )}
            <div className="text-sm">
              <p
                className={
                  done
                    ? "font-semibold text-slate-900"
                    : isNext
                      ? "font-medium text-gold-800"
                      : "text-slate-500"
                }
              >
                {step.label}
                <span className="sr-only">{done ? " (done)" : " (to come)"}</span>
              </p>
              {done && step.date && <p className="text-slate-500">{formatDate(step.date)}</p>}
              {isNext && <p className="text-slate-500">Next step</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Two letters for a supporter's avatar, such as "HA" for "Harare Alumni 09". */
function initialsOf(name: string | null) {
  const letters = (name ?? "")
    .split(/\s+/)
    .filter((word) => /^[a-z]/i.test(word))
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
  return letters || "?";
}

const AVATAR_TONES = [
  "bg-brand-100 text-brand-800",
  "bg-gold-100 text-gold-900",
  "bg-sky-100 text-sky-800",
  "bg-rose-100 text-rose-800",
];

export default async function PublicBillPage({ params }: Props) {
  const { id } = await params;
  const bill = await getBillService().findPublic(id);
  if (!bill) notFound();

  const payments = getPaymentService();
  const [supporters, supporterCount, rates, notes] = await Promise.all([
    payments.listSupporters(bill.id, 10),
    payments.countSupporters(bill.id),
    getUsdRates(),
    getEngagementService().approvedNotes(bill.id),
  ]);

  const now = new Date();
  // Celebrated for a week after the bill reaches its full amount.
  const justFunded =
    bill.fundedAt !== null && now.getTime() - bill.fundedAt.getTime() < 7 * 24 * 60 * 60 * 1000;
  const percent = percentFunded(bill);
  const remaining = remainingCents(bill);
  const isOpen = isOpenForDonations(bill, now);
  const shareText = `Help cover ${termLabel(bill.term)} fees at ${bill.schoolName}. ${formatMoney(
    remaining,
  )} still needed, and every dollar is paid straight to the school: ${siteUrl(`/browse/${bill.id}`)}`;

  return (
    <main className="relative">
      {justFunded && (
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[40rem]">
          <Confetti count={36} />
        </div>
      )}
      {/* No photo here: a stock picture on one student's bill would look like them. */}
      <PageHero
        overlap
        eyebrow={
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1 tracking-normal normal-case"
          >
            <Link
              href="/browse"
              className="inline-flex min-h-11 items-center text-brand-100 hover:text-white"
            >
              Browse bills
            </Link>
            <ChevronRight className="size-4 text-brand-300" aria-hidden />
            <span aria-current="page" className="text-gold-300">
              Bill
            </span>
          </nav>
        }
        title={`${termLabel(bill.term)} fees`}
        subtitle={
          <span className="inline-flex items-center gap-2">
            <SchoolIcon type={bill.schoolType} className="size-5 shrink-0 text-gold-300" />
            {bill.schoolName} · {bill.city}
          </span>
        }
      >
        <div className="flex flex-wrap gap-2">
          <span className="chip bg-gold-500 px-3 py-1 text-brand-950">
            <ShieldCheck className="size-3.5" aria-hidden />
            School-verified
          </span>
          <span className="chip bg-white/10 px-3 py-1 text-white ring-1 ring-white/20">
            {percent}% funded
          </span>
          {isOpen && (
            <span className="chip bg-white/10 px-3 py-1 text-white ring-1 ring-white/20">
              <CalendarClock className="size-3.5" aria-hidden />
              {dueLabel(bill.dueDate, now)}
            </span>
          )}
        </div>
      </PageHero>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 lg:grid-cols-[1fr_22rem]">
        <div className="-mt-14 space-y-6">
          <section
            className="fade-up card space-y-3 shadow-xl shadow-brand-950/10"
            style={delay(350)}
            aria-label="Funding"
          >
            <p className="flex flex-wrap items-baseline justify-between gap-2">
              <span>
                <span className="text-4xl font-semibold tracking-tight text-brand-800">
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
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-slate-700">
                  <strong>{formatMoney(remaining)}</strong> still needed by{" "}
                  {formatDate(bill.dueDate)}.
                </p>
                <LocalAmount cents={remaining} rates={rates} picker />
              </div>
            )}
          </section>

          <section className="reveal card space-y-4" aria-labelledby="student-heading">
            <h2 id="student-heading" className="font-semibold">
              The student
            </h2>
            <div className="flex items-center gap-4">
              <span
                aria-hidden
                className="relative grid size-14 shrink-0 place-items-center rounded-2xl metal-graphite text-lg font-semibold text-white shadow-lg"
              >
                {bill.studentInitials.replaceAll(/[. ]/g, "")}
                <span className="absolute -right-1.5 -bottom-1.5 grid size-6 place-items-center rounded-full metal-champagne ring-2 ring-white">
                  <ShieldCheck className="size-3.5" />
                </span>
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

          {notes.length > 0 && (
            <section className="reveal card space-y-3 border-gold-200 bg-gold-50/50" aria-labelledby="notes-heading">
              <h2 id="notes-heading" className="flex items-center gap-2 font-semibold">
                <MessageSquareHeart className="size-5 text-gold-600" aria-hidden />
                From {bill.studentInitials}
              </h2>
              {notes.map((note) => (
                <figure key={note.id} className="rounded-xl bg-white p-4 shadow-sm">
                  <blockquote className="whitespace-pre-line text-slate-800">&ldquo;{note.body}&rdquo;</blockquote>
                  <figcaption className="mt-2 text-xs text-slate-500">
                    {formatDate(note.createdAt)} · checked by CoveredNow
                  </figcaption>
                </figure>
              ))}
            </section>
          )}

          <section className="reveal card" aria-labelledby="timeline-heading">
            <h2 id="timeline-heading" className="mb-4 font-semibold">
              Progress
            </h2>
            <Timeline bill={bill} />
          </section>

          <section className="reveal card" aria-labelledby="supporters-heading">
            <h2 id="supporters-heading" className="mb-3 font-semibold">
              Supporters
            </h2>
            {supporters.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-slate-600">
                <Heart className="size-4 text-gold-600" aria-hidden />
                Be the first to support this bill.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {supporters.map((supporter, index) => (
                  <li
                    key={index}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm"
                  >
                    <span className="inline-flex min-w-0 items-center gap-3">
                      <span
                        aria-hidden
                        className={`grid size-9 shrink-0 place-items-center rounded-full text-xs font-semibold ${
                          AVATAR_TONES[index % AVATAR_TONES.length]
                        }`}
                      >
                        {initialsOf(supporter.displayName)}
                      </span>
                      <span className="truncate font-medium text-slate-800">
                        {supporter.displayName ?? "Anonymous"}
                      </span>
                    </span>
                    <span className="shrink-0 text-right text-slate-600">
                      <span className="block font-semibold text-brand-800">
                        {formatMoney(supporter.amountCents)}
                      </span>
                      <span className="text-xs">{formatDate(supporter.settledAt)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Beside the details on wide screens, overlapping the hero; below them on phones. */}
        <aside className="lg:sticky lg:top-20 lg:col-start-2 lg:row-start-1 lg:-mt-14 lg:self-start">
          <section
            className="fade-up card space-y-4 border-brand-200 shadow-xl shadow-brand-950/10"
            style={delay(450)}
            aria-labelledby="give-heading"
          >
            {isOpen ? (
              <>
                <h2 id="give-heading" className="flex items-center gap-2 text-lg font-semibold">
                  <Heart className="size-5 fill-gold-500 text-gold-500" aria-hidden />
                  Fund this bill
                </h2>
                <div className="grid grid-cols-2 gap-2">
                  {suggestedAmounts(remaining).map((amount, index) => (
                    <Link
                      key={amount}
                      href={`/browse/${bill.id}/give?amount=${amount}`}
                      className={
                        index === 0
                          ? "btn-primary col-span-2 shadow-lg shadow-brand-700/20 transition hover:-translate-y-0.5 motion-reduce:hover:translate-y-0"
                          : "btn-secondary border-brand-200 text-brand-800 transition hover:border-brand-700 hover:bg-brand-50"
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
                <span className="pop-in mx-auto grid size-16 place-items-center rounded-full bg-brand-50">
                  <CircleCheck className="size-10 text-brand-700" aria-hidden />
                </span>
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

            <ul className="space-y-3 border-t border-slate-100 pt-4 text-sm text-slate-700">
              <li className="flex gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
                  <Landmark className="size-4" aria-hidden />
                </span>
                Paid to {bill.schoolName}&apos;s own account, never to the student.
              </li>
              <li className="flex gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
                  <ShieldCheck className="size-4" aria-hidden />
                </span>
                The amount was confirmed by the school&apos;s bursar.
              </li>
              <li className="flex gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
                  <Lock className="size-4" aria-hidden />
                </span>
                Pay securely with EcoCash, OneMoney or a bank card through Paynow.
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </main>
  );
}
