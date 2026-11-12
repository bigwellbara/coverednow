import { Building2, Cake, HandHeart, Handshake } from "lucide-react";
import Link from "next/link";
import { formatMoney } from "@/modules/billing/domain/money";
import { CAMPAIGN_KINDS, type CampaignKind } from "@/modules/engagement/domain/campaign";
import type { CampaignView } from "@/modules/engagement/services/engagement-service";
import { ProgressBar } from "./progress-bar";

export const CAMPAIGN_ICONS: Record<CampaignKind, typeof HandHeart> = {
  CIRCLE: HandHeart,
  COMPANY: Building2,
  OCCASION: Cake,
};

export function CampaignCard({ campaign }: { campaign: CampaignView }) {
  const Icon = CAMPAIGN_ICONS[campaign.kind];
  const { progress } = campaign;
  const hasMatch = campaign.matchCheckedAt !== null && campaign.matcherName;

  return (
    <article className="group card relative flex flex-col gap-4 transition duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-xl motion-reduce:hover:translate-y-0">
      <div className="flex items-start justify-between gap-3">
        <span className="chip bg-brand-50 text-brand-800">
          <Icon className="size-3.5" aria-hidden />
          {CAMPAIGN_KINDS[campaign.kind].label}
        </span>
        {hasMatch && (
          <span className="chip bg-gold-100 text-gold-900">
            <Handshake className="size-3.5" aria-hidden />
            Matched
          </span>
        )}
      </div>
      <div>
        <h3 className="text-lg font-semibold text-slate-900">
          <Link href={`/campaigns/${campaign.slug}`} className="after:absolute after:inset-0">
            {campaign.title}
          </Link>
        </h3>
        <p className="text-sm text-slate-600">by {campaign.ownerName}</p>
      </div>
      <p className="line-clamp-3 text-sm text-slate-600">{campaign.story}</p>
      <div className="mt-auto space-y-2">
        <ProgressBar percent={progress.percent} label={`${progress.percent}% of the goal`} />
        <p className="flex justify-between gap-2 text-sm">
          <span>
            <strong className="text-brand-800">{formatMoney(progress.totalCents)}</strong>{" "}
            <span className="text-slate-600">of {formatMoney(campaign.goalCents)}</span>
          </span>
          <span className="text-slate-500">
            {campaign.totals.donors === 1 ? "1 donor" : `${campaign.totals.donors} donors`}
          </span>
        </p>
      </div>
    </article>
  );
}
