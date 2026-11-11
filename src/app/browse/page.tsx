import { SlidersHorizontal } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BillCard } from "@/components/bill-card";
import { getBillService } from "@/modules/billing";
import { BILLER_TYPES, BILLER_TYPE_LABELS } from "@/modules/billing/domain/biller";
import { formatMoney } from "@/modules/billing/domain/money";
import {
  DEFAULT_FEED_FILTER,
  FEED_AMOUNT_CAPS,
  FEED_SORTS,
  parseFeedFilter,
} from "@/modules/billing/domain/public-bill";

export const metadata: Metadata = { title: "Browse bills - CoveredNow" };
export const dynamic = "force-dynamic";

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filter = parseFeedFilter(await searchParams);
  const service = getBillService();
  const [bills, schools] = await Promise.all([
    service.listOpen(filter),
    service.listVerifiedSchools(),
  ]);
  const now = new Date();
  const isFiltered =
    filter.type !== null || filter.schoolId !== null || filter.maxRemainingCents !== null;

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold text-brand-900">Browse bills</h1>
        <p className="mt-1 text-slate-600">
          Every bill here has been confirmed by the school. Your gift is paid to the
          school, never to the student.
        </p>
      </div>

      {/* A plain GET form, so filtering works without JavaScript and on slow links. */}
      <form
        method="get"
        className="card grid gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto] lg:items-end"
        aria-label="Filter bills"
      >
        <div>
          <label htmlFor="type" className="field-label">
            Level
          </label>
          <select id="type" name="type" defaultValue={filter.type ?? ""} className="field-input">
            <option value="">All levels</option>
            {BILLER_TYPES.map((type) => (
              <option key={type} value={type}>
                {BILLER_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="school" className="field-label">
            School
          </label>
          <select
            id="school"
            name="school"
            defaultValue={filter.schoolId ?? ""}
            className="field-input"
          >
            <option value="">All schools</option>
            {schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="max" className="field-label">
            Still needed
          </label>
          <select
            id="max"
            name="max"
            defaultValue={filter.maxRemainingCents ?? ""}
            className="field-input"
          >
            <option value="">Any amount</option>
            {FEED_AMOUNT_CAPS.map((cap) => (
              <option key={cap} value={cap}>
                Up to {formatMoney(cap).replace(/\.00$/, "")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="sort" className="field-label">
            Sort by
          </label>
          <select id="sort" name="sort" defaultValue={filter.sort} className="field-input">
            {Object.entries(FEED_SORTS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-primary">
          <SlidersHorizontal className="size-4" aria-hidden />
          Apply
        </button>
      </form>

      <p className="text-sm text-slate-600" aria-live="polite">
        {bills.length === 1 ? "1 bill" : `${bills.length} bills`} ·{" "}
        {FEED_SORTS[filter.sort]}
        {isFiltered && (
          <>
            {" · "}
            <Link
              href={
                filter.sort === DEFAULT_FEED_FILTER.sort ? "/browse" : `/browse?sort=${filter.sort}`
              }
              className="font-medium text-brand-800 underline"
            >
              Clear filters
            </Link>
          </>
        )}
      </p>

      {bills.length === 0 ? (
        <div className="card text-center text-slate-600">
          {isFiltered
            ? "No open bills match these filters. Try widening them."
            : "Every confirmed bill is funded right now. Thank you. New bills appear here as schools confirm them."}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bills.map((bill) => (
            <BillCard key={bill.id} bill={bill} now={now} />
          ))}
        </div>
      )}
    </main>
  );
}
