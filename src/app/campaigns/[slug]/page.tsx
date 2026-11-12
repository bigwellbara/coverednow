import { EyeOff, Handshake, Heart, Share2, UsersRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CAMPAIGN_ICONS } from "@/components/campaign-card";
import { CountUp } from "@/components/count-up";
import { PageHero } from "@/components/page-hero";
import { ProgressBar } from "@/components/progress-bar";
import { formatDate, siteUrl, timeAgo, whatsAppShareUrl } from "@/lib/format";
import { delay, stagger } from "@/lib/motion";
import { getBillService } from "@/modules/billing";
import { termLabel } from "@/modules/billing/domain/bill";
import { formatMoney } from "@/modules/billing/domain/money";
import { DEFAULT_FEED_FILTER, remainingCents } from "@/modules/billing/domain/public-bill";
import { getEngagementService } from "@/modules/engagement";
import { CAMPAIGN_KINDS } from "@/modules/engagement/domain/campaign";
import { currentUser } from "@/modules/identity/adapters/session";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const campaign = await getEngagementService().campaign((await params).slug, null);
  if (!campaign) return { title: "Campaign not found - CoveredNow" };
  return {
    title: `${campaign.title} - CoveredNow`,
    description: `${formatMoney(campaign.progress.totalCents)} raised of ${formatMoney(campaign.goalCents)} for school fees, paid straight to schools.`,
  };
}

