import { CalendarClock, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { termLabel } from "@/modules/billing/domain/bill";
import { formatMoney } from "@/modules/billing/domain/money";
import {
  dueLabel,
  percentFunded,
  remainingCents,
  type PublicBill,
} from "@/modules/billing/domain/public-bill";
import { ProgressBar } from "./progress-bar";
import { SchoolIcon } from "./school-icon";

export function BillCard({ bill, now }: { bill: PublicBill; now: Date }) {
  const percent = percentFunded(bill);

  return (
    <article className="card relative flex flex-col gap-4 transition-shadow focus-within:ring-2 focus-within:ring-brand-700 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <span className="chip min-w-0 border border-slate-300 bg-white text-slate-700">
          <SchoolIcon type={bill.schoolType} className="size-3.5 shrink-0" />
          <span className="truncate">{bill.schoolName}</span>
        </span>
        <span className="chip shrink-0 bg-brand-50 text-brand-800">
          <ShieldCheck className="size-3.5" aria-hidden />
          School-verified
        </span>
      </div>

      <div>
        <h3 className="font-semibold text-slate-900">
          {/* One link, stretched over the card, so the whole card opens the bill. */}
          <Link href={`/browse/${bill.id}`} className="after:absolute after:inset-0">
            {termLabel(bill.term)} fees
          </Link>
        </h3>
        <p className="text-sm text-slate-600">
          {bill.studentInitials} · {bill.studentLevel}
        </p>
      </div>

      <div className="space-y-2">
        <p className="flex items-baseline justify-between gap-2">
          <span className="text-2xl font-bold text-brand-800">
            {formatMoney(remainingCents(bill))}
          </span>
          <span className="text-sm text-slate-600">still needed</span>
        </p>
        <ProgressBar percent={percent} label={`${percent}% funded`} />
        <p className="text-sm text-slate-600">
          {percent}% of {formatMoney(bill.confirmedCents)} funded
        </p>
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-3 text-sm">
        <span className="inline-flex items-center gap-1 text-slate-600">
          <CalendarClock className="size-4 shrink-0" aria-hidden />
          {bill.city} · {dueLabel(bill.dueDate, now)}
        </span>
        <span className="btn-primary min-h-9 px-4 py-1 text-sm" aria-hidden>
          Fund
        </span>
      </div>
    </article>
  );
}
