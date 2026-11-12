import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHero } from "@/components/page-hero";
import { delay } from "@/lib/motion";
import { harareDay } from "@/modules/billing/domain/public-bill";
import type { CampaignKind } from "@/modules/engagement/domain/campaign";
import { currentUser } from "@/modules/identity/adapters/session";
import { CampaignForm } from "./campaign-form";

export const metadata: Metadata = { title: "Start a campaign - CoveredNow" };

export default async function NewCampaignPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent("/campaigns/new")}`);
  const { kind } = await searchParams;
  const defaultKind: CampaignKind =
    kind === "COMPANY" || kind === "OCCASION" ? kind : "CIRCLE";
  const tomorrow = harareDay(new Date(Date.now() + 24 * 60 * 60 * 1000));

  return (
    <main>
      <PageHero
        width="3xl"
        eyebrow="Give together"
        title="Start a campaign"
        subtitle="Set a goal, share the link, and watch your group keep students in class."
        overlap
      />
      <div className="mx-auto max-w-3xl px-4">
        <section className="fade-up card relative -mt-14 p-6 shadow-xl shadow-brand-950/10 sm:p-8" style={delay(300)}>
          <CampaignForm defaultKind={defaultKind} minDate={tomorrow} />
        </section>
      </div>
    </main>
  );
}
