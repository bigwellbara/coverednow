import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { getBillService } from "@/modules/billing";
import { BILL_STATUS_LABELS, termLabel } from "@/modules/billing/domain/bill";
import { formatMoney } from "@/modules/billing/domain/money";
import { requireAdmin } from "@/modules/identity/adapters/session";

export default async function AdminBillsPage() {
  await requireAdmin();
  const bills = await getBillService().listAll();

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-bold">Bills</h1>
      {bills.length === 0 ? (
        <p className="text-slate-600">No bills yet.</p>
      ) : (
        <ul className="space-y-3">
          {bills.map((bill) => (
            <li key={bill.id}>
              <Link
                href={`/admin/bills/${bill.id}`}
                className="card flex items-center justify-between gap-3 hover:border-emerald-700"
              >
                <span>
                  <span className="block font-medium">{bill.billerName}</span>
                  <span className="block text-sm text-slate-500">
                    {bill.regNumber}, {termLabel(bill.term)},{" "}
                    {formatMoney(bill.confirmedCents ?? bill.claimedCents)}
                  </span>
                  <span className="mt-1 block text-sm text-slate-700">
                    {BILL_STATUS_LABELS[bill.status]}
                  </span>
                </span>
                <ChevronRight className="size-5 shrink-0 text-slate-400" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
