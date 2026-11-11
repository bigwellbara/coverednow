import { ChevronRight, HandCoins, Heart, ReceiptText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { formatDate } from "@/lib/format";
import { getBillService } from "@/modules/billing";
import { termLabel } from "@/modules/billing/domain/bill";
import { formatMoney } from "@/modules/billing/domain/money";
import { requireUser } from "@/modules/identity/adapters/session";
import { getPaymentService } from "@/modules/payments";
import type { DonationStatus } from "@/modules/payments/services/payment-service";

export const metadata: Metadata = { title: "My giving - CoveredNow" };
export const dynamic = "force-dynamic";

const STATUS: Record<DonationStatus, { label: string; className: string }> = {
  INITIATED: { label: "Waiting for payment", className: "bg-gold-100 text-gold-900" },
  SETTLED: { label: "Paid", className: "bg-brand-50 text-brand-800" },
  FAILED: { label: "Didn't go through", className: "bg-slate-100 text-slate-700" },
  REFUNDED: { label: "Refunded", className: "bg-slate-100 text-slate-700" },
};

function Stat(props: { icon: ReactNode; value: string; label: string }) {
  return (
    <div className="card flex items-center gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gold-100 text-gold-700">
        {props.icon}
      </span>
      <div>
        <p className="text-2xl font-bold text-brand-900">{props.value}</p>
        <p className="text-sm text-slate-600">{props.label}</p>
      </div>
    </div>
  );
}

export default async function GivingPage() {
  const user = await requireUser();
  const payments = getPaymentService();
  const [summary, donations] = await Promise.all([
    payments.donorSummary(user.id),
    payments.listForDonor(user.id),
  ]);
  const bills = new Map(
    (await getBillService().findPublicMany([...new Set(donations.map((d) => d.billId))])).map(
      (bill) => [bill.id, bill],
    ),
  );
  const iconClass = "size-5";

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-brand-900">My giving</h1>
          <p className="text-slate-600">Welcome back, {user.name}.</p>
        </div>
        <Link href="/browse" className="btn-primary">
          <Heart className="size-4" aria-hidden />
          Fund a bill
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          icon={<HandCoins className={iconClass} aria-hidden />}
          value={formatMoney(summary.givenCents)}
          label="given to schools"
        />
        <Stat
          icon={<ReceiptText className={iconClass} aria-hidden />}
          value={String(summary.billsSupported)}
          label={summary.billsSupported === 1 ? "bill supported" : "bills supported"}
        />
        <Stat
          icon={<Heart className={iconClass} aria-hidden />}
          value={String(summary.donations)}
          label={summary.donations === 1 ? "donation" : "donations"}
        />
      </div>

      <section className="card" aria-labelledby="history-heading">
        <h2 id="history-heading" className="mb-3 font-semibold">
          Your donations
        </h2>
        {donations.length === 0 ? (
          <p className="text-slate-600">
            No donations yet.{" "}
            <Link href="/browse" className="font-medium text-brand-800 underline">
              Find a bill to fund
            </Link>
            .
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {donations.map((donation) => {
              const bill = bills.get(donation.billId);
              const status = STATUS[donation.status];
              return (
                <li key={donation.id}>
                  <Link
                    href={`/donations/${donation.id}`}
                    className="flex items-center justify-between gap-3 py-3 hover:bg-slate-50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {bill ? `${bill.schoolName}, ${termLabel(bill.term)}` : "School fees"}
                      </span>
                      <span className="block text-sm text-slate-600">
                        {formatDate(donation.createdAt)} · {donation.reference}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="text-right">
                        <span className="block font-semibold">
                          {formatMoney(donation.amountCents)}
                        </span>
                        <span className={`chip ${status.className}`}>{status.label}</span>
                      </span>
                      <ChevronRight className="size-5 text-slate-400" aria-hidden />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