export default async function CampaignPage({ params }: Props) {
  const { slug } = await params;
  const user = await currentUser();
  const campaign = await getEngagementService().campaign(slug, user);
  if (!campaign) notFound();

  const now = new Date();
  const open = campaign.isOpen
    ? (await getBillService().listOpen({ ...DEFAULT_FEED_FILTER, sort: "almost-funded" })).slice(0, 6)
    : [];
  const Icon = CAMPAIGN_ICONS[campaign.kind];
  const { progress } = campaign;
  const hasMatch = campaign.matchCheckedAt !== null && campaign.matcherName && campaign.matchCapCents;
  const shareText = `Join "${campaign.title}" on CoveredNow. Every gift covers a student's school-confirmed fees, paid straight to the school: ${siteUrl(`/campaigns/${campaign.slug}`)}`;

  return (
    <main>
      <PageHero
        overlap
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <Icon className="size-4" aria-hidden />
            {CAMPAIGN_KINDS[campaign.kind].label} by {campaign.ownerName}
          </span>
        }
        title={campaign.title}
        actions={
          <a
            href={whatsAppShareUrl(shareText)}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary border-white/40 bg-white/10 text-white backdrop-blur hover:bg-white/20"
          >
            <Share2 className="size-4" aria-hidden />
            Share on WhatsApp
          </a>
        }
      />

      <div className="mx-auto grid max-w-6xl gap-6 px-4 lg:grid-cols-[1fr_22rem]">
        <div className="-mt-14 space-y-6">
          {campaign.hiddenAt && (
            <p className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <EyeOff className="size-5 shrink-0" aria-hidden />
              This campaign has been taken off the site. Only you and our team can see it.
            </p>
          )}

          <section className="fade-up card space-y-4 shadow-xl shadow-brand-950/10" style={delay(300)} aria-label="Progress">
            <p className="flex flex-wrap items-baseline justify-between gap-2">
              <span>
                <span className="text-4xl font-semibold tracking-tight text-brand-800">
                  <CountUp value={progress.totalCents} format="money" delayMs={400} />
                </span>{" "}
                <span className="text-slate-600">of {formatMoney(campaign.goalCents)} goal</span>
              </span>
              <span className="text-sm text-slate-600">
                {campaign.totals.donors === 1 ? "1 donor" : `${campaign.totals.donors} donors`}
              </span>
            </p>
            <ProgressBar percent={progress.percent} label={`${progress.percent}% of the goal`} size="lg" />
            <p className="text-sm text-slate-600">
              {campaign.endsAt
                ? campaign.isOpen
                  ? `Open until ${formatDate(campaign.endsAt)}.`
                  : `Ended on ${formatDate(campaign.endsAt)}. Thank you to everyone who gave.`
                : "Open until the goal is reached."}
            </p>
            {hasMatch && (
              <p className="flex gap-3 rounded-xl bg-gold-50 p-3 text-sm text-gold-900">
                <Handshake className="size-5 shrink-0" aria-hidden />
                <span>
                  <strong>{campaign.matcherName}</strong> has promised to match gifts, up to{" "}
                  {formatMoney(campaign.matchCapCents!)}.{" "}
                  {progress.matchLeftCents > 0
                    ? `${formatMoney(progress.matchLeftCents)} of matching is still available, so your gift goes twice as far.`
                    : "The full match has been reached."}{" "}
                  <span className="text-gold-800">Checked by CoveredNow.</span>
                </span>
              </p>
            )}
          </section>

          <section className="reveal card" aria-labelledby="story-heading">
            <h2 id="story-heading" className="mb-2 font-semibold">
              The story
            </h2>
            <p className="whitespace-pre-line text-slate-700">{campaign.story}</p>
          </section>

          {open.length > 0 && (
            <section className="reveal space-y-3" aria-labelledby="give-heading">
              <h2 id="give-heading" className="text-xl font-semibold text-slate-900">
                Give through this campaign
              </h2>
              <p className="text-sm text-slate-600">
                Choose a student. Your gift is paid to their school and counts toward this
                campaign&apos;s goal.
              </p>
              <ul className="grid gap-3 sm:grid-cols-2">
                {open.map((bill, index) => (
                  <li key={bill.id} className="fade-up" style={stagger(index, 60, 200)}>
                    <Link
                      href={`/browse/${bill.id}/give?campaign=${encodeURIComponent(campaign.slug)}`}
                      className="group card flex items-center gap-3 transition hover:border-brand-300 hover:shadow-md"
                    >
                      <span
                        aria-hidden
                        className="grid size-11 shrink-0 place-items-center rounded-full metal-graphite text-sm font-semibold text-white"
                      >
                        {bill.studentInitials.replaceAll(/[. ]/g, "")}
                      </span>
                      <span className="min-w-0 flex-1 text-sm">
                        <span className="block truncate font-semibold text-slate-900">{bill.schoolName}</span>
                        <span className="block text-slate-600">
                          {termLabel(bill.term)} · {formatMoney(remainingCents(bill))} needed
                        </span>
                      </span>
                      <span className="btn-primary min-h-9 shrink-0 px-3 py-1 text-sm transition group-hover:bg-gold-500 group-hover:text-brand-950">
                        <Heart className="size-3.5" aria-hidden />
                        Give
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="lg:sticky lg:top-20 lg:col-start-2 lg:row-start-1 lg:-mt-14 lg:self-start">
          <section className="fade-up card space-y-3 shadow-xl shadow-brand-950/10" style={delay(400)} aria-labelledby="supporters-heading">
            <h2 id="supporters-heading" className="flex items-center gap-2 font-semibold">
              <UsersRound className="size-5 text-brand-700" aria-hidden />
              Supporters
            </h2>
            {campaign.supporters.length === 0 ? (
              <p className="text-sm text-slate-600">Be the first to give through this campaign.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {campaign.supporters.map((supporter, index) => (
                  <li key={index} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="truncate font-medium text-slate-800">
                      {supporter.displayName ?? "Anonymous"}
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-semibold text-brand-800">{formatMoney(supporter.amountCents)}</span>
                      <span className="text-xs text-slate-500">{timeAgo(supporter.settledAt, now)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <a href={whatsAppShareUrl(shareText)} target="_blank" rel="noreferrer" className="btn-gold w-full">
              <Share2 className="size-4" aria-hidden />
              Invite people
            </a>
          </section>
        </aside>
      </div>
    </main>
  );
}
