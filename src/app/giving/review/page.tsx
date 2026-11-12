import { CalendarHeart, GraduationCap, HandCoins, MapPin, School, Share2, Trophy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { CountUp } from "@/components/count-up";
import { EmptyState } from "@/components/empty-state";
import { heroButton, PageHero } from "@/components/page-hero";
import { formatDate, siteUrl, whatsAppShareUrl } from "@/lib/format";
import { delay } from "@/lib/motion";
import { formatMoney } from "@/modules/billing/domain/money";
import { harareDay } from "@/modules/billing/domain/public-bill";
import { getEngagementService } from "@/modules/engagement";
import { requireUser } from "@/modules/identity/adapters/session";

export const metadata: Metadata = { title: "Your year in review - CoveredNow", robots: { index: false } };
export const dynamic = "force-dynamic";

function Slide(props: { icon: ReactNode; tone: string; delayMs: number; children: ReactNode }) {
  return (
    <section
      className={`fade-up relative overflow-hidden rounded-3xl p-8 shadow-xl sm:p-10 ${props.tone}`}
      style={delay(props.delayMs)}
    >
      <span aria-hidden className="absolute -top-6 -right-6 opacity-15 [&>svg]:size-40">
        {props.icon}
      </span>
      <div className="relative">{props.children}</div>
    </section>
  );
}

export default async function YearInReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const user = await requireUser();
  const thisYear = Number(harareDay(new Date()).slice(0, 4));
  const asked = Number((await searchParams).year);
  const year = Number.isInteger(asked) && asked >= 2024 && asked <= thisYear ? asked : thisYear;
  const review = await getEngagementService().yearInReview(user.id, year);
  const firstName = user.name.split(/\s+/)[0] ?? user.name;

  const shareText = `My ${year} on CoveredNow: I helped ${review.students === 1 ? "a student" : `${review.students} students`} at ${
    review.schools.length === 1 ? "1 school" : `${review.schools.length} schools`
  } stay in class, with every dollar paid straight to the school. Join me: ${siteUrl("/browse")}`;

  return (
    <main>
      <PageHero
        width="3xl"
        eyebrow={`${year} in review`}
        title={`${firstName}, here's your year`}
        subtitle="Every number below is a student who stayed in class because of you."
      >
        <nav aria-label="Year" className="flex flex-wrap gap-2">
          {Array.from({ length: Math.min(3, thisYear - 2023) }, (_, i) => thisYear - i).map((option) => (
            <Link
              key={option}
              href={option === thisYear ? "/giving/review" : `/giving/review?year=${option}`}
              aria-current={option === year ? "page" : undefined}
              className={`inline-flex min-h-10 items-center rounded-lg px-4 text-sm font-semibold ${
                option === year ? "metal-champagne" : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              {option}
            </Link>
          ))}
        </nav>
      </PageHero>

      <div className="mx-auto max-w-3xl space-y-5 px-4 py-10">
        {review.gifts === 0 ? (
          <EmptyState
            icon={CalendarHeart}
            title={`No gifts in ${year} yet`}
            action={
              <Link href="/browse" className="btn-primary">
                Fund a bill
              </Link>
            }
          >
            Your year in review fills up as you give.
          </EmptyState>
        ) : (
          <>
            <Slide icon={<HandCoins />} tone="bg-gradient-to-br from-brand-700 to-brand-950 text-white" delayMs={200}>
              <p className="text-sm font-semibold tracking-wider text-gold-300 uppercase">You gave</p>
              <p className="mt-2 text-6xl font-semibold tracking-tight text-gold-400">
                <CountUp value={review.givenCents} format="money" delayMs={300} />
              </p>
              <p className="mt-2 text-lg text-brand-50/90">
                to schools, in {review.gifts === 1 ? "1 gift" : `${review.gifts} gifts`}.
                {review.firstGiftAt && ` Your first was on ${formatDate(review.firstGiftAt)}.`}
              </p>
            </Slide>

            <div className="grid gap-5 sm:grid-cols-2">
              <Slide icon={<GraduationCap />} tone="bg-gold-100 text-brand-950" delayMs={400}>
                <p className="text-5xl font-semibold">
                  <CountUp value={review.students} delayMs={500} />
                </p>
                <p className="mt-1 text-lg font-semibold">
                  {review.students === 1 ? "student supported" : "students supported"}
                </p>
                {review.billsFunded > 0 && (
                  <p className="mt-2 text-sm text-gold-900">
                    {review.billsFunded === 1 ? "1 bill" : `${review.billsFunded} bills`} you gave to
                    reached 100%.
                  </p>
                )}
              </Slide>
              <Slide icon={<School />} tone="bg-white text-slate-900 ring-1 ring-slate-200" delayMs={500}>
                <p className="text-5xl font-semibold text-brand-800">
                  <CountUp value={review.schools.length} delayMs={600} />
                </p>
                <p className="mt-1 text-lg font-semibold">
                  {review.schools.length === 1 ? "school" : "schools"}
                </p>
                <p className="mt-2 text-sm text-slate-600">{review.schools.join(", ")}</p>
              </Slide>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Slide icon={<MapPin />} tone="bg-brand-50 text-brand-950" delayMs={600}>
                <p className="text-sm font-semibold tracking-wider text-brand-700 uppercase">Where</p>
                <p className="mt-2 text-2xl font-semibold">{review.cities.join(", ")}</p>
              </Slide>
              <Slide icon={<Trophy />} tone="bg-brand-950 text-white" delayMs={700}>
                <p className="text-sm font-semibold tracking-wider text-gold-300 uppercase">Biggest gift</p>
                <p className="mt-2 text-3xl font-semibold text-gold-400">{formatMoney(review.biggestGiftCents)}</p>
                {review.busiestMonth && (
                  <p className="mt-2 text-sm text-brand-100">Your most generous month: {review.busiestMonth}.</p>
                )}
              </Slide>
            </div>

            <div className="fade-up flex flex-wrap justify-center gap-3 pt-4" style={delay(800)}>
              <a href={whatsAppShareUrl(shareText)} target="_blank" rel="noreferrer" className={heroButton}>
                <Share2 className="size-4" aria-hidden />
                Share your year
              </a>
              <Link href={`/giving/report?from=${year}-01-01&to=${year}-12-31`} className="btn-secondary">
                Full report for {year}
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
