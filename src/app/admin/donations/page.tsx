import { HandCoins, Heart, Landmark, Percent } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { formatDate } from "@/lib/format";
import { getBillService } from "@/modules/billing";
import { formatMoney } from "@/modules/billing/domain/money";
import { getPaymentService } from "@/modules/payments";
import { AdminHeader } from "../admin-header";

export const dynamic = "force-dynamic";

const STATUS_STYLES = {
  INITIATED: "bg-gold-100 text-gold-900",
  SETTLED: "bg-brand-50 text-brand-800",
  FAILED: "bg-slate-100 text-slate-700",
  REFUNDED: "bg-red-50 text-red-800",
} as const;

export default async function AdminDonationsPage() {
  const payments = getPaymentService();
  // Catches up any bill whose funding update was missed, as admins look here first.
  await payments.retryPendingFunding();
  const donations = await payments.listRecent(200);
  const bills = new Map(
    (await getBillService().findPublicMany([...new Set(donations.map((d) => d.billId))])).map(
      (bill) => [bill.id, bill],
    ),
  );

  const settled = donations.filter((d) => d.status === "SETTLED");
  const sum = (key: "amountCents" | "tipCents" | "feeCents") =>
    settled.reduce((total, d) => total + d[key], 0);
  const totals = [
    { label: "for schools", value: sum("amountCents"), icon: Landmark },
    { label: "in tips", value: sum("tipCents"), icon: Heart },
    { label: "in fees", value: sum("feeCents"), icon: Percent },
  ];

  return (
    <main className="stagger-children mx-auto max-w-5xl space-y-6 px-4 py-8">
      <AdminHeader
        title="Donations"
        icon={<HandCoins className="size-5" aria-hidden />}
        meta={`The latest 200, of which ${settled.length} settled`}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {totals.map((total) => (
          <div key={total.label} className="card flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gold-100 text-gold-700">
              <total.icon className="size-5" aria-hidden />
            </span>
            <p>
              <span className="block text-xl font-semibold text-brand-900">
                {formatMoney(total.value)}
              </span>
              <span className="text-sm text-slate-600">settled {total.label}</span>
            </p>
          </div>
        ))}
      </div>

      {donations.length === 0 ? (
        <EmptyState icon={HandCoins} title="No donations yet">
          Donations appear here as soon as someone starts a checkout.
        </EmptyState>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Reference</th>
                <th className="px-4 py-3 font-medium">Bill</th>
                <th className="px-4 py-3 font-medium">Shown as</th>
                <th className="px-4 py-3 text-right font-medium">To school</th>
                <th className="px-4 py-3 text-right font-medium">Total paid</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {donations.map((donation) => {
                const bill = bills.get(donation.billId);
                return (
                  <tr key={donation.id} className="transition-colors hover:bg-brand-50/40">
                    <td className="px-4 py-2.5 font-mono text-xs">{donation.reference}</td>
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/admin/bills/${donation.billId}`}
                        className="text-brand-800 underline"
                      >
                        {bill?.schoolName ?? "View bill"}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">{donation.displayName ?? "Anonymous"}</td>
                    <td className="px-4 py-2.5 text-right">{formatMoney(donation.amountCents)}</td>
                    <td className="px-4 py-2.5 text-right font-medium">
                      {formatMoney(donation.totalCents)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`chip ${STATUS_STYLES[donation.status]}`}>
                        {donation.status.toLowerCase()}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {formatDate(donation.settledAt ?? donation.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
