import { ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { getBillService } from "@/modules/billing";
import { BILL_STATUS_LABELS, termLabel } from "@/modules/billing/domain/bill";
import { formatMoney } from "@/modules/billing/domain/money";
import { requireApplicant } from "@/modules/identity/adapters/session";

export default async function BillsPage() {
  const owner = await requireApplicant();
  const service = getBillService();
  const [bills, canSubmit] = await Promise.all([
    service.listForOwner(owner.id),
    service.canSubmit(owner),
  ]);

  return (
    <>
      <AppHeader name={owner.name} />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Fee bills</h1>
          {canSubmit && (
            <Link href="/bills/new" className="btn-primary">
              <Plus className="size-4" aria-hidden />
              New bill
            </Link>
          )}
        </div>

        {!canSubmit && (
          <p className="text-slate-600">
            You can submit a bill once your account is verified.{" "}
            <Link href="/onboarding" className="font-medium text-emerald-800 underline">
              Check your verification
            </Link>
          </p>
        )}

        {bills.length === 0 ? (
          canSubmit && <p className="text-slate-600">No bills yet.</p>
        ) : (
          <ul className="space-y-3">
            {bills.map((bill) => (
              <li key={bill.id}>
                <Link
                  href={`/bills/${bill.id}`}
                  className="card flex items-center justify-between gap-3 hover:border-emerald-700"
                >
                  <span>
                    <span className="block font-medium">{bill.billerName}</span>
                    <span className="block text-sm text-slate-500">
                      {termLabel(bill.term)},{" "}
                      {formatMoney(bill.confirmedCents ?? bill.claimedCents)}
                    </span>
                    <span className="mt-1 block text-sm text-slate-700">
                      {BILL_STATUS_LABELS[bill.status]}
                    </span>
                  </span>
                  <ChevronRight
                    className="size-5 shrink-0 text-slate-400"
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
