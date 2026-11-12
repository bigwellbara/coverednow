import { ArrowRight, CalendarClock, ShieldCheck } from "lucide-react";
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
    <article className="group card relative flex flex-col gap-4 overflow-hidden transition duration-300 focus-within:ring-2 focus-within:ring-brand-700 hover:-translate-y-1 hover:border-brand-200 hover:shadow-xl hover:shadow-brand-950/10 motion-reduce:hover:translate-y-0">
      {/* A strip of brand colour that slides in along the top on hover. */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-gradient-to-r from-gold-600 via-gold-400 to-gold-300 transition-transform duration-500 group-hover:scale-x-100"
      />
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

      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="grid size-11 shrink-0 place-items-center rounded-full metal-graphite text-sm font-semibold text-white shadow-md ring-2 ring-white"
        >
          {bill.studentInitials.replaceAll(/[. ]/g, "")}
        </span>
        <div className="min-w-0">
          <h3 className="font-semibold text-slate-900">
            {/* One link, stretched over the card, so the whole card opens the bill. */}
            <Link href={`/browse/${bill.id}`} className="after:absolute after:inset-0">
              {termLabel(bill.term)} fees
            </Link>
          </h3>
          <p className="truncate text-sm text-slate-600">
            {bill.studentInitials} · {bill.studentLevel}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="flex items-baseline justify-between gap-2">
          <span className="text-2xl font-semibold text-brand-800">
            {formatMoney(remainingCents(bill))}
          </span>
          <span className="text-sm text-slate-600">still needed</span>
        </p>
        <ProgressBar percent={percent} label={`${percent}% funded`} />
        <p className="text-sm text-slate-600">
          <span className="font-semibold text-slate-800">{percent}%</span> of{" "}
          {formatMoney(bill.confirmedCents)} funded
        </p>
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-3 text-sm">
        <span className="inline-flex min-w-0 items-center gap-1 text-slate-600">
          <CalendarClock className="size-4 shrink-0" aria-hidden />
          <span className="truncate">
            {bill.city} · {dueLabel(bill.dueDate, now)}
          </span>
        </span>
        <span
          className="btn-primary min-h-9 shrink-0 px-4 py-1 text-sm shadow-sm transition group-hover:bg-gold-500 group-hover:text-brand-950"
          aria-hidden
        >
          Fund
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </article>
  );
}
