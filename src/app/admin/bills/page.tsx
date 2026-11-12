import { FileText, ReceiptText } from "lucide-react";
import { BillStatusChip } from "@/components/bill-status-chip";
import { EmptyState } from "@/components/empty-state";
import { ListRow } from "@/components/list-row";
import { getBillService } from "@/modules/billing";
import { termLabel } from "@/modules/billing/domain/bill";
import { formatMoney } from "@/modules/billing/domain/money";
import { requireAdmin } from "@/modules/identity/adapters/session";
import { AdminHeader } from "../admin-header";

export default async function AdminBillsPage() {
  await requireAdmin();
  const bills = await getBillService().listAll();

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <AdminHeader
        title="Bills"
        icon={<ReceiptText className="size-5" aria-hidden />}
        meta={bills.length === 1 ? "1 bill" : `${bills.length} bills`}
      />
      {bills.length === 0 ? (
        <EmptyState icon={ReceiptText} title="No bills yet">
          Bills appear here as students and guardians submit them.
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {bills.map((bill, index) => (
            <ListRow
              key={bill.id}
              index={index}
              href={`/admin/bills/${bill.id}`}
              icon={<FileText className="size-5" aria-hidden />}
              title={bill.billerName}
              meta={`${bill.regNumber}, ${termLabel(bill.term)}, ${formatMoney(bill.confirmedCents ?? bill.claimedCents)}`}
              status={<BillStatusChip status={bill.status} />}
            />
          ))}
        </ul>
      )}
    </main>
  );
}
