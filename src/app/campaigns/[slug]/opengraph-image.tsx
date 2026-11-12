import { SHARE_CARD_SIZE, shareCard } from "@/lib/share-card";
import { formatMoney } from "@/modules/billing/domain/money";
import { getEngagementService } from "@/modules/engagement";
import { CAMPAIGN_KINDS } from "@/modules/engagement/domain/campaign";

export const size = SHARE_CARD_SIZE;
export const contentType = "image/png";
export const alt = "A CoveredNow campaign";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const campaign = await getEngagementService().campaign((await params).slug, null);
  if (!campaign) {
    return shareCard({ eyebrow: "CoveredNow", title: "Give together", detail: "", percent: null });
  }
  return shareCard({
    eyebrow: `${CAMPAIGN_KINDS[campaign.kind].label} by ${campaign.ownerName}`,
    title: campaign.title,
    detail: campaign.matchCheckedAt && campaign.matcherName
      ? `Gifts matched by ${campaign.matcherName}`
      : `${campaign.totals.donors} ${campaign.totals.donors === 1 ? "donor" : "donors"} so far`,
    figure: `${formatMoney(campaign.progress.totalCents)} of ${formatMoney(campaign.goalCents)}`,
    percent: campaign.progress.percent,
  });
}
