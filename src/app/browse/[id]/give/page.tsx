import { ArrowLeft, Lock, ShieldCheck, UsersRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageHero } from "@/components/page-hero";
import { ProgressBar } from "@/components/progress-bar";
import { getUsdRates } from "@/lib/exchange-rates";
import { delay } from "@/lib/motion";
import { getBillService } from "@/modules/billing";
import { getEngagementService } from "@/modules/engagement";
import { termLabel } from "@/modules/billing/domain/bill";
import { formatMoney } from "@/modules/billing/domain/money";
import {
  isOpenForDonations,
  percentFunded,
  remainingCents,
} from "@/modules/billing/domain/public-bill";
import { currentUser } from "@/modules/identity/adapters/session";
import { getPaymentService } from "@/modules/payments";
import { checkAmount } from "@/modules/payments/domain/checkout";
import { CheckoutForm } from "./checkout-form";

export const metadata: Metadata = {
  title: "Give - CoveredNow",
  robots: { index: false },
};

const STEPS = ["Choose your gift", "Pay on Paynow", "Done"];

export default async function GivePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ amount?: string; campaign?: string }>;
}) {
  const { id } = await params;
  const { amount, campaign: campaignSlug } = await searchParams;

  const user = await currentUser();
  if (!user) {
    const query = new URLSearchParams();
    if (amount) query.set("amount", amount);
    if (campaignSlug) query.set("campaign", campaignSlug);
    const back = `/browse/${id}/give${query.size > 0 ? `?${query}` : ""}`;
    redirect(`/sign-in?next=${encodeURIComponent(back)}`);
  }
  const campaign =
    campaignSlug ? await getEngagementService().campaign(campaignSlug, user) : null;
  const givingThrough = campaign?.isOpen ? campaign : null;

  const bill = await getBillService().findPublic(id);
  if (!bill) notFound();
  if (!isOpenForDonations(bill, new Date())) redirect(`/browse/${bill.id}`);

  const remaining = remainingCents(bill);
  const asked = Number(amount);
  const initialCents =
    Number.isInteger(asked) && checkAmount(asked, remaining) === null ? asked : remaining;
  const payments = getPaymentService();
  const percent = percentFunded(bill);
  const rates = await getUsdRates();

  return (
    <main>
      <PageHero
        width="3xl"
        overlap
        eyebrow={
          <Link
            href={`/browse/${bill.id}`}
            className="inline-flex min-h-11 items-center gap-1 tracking-normal text-brand-100 normal-case hover:text-white"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Back to the bill
          </Link>
        }
        title="Checkout"
        subtitle="Thank you for helping a student stay in school."
      >
        <ol
          className="flex flex-wrap items-center gap-x-2 gap-y-2 text-xs font-semibold sm:text-sm"
          aria-label="Steps"
        >
          {STEPS.map((label, index) => (
            <li key={label} className="flex items-center gap-2">
              <span
                className={`grid size-6 place-items-center rounded-full ${
                  index === 0 ? "metal-champagne" : "bg-white/10 text-white ring-1 ring-white/30"
                }`}
              >
                {index + 1}
              </span>
              <span className={index === 0 ? "text-white" : "text-brand-100/70"}>
                {label}
                {index === 0 && <span className="sr-only"> (current step)</span>}
              </span>
              {index < STEPS.length - 1 && (
                <span aria-hidden className="mx-1 h-px w-6 bg-white/30 sm:w-10" />
              )}
            </li>
          ))}
        </ol>
      </PageHero>

      <div className="mx-auto max-w-3xl space-y-6 px-4">
        <section
          className="fade-up card relative -mt-14 space-y-3 shadow-xl shadow-brand-950/10"
          style={delay(350)}
          aria-label="The bill"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span
                aria-hidden
                className="grid size-11 shrink-0 place-items-center rounded-full metal-graphite text-sm font-semibold text-white shadow-md"
              >
                {bill.studentInitials.replaceAll(/[. ]/g, "")}
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold">{bill.schoolName}</p>
                <p className="text-sm text-slate-600">
                  {termLabel(bill.term)} fees · {bill.studentInitials} · {bill.studentLevel}
                </p>
              </div>
            </div>
            <span className="chip shrink-0 bg-brand-50 text-brand-800">
              <ShieldCheck className="size-3.5" aria-hidden />
              School-verified
            </span>
          </div>
          <ProgressBar percent={percent} label={`${percent}% funded`} />
          <p className="text-sm text-slate-600">
            <strong className="text-slate-800">{formatMoney(remaining)}</strong> still needed of{" "}
            {formatMoney(bill.confirmedCents)}
          </p>
        </section>

        {givingThrough && (
          <p className="fade-up flex items-center gap-3 rounded-2xl border border-gold-200 bg-gold-50 p-4 text-sm text-gold-900" style={delay(400)}>
            <UsersRound className="size-5 shrink-0" aria-hidden />
            <span>
              Your gift counts toward{" "}
              <Link href={`/campaigns/${givingThrough.slug}`} className="font-semibold underline">
                {givingThrough.title}
              </Link>
              {givingThrough.progress.matchLeftCents > 0 && givingThrough.matcherName && (
                <>, and {givingThrough.matcherName} will match it</>
              )}
              .
            </span>
          </p>
        )}

        <section className="fade-up card p-6" style={delay(450)}>
          <CheckoutForm
            billId={bill.id}
            remainingCents={remaining}
            initialCents={initialCents}
            feeBps={payments.feeBps}
            donorName={user.name}
            isSimulated={payments.gatewayName === "simulated"}
            rates={rates}
            campaign={givingThrough?.slug ?? null}
          />
        </section>

        <p className="flex items-center justify-center gap-2 text-center text-xs text-slate-500">
          <Lock className="size-3.5 shrink-0" aria-hidden />
          Your donation is a gift paid to {bill.schoolName}. If the school can&apos;t
          accept it, we refund you.
        </p>
      </div>
    </main>
  );
}
