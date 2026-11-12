import { ArrowRight, CalendarClock, Coins, HandCoins, Quote, Sparkles } from "lucide-react";
import Link from "next/link";
import { quoteOfTheDay } from "@/lib/daily-quote";
import { getUsdRates } from "@/lib/exchange-rates";
import { timeAgo } from "@/lib/format";
import { stagger } from "@/lib/motion";
import { getBillService } from "@/modules/billing";
import { termLabel } from "@/modules/billing/domain/bill";
import { formatMoney } from "@/modules/billing/domain/money";
import { billOfTheDay, daysLeft, type PublicBill } from "@/modules/billing/domain/public-bill";
import { getPaymentService } from "@/modules/payments";
import { BillCard } from "./bill-card";
import { CountUp } from "./count-up";
import { CurrencyConverter } from "./currency-converter";

const AVATAR_TONES = [
  "bg-brand-100 text-brand-800",
  "bg-gold-100 text-gold-900",
  "bg-sky-100 text-sky-800",
  "bg-rose-100 text-rose-800",
];

/**
 * What's new on CoveredNow today: a featured student who changes daily, the
 * last day's giving, the latest gifts, today's exchange rates and a quote.
 */
export async function TodaySection({ open, now }: { open: PublicBill[]; now: Date }) {
  const payments = getPaymentService();
  const [lastDay, recent, rates] = await Promise.all([
    payments.settledSince(new Date(now.getTime() - 24 * 60 * 60 * 1000)),
    payments.listRecentGifts(6),
    getUsdRates(),
  ]);
  const recentBills = new Map(
    (await getBillService().findPublicMany([...new Set(recent.map((gift) => gift.billId))])).map(
      (bill) => [bill.id, bill],
    ),
  );
  const featured = billOfTheDay(open, now);
  const dueThisWeek = open.filter((bill) => daysLeft(bill.dueDate, now) <= 7).length;
  const quote = quoteOfTheDay(now);
  const today = now.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Africa/Harare",
  });

  return (
    <section className="mx-auto max-w-6xl px-4 pt-16" aria-labelledby="today-heading">
      <div className="reveal flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-semibold tracking-wider text-gold-700 uppercase">
            <span aria-hidden className="relative flex size-2.5">
              <span className="ping-soft absolute inline-flex size-full rounded-full bg-brand-500" />
              <span className="relative inline-flex size-2.5 rounded-full bg-brand-600" />
            </span>
            Today on CoveredNow
          </p>
          <h2 id="today-heading" className="mt-1 text-3xl font-semibold text-slate-900">
            {today}
          </h2>
        </div>
        <p className="max-w-sm text-sm text-slate-600">
          A new featured student every day, the latest gifts, and today&apos;s exchange
          rates.
        </p>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        {/* Featured student */}
        <div className="reveal flex flex-col gap-3">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Sparkles className="size-4 text-gold-600" aria-hidden />
            Featured student today
          </p>
          {featured ? (
            <div className="flex flex-1 [&>article]:flex-1">
              <BillCard bill={featured} now={now} />
            </div>
          ) : (
            <div className="card flex flex-1 items-center text-sm text-slate-600">
              Every confirmed bill is funded right now. Check back tomorrow.
            </div>
          )}
        </div>

        {/* The last 24 hours, and a quote */}
        <div className="reveal flex flex-col gap-5">
          <div className="card space-y-4 bg-gradient-to-br from-brand-700 to-brand-950 text-white">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-gold-300">
              <HandCoins className="size-4" aria-hidden />
              The last 24 hours
            </p>
            <p>
              <span className="block text-4xl font-semibold tracking-tight">
                <CountUp value={lastDay.amountCents} format="money" />
              </span>
              <span className="text-brand-100">
                raised in{" "}
                {lastDay.gifts === 1 ? "1 gift" : `${lastDay.gifts} gifts`}
              </span>
            </p>
            <Link
              href="/browse?sort=due-soon"
              className="group flex items-center justify-between gap-3 rounded-xl bg-white/10 p-3 text-sm ring-1 ring-white/15 transition hover:bg-white/15"
            >
              <span className="inline-flex items-center gap-2">
                <CalendarClock className="size-4 text-gold-300" aria-hidden />
                <span>
                  <strong>{dueThisWeek}</strong>{" "}
                  {dueThisWeek === 1 ? "bill is" : "bills are"} due within a week
                </span>
              </span>
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
            </Link>
          </div>

          <figure className="card relative flex-1 overflow-hidden">
            <Quote aria-hidden className="absolute -top-2 -right-2 size-20 rotate-180 text-gold-100" />
            <p className="relative text-xs font-semibold tracking-wider text-gold-700 uppercase">
              Words for today
            </p>
            <blockquote className="relative mt-2 text-lg leading-snug font-semibold text-slate-900">
              &ldquo;{quote.text}&rdquo;
            </blockquote>
            {quote.note && <p className="relative mt-1 text-sm text-slate-600 italic">{quote.note}</p>}
            <figcaption className="relative mt-3 text-sm text-slate-500">{quote.by}</figcaption>
          </figure>
        </div>

        {/* Latest gifts */}
        <div className="reveal card flex flex-col">
          <p className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
            <span aria-hidden className="relative flex size-2">
              <span className="ping-soft absolute inline-flex size-full rounded-full bg-gold-400" />
              <span className="relative inline-flex size-2 rounded-full bg-gold-500" />
            </span>
            Latest gifts
          </p>
          {recent.length === 0 ? (
            <p className="text-sm text-slate-600">
              No gifts yet.{" "}
              <Link href="/browse" className="font-medium text-brand-800 underline">
                Be the first
              </Link>
              .
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recent.map((gift, index) => {
                const bill = recentBills.get(gift.billId);
                const name = gift.displayName ?? "Anonymous";
                return (
                  <li
                    key={`${gift.billId}-${gift.settledAt.toISOString()}-${index}`}
                    className="fade-up flex items-start gap-3 py-2.5"
                    style={stagger(index, 80, 200)}
                  >
                    <span
                      aria-hidden
                      className={`grid size-9 shrink-0 place-items-center rounded-full text-xs font-semibold ${
                        AVATAR_TONES[index % AVATAR_TONES.length]
                      }`}
                    >
                      {name.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1 text-sm">
                      <span className="block text-slate-800">
                        <strong>{name}</strong> gave{" "}
                        <strong className="text-brand-800">{formatMoney(gift.amountCents)}</strong>
                      </span>
                      {bill ? (
                        <Link
                          href={`/browse/${bill.id}`}
                          className="block truncate text-slate-500 hover:text-brand-800 hover:underline"
                        >
                          {termLabel(bill.term)} fees, {bill.schoolName}
                        </Link>
                      ) : (
                        <span className="block text-slate-500">School fees</span>
                      )}
                    </span>
                    <span className="shrink-0 text-xs text-slate-400">
                      {timeAgo(gift.settledAt, now)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {rates && (
        <div className="reveal card mt-5 p-6 sm:p-8" id="currency">
          <h3 className="mb-5 inline-flex items-center gap-2 text-lg font-semibold text-slate-900">
            <span className="grid size-9 place-items-center rounded-xl bg-gold-100 text-gold-700">
              <Coins className="size-5" aria-hidden />
            </span>
            Today&apos;s exchange rates
          </h3>
          <CurrencyConverter rates={rates} />
        </div>
      )}
    </section>
  );
}
