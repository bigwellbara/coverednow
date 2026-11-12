import { Plus, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import heroHandsRaised from "@/assets/home/hero-hands-raised.jpg";
import { CAMPAIGN_ICONS, CampaignCard } from "@/components/campaign-card";
import { EmptyState } from "@/components/empty-state";
import { heroButton, PageHero } from "@/components/page-hero";
import { stagger } from "@/lib/motion";
import { getEngagementService } from "@/modules/engagement";
import { CAMPAIGN_KINDS, type CampaignKind } from "@/modules/engagement/domain/campaign";

export const metadata: Metadata = {
  title: "Campaigns - CoveredNow",
  description:
    "Giving circles, company drives and birthday fundraisers that cover school fees together.",
};
export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const campaigns = await getEngagementService().listCampaigns();

  return (
    <main>
      <PageHero
        image={heroHandsRaised}
        eyebrow="Give together"
        title="Campaigns"
        subtitle="Alumni groups, churches, companies and birthday fundraisers, each covering school-confirmed fees as one team."
        actions={
          <Link href="/campaigns/new" className={heroButton}>
            <Plus className="size-4" aria-hidden />
            Start a campaign
          </Link>
        }
      />

      <div className="mx-auto max-w-6xl space-y-10 px-4 py-10">
        <ul className="grid gap-4 sm:grid-cols-3">
          {(Object.keys(CAMPAIGN_KINDS) as CampaignKind[]).map((kind, index) => {
            const Icon = CAMPAIGN_ICONS[kind];
            return (
              <li
                key={kind}
                className="fade-up flex gap-3 rounded-2xl border border-slate-200 bg-white p-4"
                style={stagger(index, 80, 200)}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gold-100 text-gold-700">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="text-sm">
                  <span className="block font-semibold text-slate-900">{CAMPAIGN_KINDS[kind].label}</span>
                  <span className="text-slate-600">{CAMPAIGN_KINDS[kind].description}</span>
                </span>
              </li>
            );
          })}
        </ul>

        {campaigns.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="Start the first campaign"
            action={
              <Link href="/campaigns/new" className="btn-primary">
                <Plus className="size-4" aria-hidden />
                Start a campaign
              </Link>
            }
          >
            Rally your alumni group, team or friends around a goal. Every gift still
            goes to a school-confirmed bill, paid straight to the school.
          </EmptyState>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((campaign, index) => (
              <div key={campaign.id} className="fade-up flex [&>article]:flex-1" style={stagger(index, 70, 300)}>
                <CampaignCard campaign={campaign} />
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
