import { Download, FileBarChart, Landmark, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { PrintButton } from "@/app/donations/[id]/client";
import { EmptyState } from "@/components/empty-state";
import { Logo } from "@/components/logo";
import { formatDate } from "@/lib/format";
import { delay } from "@/lib/motion";
import { formatMoney } from "@/modules/billing/domain/money";
import { getEngagementService } from "@/modules/engagement";
import { requireUser } from "@/modules/identity/adapters/session";
import { reportRange } from "./range";

export const metadata: Metadata = { title: "Giving report - CoveredNow", robots: { index: false } };
export const dynamic = "force-dynamic";

const day = (iso: string) => formatDate(new Date(`${iso}T12:00:00+02:00`));

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const user = await requireUser();
  const range = reportRange(await searchParams);
  const { gifts, totals } = await getEngagementService().report(user.id, { from: range.start, to: range.end });
  const query = `from=${range.from}&to=${range.to}`;

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-10 print:max-w-none print:py-0">
      <div className="fade-up flex flex-wrap items-end justify-between gap-4 print:hidden">
        <div>
          <p className="text-sm font-semibold tracking-wider text-gold-700 uppercase">Reports</p>
          <h1 className="text-3xl font-semibold text-slate-900">Your giving report</h1>
        </div>
        {/* A plain GET form, so a report can be bookmarked or shared with a finance team. */}
        <form method="get" className="flex flex-wrap items-end gap-2">
          <div>
            <label htmlFor="from" className="field-label">From</label>
            <input id="from" name="from" type="date" defaultValue={range.from} className="field-input" />
          </div>
          <div>
            <label htmlFor="to" className="field-label">To</label>
            <input id="to" name="to" type="date" defaultValue={range.to} className="field-input" />
          </div>
          <button type="submit" className="btn-secondary">Update</button>
        </form>
      </div>

      <article className="fade-up card space-y-8 p-6 sm:p-10 print:border-0 print:p-0 print:shadow-none" style={delay(150)}>
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <Logo />
            <h2 className="mt-3 text-2xl font-semibold text-slate-900">Giving report</h2>
            <p className="text-slate-600">
              {user.name} · {day(range.from)} to {day(range.to)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            <PrintButton />
            <a href={`/giving/report/csv?${query}`} className="btn-secondary">
              <Download className="size-4" aria-hidden />
              Download CSV
            </a>
          </div>
        </header>

        {gifts.length === 0 ? (
          <EmptyState icon={FileBarChart} title="No gifts in these dates">
            Try a wider date range.
          </EmptyState>
        ) : (
          <>
            <dl className="grid gap-3 sm:grid-cols-4">
              {[
                ["Paid to schools", formatMoney(totals.toSchoolsCents)],
                ["Students supported", String(totals.students)],
                ["Schools", String(totals.schools.length)],
                ["Gifts", String(totals.gifts)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-brand-50 p-4 print:border print:border-slate-200 print:bg-white">
                  <dt className="text-sm text-slate-600">{label}</dt>
                  <dd className="text-2xl font-semibold text-brand-900">{value}</dd>
                </div>
              ))}
            </dl>

            <section aria-labelledby="schools-heading">
              <h3 id="schools-heading" className="mb-3 font-semibold text-slate-900">By school</h3>
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="py-2 font-medium">School</th>
                    <th className="py-2 text-right font-medium">Students</th>
                    <th className="py-2 text-right font-medium">Paid to school</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {totals.schools.map((school) => (
                    <tr key={school.schoolName}>
                      <td className="py-2">{school.schoolName}</td>
                      <td className="py-2 text-right">{school.students}</td>
                      <td className="py-2 text-right font-medium">{formatMoney(school.amountCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section aria-labelledby="gifts-heading">
              <h3 id="gifts-heading" className="mb-3 font-semibold text-slate-900">Every gift</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 text-slate-500">
                    <tr>
                      <th className="py-2 pr-3 font-medium">Date</th>
                      <th className="py-2 pr-3 font-medium">Reference</th>
                      <th className="py-2 pr-3 font-medium">School and student</th>
                      <th className="py-2 pr-3 font-medium">Bill status</th>
                      <th className="py-2 text-right font-medium">To school</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {gifts.map((gift) => (
                      <tr key={gift.id}>
                        <td className="py-2 pr-3 whitespace-nowrap">{formatDate(gift.settledAt)}</td>
                        <td className="py-2 pr-3 font-mono text-xs">{gift.reference}</td>
                        <td className="py-2 pr-3">
                          {gift.bill ? `${gift.bill.schoolName}, ${gift.bill.term} · ${gift.bill.studentInitials} ${gift.bill.studentLevel}` : "School fees"}
                        </td>
                        <td className="py-2 pr-3">{gift.bill?.statusLabel ?? ""}</td>
                        <td className="py-2 text-right font-medium">{formatMoney(gift.amountCents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-right text-sm text-slate-600">
                Tips to CoveredNow {formatMoney(totals.tipsCents)} · Payment processing{" "}
                {formatMoney(totals.feesCents)}
              </p>
            </section>
          </>
        )}

        <footer className="space-y-2 border-t border-slate-200 pt-6 text-xs text-slate-500">
          <p className="flex gap-2">
            <ShieldCheck className="size-4 shrink-0 text-brand-700" aria-hidden />
            Every bill was confirmed by the school&apos;s bursar before it was listed.
          </p>
          <p className="flex gap-2">
            <Landmark className="size-4 shrink-0 text-brand-700" aria-hidden />
            Gifts are paid to each school&apos;s registered account, never to students. Students are shown by initials only.
          </p>
          <p>Generated {formatDate(new Date())}. Settled gifts only; refunded gifts are left out.</p>
        </footer>
      </article>
    </main>
  );
}
