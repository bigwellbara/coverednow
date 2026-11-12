import { Crown, Medal, Trophy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CampaignCard } from "@/components/campaign-card";
import { EmptyState } from "@/components/empty-state";
import { heroButton, PageHero } from "@/components/page-hero";
import { delay, stagger } from "@/lib/motion";
import { formatMoney } from "@/modules/billing/domain/money";
import { getEngagementService } from "@/modules/engagement";
import { LEADERBOARD_PERIODS, parsePeriod } from "@/modules/engagement/domain/leaderboard";

export const metadata: Metadata = { title: "Leaderboard - CoveredNow" };
export const dynamic = "force-dynamic";

const PODIUM = [
  { place: 1, ring: "ring-gold-400", tile: "from-gold-300 to-gold-500 text-brand-950", height: "sm:h-44", icon: Crown },
  { place: 2, ring: "ring-slate-300", tile: "from-slate-200 to-slate-400 text-slate-900", height: "sm:h-36", icon: Medal },
  { place: 3, ring: "ring-amber-600/50", tile: "from-amber-500 to-amber-700 text-white", height: "sm:h-28", icon: Medal },
];

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const period = parsePeriod((await searchParams).period);
  const service = getEngagementService();
  const [rows, campaigns] = await Promise.all([service.leaderboard(period), service.listCampaigns(6)]);
  const topCampaigns = [...campaigns].sort((a, b) => b.progress.totalCents - a.progress.totalCents).slice(0, 3);
  const top = rows.slice(0, 3);
  // The podium reads 2, 1, 3 from left to right on wide screens.
  const podiumOrder = [top[1], top[0], top[2]];

  return (
    <main>
      <PageHero
        eyebrow="Leaderboard"
        title="Top supporters"
        subtitle="The people keeping students in class, by the name they chose to give under. Anonymous gifts stay off the board."
        actions={
          <Link href="/browse" className={heroButton}>
            Get on the board
          </Link>
        }
      >
        <nav aria-label="Period" className="inline-flex rounded-xl bg-white/10 p-1 ring-1 ring-white/15">
          {Object.entries(LEADERBOARD_PERIODS).map(([value, label]) => (
            <Link
              key={value}
              href={value === "month" ? "/leaderboard" : `/leaderboard?period=${value}`}
              aria-current={value === period ? "page" : undefined}
              className={`inline-flex min-h-10 items-center rounded-lg px-4 text-sm font-semibold transition ${
                value === period ? "metal-champagne" : "text-brand-50 hover:bg-white/10"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </PageHero>

      <div className="mx-auto max-w-5xl space-y-12 px-4 py-10">
        {rows.length === 0 ? (
          <EmptyState
            icon={Trophy}
            title="The board is empty, for now"
            action={
              <Link href="/browse" className="btn-primary">
                Make the first gift
              </Link>
            }
          >
            Give under your name or a name you choose, and you&apos;ll appear here.
          </EmptyState>
        ) : (
          <>
            <ol className="grid items-end gap-4 sm:grid-cols-3" aria-label="Top three">
              {podiumOrder.map((row, slot) => {
                if (!row) return <li key={slot} aria-hidden className="hidden sm:block" />;
                const tier = PODIUM[row.rank - 1] ?? PODIUM[2]!;
                return (
                  <li
                    key={row.displayName + row.rank}
                    className={`pop-in flex flex-col items-center gap-3 ${row.rank === 1 ? "order-first sm:order-none" : ""}`}
                    style={delay(200 + (row.rank - 1) * 150)}
                  >
                    <span className={`relative grid size-20 place-items-center rounded-full bg-gradient-to-br text-2xl font-semibold shadow-xl ring-4 ${tier.tile} ${tier.ring}`}>
                      {row.displayName.charAt(0).toUpperCase()}
                      <tier.icon className="absolute -top-3 -right-2 size-8 rounded-full bg-white p-1 text-gold-600 shadow" aria-hidden />
                    </span>
                    <span className="text-center">
                      <span className="block font-semibold text-slate-900">{row.displayName}</span>
                      <span className="text-sm text-slate-600">
                        {row.students === 1 ? "1 student" : `${row.students} students`}
                      </span>
                    </span>
                    <span
                      className={`flex w-full flex-col items-center justify-start rounded-t-2xl bg-gradient-to-b from-brand-700 to-brand-900 pt-4 text-white h-24 ${tier.height}`}
                    >
                      <span className="text-3xl font-semibold">{row.rank}</span>
                      <span className="text-sm font-semibold text-gold-300">{formatMoney(row.givenCents)}</span>
                    </span>
                  </li>
                );
              })}
            </ol>

            {rows.length > 3 && (
              <ol className="card divide-y divide-slate-100 p-0" start={4}>
                {rows.slice(3).map((row, index) => (
                  <li
                    key={row.displayName + row.rank}
                    className="fade-up flex items-center gap-4 px-5 py-3"
                    style={stagger(index, 50, 600)}
                  >
                    <span className="w-8 text-center text-lg font-semibold text-slate-400">{row.rank}</span>
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-50 font-semibold text-brand-800">
                      {row.displayName.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-slate-900">{row.displayName}</span>
                      <span className="text-sm text-slate-500">
                        {row.gifts === 1 ? "1 gift" : `${row.gifts} gifts`} ·{" "}
                        {row.students === 1 ? "1 student" : `${row.students} students`}
                      </span>
                    </span>
                    <span className="font-semibold text-brand-800">{formatMoney(row.givenCents)}</span>
                  </li>
                ))}
              </ol>
            )}
          </>
        )}

        {topCampaigns.length > 0 && (
          <section className="reveal space-y-4" aria-labelledby="campaigns-heading">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 id="campaigns-heading" className="text-2xl font-semibold text-slate-900">
                Leading campaigns
              </h2>
              <Link href="/campaigns" className="font-semibold text-brand-800 hover:underline">
                All campaigns
              </Link>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {topCampaigns.map((campaign) => (
                <div key={campaign.id} className="flex [&>article]:flex-1">
                  <CampaignCard campaign={campaign} />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
