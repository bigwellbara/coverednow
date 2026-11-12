import { Megaphone, Sparkles } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { ProgressBar } from "@/components/progress-bar";
import { formatDate } from "@/lib/format";
import { stagger } from "@/lib/motion";
import { formatMoney } from "@/modules/billing/domain/money";
import { getEngagementService } from "@/modules/engagement";
import { CAMPAIGN_KINDS } from "@/modules/engagement/domain/campaign";
import { requireAdmin } from "@/modules/identity/adapters/session";
import { AdminHeader } from "../admin-header";
import { HideForm, MatchForm } from "../engagement-forms";

export const dynamic = "force-dynamic";

export default async function AdminCampaignsPage() {
  await requireAdmin();
  const campaigns = await getEngagementService().allCampaignsForAdmin();

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <AdminHeader
        title="Campaigns"
        icon={<Megaphone className="size-5" aria-hidden />}
        meta={campaigns.length === 1 ? "1 campaign" : `${campaigns.length} campaigns`}
      />
      <p className="text-sm text-slate-600">
        Only save a match after confirming it in writing with the company or person, and
        agreeing how they will pay it. The match shows publicly as &ldquo;checked by
        CoveredNow&rdquo;.
      </p>
      {campaigns.length === 0 ? (
        <EmptyState icon={Sparkles} title="No campaigns yet">
          Campaigns appear here as soon as someone starts one.
        </EmptyState>
      ) : (
        <ul className="space-y-4">
          {campaigns.map((campaign, index) => (
            <li key={campaign.id} className="fade-up card space-y-4" style={stagger(index)}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link href={`/campaigns/${campaign.slug}`} className="text-lg font-semibold text-brand-900 underline">
                    {campaign.title}
                  </Link>
                  <p className="text-sm text-slate-600">
                    {CAMPAIGN_KINDS[campaign.kind].label} by {campaign.ownerName} · started{" "}
                    {formatDate(campaign.createdAt)}
                    {campaign.hiddenAt && " · off the site"}
                  </p>
                </div>
                <HideForm campaignId={campaign.id} hidden={campaign.hiddenAt !== null} />
              </div>
              <div className="space-y-1">
                <ProgressBar percent={campaign.progress.percent} label={`${campaign.progress.percent}% of goal`} />
                <p className="text-sm text-slate-600">
                  {formatMoney(campaign.progress.raisedCents)} raised
                  {campaign.progress.matchedCents > 0 && ` + ${formatMoney(campaign.progress.matchedCents)} matched`} of{" "}
                  {formatMoney(campaign.goalCents)} · {campaign.totals.gifts} gifts
                </p>
              </div>
              <MatchForm
                campaignId={campaign.id}
                matcherName={campaign.matcherName}
                cap={campaign.matchCapCents ? String(campaign.matchCapCents / 100) : ""}
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
