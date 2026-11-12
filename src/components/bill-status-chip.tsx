import { BILL_STATUS_LABELS } from "@/modules/billing/domain/bill";
import type { BillStatus } from "@/modules/billing/domain/bill-status";

const TONES: Record<BillStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  PENDING_SCHOOL: "bg-sky-50 text-sky-800",
  SCHOOL_CONFIRMED: "bg-brand-50 text-brand-800",
  PARTIALLY_FUNDED: "bg-gold-100 text-gold-900",
  FUNDED: "bg-brand-700 text-white",
  PAID: "bg-brand-700 text-white",
  RECEIPT_CONFIRMED: "bg-brand-900 text-gold-200",
  REJECTED: "bg-amber-50 text-amber-900",
  EXPIRED: "bg-slate-100 text-slate-600",
  CANCELLED: "bg-slate-100 text-slate-600",
  DISPUTED: "bg-red-50 text-red-800",
};

const DOT: Partial<Record<BillStatus, string>> = {
  PENDING_SCHOOL: "bg-sky-500",
  PARTIALLY_FUNDED: "bg-gold-500",
  DISPUTED: "bg-red-500",
};

/** A bill's status, coloured by how far along it is. Waiting states get a pulsing dot. */
export function BillStatusChip({ status }: { status: BillStatus }) {
  const dot = DOT[status];
  return (
    <span className={`chip ${TONES[status]}`}>
      {dot && (
        <span aria-hidden className="relative flex size-2">
          <span className={`ping-soft absolute inline-flex size-full rounded-full ${dot}`} />
          <span className={`relative inline-flex size-2 rounded-full ${dot}`} />
        </span>
      )}
      {BILL_STATUS_LABELS[status]}
    </span>
  );
}
