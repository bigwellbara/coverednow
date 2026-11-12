import { FileText, Plus, ReceiptText, ShieldAlert } from "lucide-react";
import Link from "next/link";
import teacherClass from "@/assets/home/teacher-class.jpg";
import { BillStatusChip } from "@/components/bill-status-chip";
import { EmptyState } from "@/components/empty-state";
import { ListRow } from "@/components/list-row";
import { heroButton, PageHero } from "@/components/page-hero";
import { getBillService } from "@/modules/billing";
import { termLabel } from "@/modules/billing/domain/bill";
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
    <main>
      <PageHero
        image={teacherClass}
        width="3xl"
        eyebrow="My bills"
        title="Fee bills"
        subtitle="Each bill is confirmed by the school before donors see it, and money goes straight to the school."
        actions={
          canSubmit && (
            <Link href="/bills/new" className={heroButton}>
              <Plus className="size-4" aria-hidden />
              New bill
            </Link>
          )
        }
      />

      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        {!canSubmit && (
          <div className="fade-up flex gap-3 rounded-2xl border border-gold-200 bg-gold-50 p-4 text-gold-900">
            <ShieldAlert className="size-5 shrink-0" aria-hidden />
            <p className="text-sm">
              You can submit a bill once your account is verified.{" "}
              <Link href="/onboarding" className="font-semibold underline">
                Check your verification
              </Link>
            </p>
          </div>
        )}

        {bills.length === 0 ? (
          canSubmit && (
            <EmptyState
              icon={ReceiptText}
              title="No bills yet"
              action={
                <Link href="/bills/new" className="btn-primary">
                  <Plus className="size-4" aria-hidden />
                  Submit your first bill
                </Link>
              }
            >
              Add your fee bill and we&apos;ll ask the school to confirm it. Once it&apos;s
              confirmed, donors can start covering it.
            </EmptyState>
          )
        ) : (
          <ul className="space-y-3">
            {bills.map((bill, index) => (
              <ListRow
                key={bill.id}
                index={index}
                href={`/bills/${bill.id}`}
                icon={<FileText className="size-5" aria-hidden />}
                title={bill.billerName}
                meta={`${termLabel(bill.term)}, ${formatMoney(bill.confirmedCents ?? bill.claimedCents)}`}
                status={<BillStatusChip status={bill.status} />}
              />
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
