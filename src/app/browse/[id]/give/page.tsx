import { ArrowLeft, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ProgressBar } from "@/components/progress-bar";
import { getBillService } from "@/modules/billing";
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

export default async function GivePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ amount?: string }>;
}) {
  const { id } = await params;
  const { amount } = await searchParams;

  const user = await currentUser();
  if (!user) {
    const back = `/browse/${id}/give${amount ? `?amount=${encodeURIComponent(amount)}` : ""}`;
    redirect(`/sign-in?next=${encodeURIComponent(back)}`);
  }

  const bill = await getBillService().findPublic(id);
  if (!bill) notFound();
  if (!isOpenForDonations(bill, new Date())) redirect(`/browse/${bill.id}`);

  const remaining = remainingCents(bill);
  const asked = Number(amount);
  const initialCents =
    Number.isInteger(asked) && checkAmount(asked, remaining) === null ? asked : remaining;
  const payments = getPaymentService();
  const percent = percentFunded(bill);

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <Link
        href={`/browse/${bill.id}`}
        className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-brand-800"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to the bill
      </Link>

      <div>
        <h1 className="text-3xl font-bold text-brand-900">Checkout</h1>
        <p className="mt-1 text-slate-600">Thank you for helping a student stay in school.</p>
      </div>

      <section className="card space-y-3" aria-label="The bill">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold">{bill.schoolName}</p>
            <p className="text-sm text-slate-600">
              {termLabel(bill.term)} fees · {bill.studentInitials} · {bill.studentLevel}
            </p>
          </div>
          <span className="chip shrink-0 bg-brand-50 text-brand-800">
            <ShieldCheck className="size-3.5" aria-hidden />
            School-verified
          </span>
        </div>
        <ProgressBar percent={percent} label={`${percent}% funded`} />
        <p className="text-sm text-slate-600">
          {formatMoney(remaining)} still needed of {formatMoney(bill.confirmedCents)}
        </p>
      </section>

      <section className="card">
        <CheckoutForm
          billId={bill.id}
          remainingCents={remaining}
          initialCents={initialCents}
          feeBps={payments.feeBps}
          donorName={user.name}
          isSimulated={payments.gatewayName === "simulated"}
        />
      </section>

      <p className="text-center text-xs text-slate-500">
        Your donation is a gift paid to {bill.schoolName}. If the school can&apos;t
        accept it, we refund you.
      </p>
    </main>
  );
}
