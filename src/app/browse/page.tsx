import { HeartHandshake, SearchX, ShieldCheck, SlidersHorizontal } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import heroClassroom from "@/assets/home/hero-classroom.jpg";
import { BillCard } from "@/components/bill-card";
import { EmptyState } from "@/components/empty-state";
import { PageHero } from "@/components/page-hero";
import { delay, stagger } from "@/lib/motion";
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
  const clearHref =
    filter.sort === DEFAULT_FEED_FILTER.sort ? "/browse" : `/browse?sort=${filter.sort}`;

  return (
    <main>
      <PageHero
        image={heroClassroom}
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="size-4" aria-hidden />
            Every bill school-confirmed
          </span>
        }
        title="Browse bills"
        subtitle="Every bill here has been confirmed by the school. Your gift is paid to the school, never to the student."
        overlap
      />

      <div className="mx-auto max-w-6xl space-y-6 px-4">
        {/* A plain GET form, so filtering works without JavaScript and on slow links. */}
        <form
          method="get"
          className="fade-up card relative -mt-14 grid gap-3 p-5 shadow-xl shadow-brand-950/10 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto] lg:items-end"
          style={delay(350)}
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

        <p className="flex flex-wrap items-center gap-2 text-sm text-slate-600" aria-live="polite">
          <span className="chip bg-brand-700 px-3 py-1 text-white">
            {bills.length === 1 ? "1 bill" : `${bills.length} bills`}
          </span>
          {FEED_SORTS[filter.sort]}
          {isFiltered && (
            <>
              <span aria-hidden>·</span>
              <Link href={clearHref} className="font-medium text-brand-800 underline">
                Clear filters
              </Link>
            </>
          )}
        </p>

        {bills.length === 0 ? (
          isFiltered ? (
            <EmptyState
              icon={SearchX}
              title="No bills match these filters"
              action={
                <Link href={clearHref} className="btn-secondary">
                  Clear filters
                </Link>
              }
            >
              Try widening them to see more students who need help.
            </EmptyState>
          ) : (
            <EmptyState icon={HeartHandshake} title="Every confirmed bill is funded">
              Thank you. New bills appear here as schools confirm them.
            </EmptyState>
          )
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {bills.map((bill, index) => (
              <div
                key={bill.id}
                className="fade-up flex [&>article]:flex-1"
                style={stagger(index, 70, 400)}
              >
                <BillCard bill={bill} now={now} />
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
