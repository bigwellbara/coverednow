import Link from "next/link";
import { formatDate } from "@/lib/format";
import { getBillService } from "@/modules/billing";
import { formatMoney } from "@/modules/billing/domain/money";
import { getPaymentService } from "@/modules/payments";

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

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold">Donations</h1>
        <p className="text-sm text-slate-600">
          The latest 200. Settled: {formatMoney(sum("amountCents"))} for schools,{" "}
          {formatMoney(sum("tipCents"))} in tips, {formatMoney(sum("feeCents"))} in fees.
        </p>
      </div>

      {donations.length === 0 ? (
        <p className="text-slate-600">No donations yet.</p>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-2 font-medium">Reference</th>
                <th className="px-4 py-2 font-medium">Bill</th>
                <th className="px-4 py-2 font-medium">Shown as</th>
                <th className="px-4 py-2 text-right font-medium">To school</th>
                <th className="px-4 py-2 text-right font-medium">Total paid</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {donations.map((donation) => {
                const bill = bills.get(donation.billId);
                return (
                  <tr key={donation.id}>
                    <td className="px-4 py-2 font-mono text-xs">{donation.reference}</td>
                    <td className="px-4 py-2">
                      <Link
                        href={`/admin/bills/${donation.billId}`}
                        className="text-brand-800 underline"
                      >
                        {bill?.schoolName ?? "View bill"}
                      </Link>
                    </td>
                    <td className="px-4 py-2">{donation.displayName ?? "Anonymous"}</td>
                    <td className="px-4 py-2 text-right">{formatMoney(donation.amountCents)}</td>
                    <td className="px-4 py-2 text-right">{formatMoney(donation.totalCents)}</td>
                    <td className="px-4 py-2">
                      <span className={`chip ${STATUS_STYLES[donation.status]}`}>
                        {donation.status.toLowerCase()}
                      </span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
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
