import {
  Award,
  ChevronRight,
  FileBarChart,
  HandCoins,
  Heart,
  Lock,
  ReceiptText,
  Sparkles,
  Sprout,
  Trophy,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import heroHandsRaised from "@/assets/home/hero-hands-raised.jpg";
import { CountUp } from "@/components/count-up";
import { EmptyState } from "@/components/empty-state";
import { heroButton, PageHero } from "@/components/page-hero";
import { formatDate } from "@/lib/format";
import { delay, stagger } from "@/lib/motion";
import { getBillService } from "@/modules/billing";
import { termLabel } from "@/modules/billing/domain/bill";
import { harareDay } from "@/modules/billing/domain/public-bill";
import { getEngagementService } from "@/modules/engagement";
import { formatMoney } from "@/modules/billing/domain/money";
import { requireUser } from "@/modules/identity/adapters/session";
import { getPaymentService } from "@/modules/payments";
import type { DonationStatus } from "@/modules/payments/services/payment-service";

export const metadata: Metadata = { title: "My giving - CoveredNow" };
export const dynamic = "force-dynamic";

const STATUS: Record<DonationStatus, { label: string; className: string }> = {
  INITIATED: { label: "Waiting for payment", className: "bg-gold-100 text-gold-900" },
  SETTLED: { label: "Paid", className: "bg-brand-50 text-brand-800" },
  FAILED: { label: "Didn't go through", className: "bg-slate-100 text-slate-700" },
  REFUNDED: { label: "Refunded", className: "bg-slate-100 text-slate-700" },
};

function Stat(props: { icon: ReactNode; value: ReactNode; label: string; delayMs: number }) {
  return (
    <div
      className="fade-up card flex items-center gap-4 shadow-xl shadow-brand-950/10"
      style={delay(props.delayMs)}
    >
      <span className="grid size-12 shrink-0 place-items-center rounded-2xl metal-champagne text-brand-950 shadow-md">
        {props.icon}
      </span>
      <div>
        <p className="text-2xl font-semibold tracking-tight text-brand-900">{props.value}</p>
        <p className="text-sm text-slate-600">{props.label}</p>
      </div>
    </div>
  );
}

export default async function GivingPage() {
  const user = await requireUser();
  const payments = getPaymentService();
  const [summary, donations] = await Promise.all([
    payments.donorSummary(user.id),
    payments.listForDonor(user.id),
  ]);
  const bills = new Map(
    (await getBillService().findPublicMany([...new Set(donations.map((d) => d.billId))])).map(
      (bill) => [bill.id, bill],
    ),
  );
  const iconClass = "size-6";
  const firstName = user.name.split(/\s+/)[0] ?? user.name;
  const badges = await getEngagementService().donorBadges(user.id);
  const thisYear = Number(harareDay(new Date()).slice(0, 4));

  return (
    <main>
      <PageHero
        image={heroHandsRaised}
        width="4xl"
        overlap
        eyebrow="My giving"
        title={`Welcome back, ${firstName}`}
        subtitle="Every gift here was paid to a school, to keep a student in class."
        actions={
          <Link href="/browse" className={heroButton}>
            <Heart className="size-4" aria-hidden />
            Fund a bill
          </Link>
        }
      />

      <div className="mx-auto max-w-4xl space-y-6 px-4">
        <div className="relative -mt-14 grid gap-3 sm:grid-cols-3">
          <Stat
            delayMs={300}
            icon={<HandCoins className={iconClass} aria-hidden />}
            value={<CountUp value={summary.givenCents} format="money" delayMs={400} />}
            label="given to schools"
          />
          <Stat
            delayMs={380}
            icon={<ReceiptText className={iconClass} aria-hidden />}
            value={<CountUp value={summary.billsSupported} delayMs={480} />}
            label={summary.billsSupported === 1 ? "bill supported" : "bills supported"}
          />
          <Stat
            delayMs={460}
            icon={<Heart className={iconClass} aria-hidden />}
            value={<CountUp value={summary.donations} delayMs={560} />}
            label={summary.donations === 1 ? "donation" : "donations"}
          />
        </div>

        {donations.length > 0 && (
          <nav aria-label="Your impact" className="fade-up grid gap-3 sm:grid-cols-3" style={delay(500)}>
            {[
              { href: `/giving/review`, icon: Sparkles, title: `Your ${thisYear} in review`, body: "The year's impact, ready to share." },
              { href: "/giving/report", icon: FileBarChart, title: "Reports", body: "Print or download, for any dates." },
              { href: "/leaderboard", icon: Trophy, title: "Leaderboard", body: "See where you stand this month." },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group card flex items-center gap-3 transition hover:border-brand-300 hover:shadow-md"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 transition-colors group-hover:bg-brand-700 group-hover:text-white">
                  <link.icon className="size-5" aria-hidden />
                </span>
                <span className="min-w-0 text-sm">
                  <span className="block font-semibold text-slate-900">{link.title}</span>
                  <span className="text-slate-600">{link.body}</span>
                </span>
              </Link>
            ))}
          </nav>
        )}

        <section className="fade-up card" style={delay(550)} aria-labelledby="badges-heading">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="badges-heading" className="font-semibold">
              Badges
            </h2>
            <p className="text-sm text-slate-500">
              {badges.filter((badge) => badge.earned).length} of {badges.length} earned
            </p>
          </div>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {badges.map((badge, index) => (
              <li
                key={badge.key}
                className={`pop-in flex flex-col items-center gap-2 rounded-2xl border p-4 text-center ${
                  badge.earned ? "border-gold-200 bg-gold-50" : "border-dashed border-slate-200 bg-slate-50/60"
                }`}
                style={stagger(index, 60, 600)}
              >
                <span
                  className={`grid size-12 place-items-center rounded-full ${
                    badge.earned
                      ? "metal-champagne text-brand-950 shadow-md"
                      : "bg-slate-200 text-slate-400"
                  }`}
                >
                  {badge.earned ? <Award className="size-6" aria-hidden /> : <Lock className="size-5" aria-hidden />}
                </span>
                <span className="text-sm font-semibold text-slate-900">
                  {badge.name}
                  <span className="sr-only">{badge.earned ? " (earned)" : " (not yet earned)"}</span>
                </span>
                <span className="text-xs text-slate-600">{badge.earned ? badge.description : badge.progress}</span>
              </li>
            ))}
          </ul>
        </section>

        {donations.length === 0 ? (
          <EmptyState
            icon={Sprout}
            title="Your first gift starts here"
            action={
              <Link href="/browse" className="btn-primary">
                <Heart className="size-4" aria-hidden />
                Find a bill to fund
              </Link>
            }
          >
            Pick a school-confirmed bill, give any amount, and it&apos;s paid straight to
            the school.
          </EmptyState>
        ) : (
          <section className="fade-up card p-0" style={delay(550)} aria-labelledby="history-heading">
            <h2 id="history-heading" className="border-b border-slate-100 px-5 py-4 font-semibold">
              Your donations
            </h2>
            <ul className="divide-y divide-slate-100">
              {donations.map((donation, index) => {
                const bill = bills.get(donation.billId);
                const status = STATUS[donation.status];
                return (
                  <li key={donation.id} className="fade-up" style={stagger(index, 50, 650)}>
                    <Link
                      href={`/donations/${donation.id}`}
                      className="group flex items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-brand-50/50"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700 transition-colors group-hover:bg-brand-700 group-hover:text-white">
                          <Heart className="size-4" aria-hidden />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium">
                            {bill ? `${bill.schoolName}, ${termLabel(bill.term)}` : "School fees"}
                          </span>
                          <span className="block text-sm text-slate-600">
                            {formatDate(donation.createdAt)} · {donation.reference}
                          </span>
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-3">
                        <span className="text-right">
                          <span className="block font-semibold">
                            {formatMoney(donation.amountCents)}
                          </span>
                          <span className={`chip ${status.className}`}>{status.label}</span>
                        </span>
                        <ChevronRight
                          className="size-5 text-slate-400 transition-transform group-hover:translate-x-1"
                          aria-hidden
                        />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
