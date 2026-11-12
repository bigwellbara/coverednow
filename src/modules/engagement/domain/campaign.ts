import { z } from "zod";

export const CAMPAIGN_KINDS = {
  CIRCLE: {
    label: "Giving circle",
    description: "Alumni, a church, friends or family giving together.",
  },
  COMPANY: {
    label: "Company drive",
    description: "Staff, customers or partners giving as one team.",
  },
  OCCASION: {
    label: "Occasion fundraiser",
    description: "Ask for school fees instead of gifts, for a birthday or celebration.",
  },
} as const;

export type CampaignKind = keyof typeof CAMPAIGN_KINDS;

/** The smallest and largest goals, in cents. */
export const MIN_GOAL_CENTS = 5_000;
export const MAX_GOAL_CENTS = 100_000_000;

export const campaignInputSchema = z.object({
  kind: z.enum(Object.keys(CAMPAIGN_KINDS) as [CampaignKind, ...CampaignKind[]]),
  title: z.string().trim().min(5).max(80),
  story: z.string().trim().min(20).max(1500),
  goalCents: z.number().int().min(MIN_GOAL_CENTS).max(MAX_GOAL_CENTS),
  endsAt: z.date().nullable(),
});

export type CampaignInput = z.infer<typeof campaignInputSchema>;

/** "Harare Alumni '09 Drive!" -> "harare-alumni-09-drive". */
export function slugify(title: string): string {
  const slug = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
    .replace(/-+$/g, "");
  return slug || "campaign";
}

export type CampaignProgress = {
  raisedCents: number;
  /** What the matcher adds: as much as was raised, up to their cap. Zero until checked. */
  matchedCents: number;
  totalCents: number;
  percent: number;
  /** How much more the matcher would still add. */
  matchLeftCents: number;
};

export function campaignProgress(campaign: {
  goalCents: number;
  raisedCents: number;
  matchCapCents: number | null;
  matchChecked: boolean;
}): CampaignProgress {
  const cap = campaign.matchChecked ? (campaign.matchCapCents ?? 0) : 0;
  const matchedCents = Math.min(campaign.raisedCents, cap);
  const totalCents = campaign.raisedCents + matchedCents;
  return {
    raisedCents: campaign.raisedCents,
    matchedCents,
    totalCents,
    percent: campaign.goalCents > 0 ? Math.floor((totalCents / campaign.goalCents) * 100) : 0,
    matchLeftCents: Math.max(cap - matchedCents, 0),
  };
}

/** Open for gifts until the end of its last day, if it has one. */
export function isCampaignOpen(campaign: { endsAt: Date | null; hiddenAt: Date | null }, now: Date) {
  if (campaign.hiddenAt) return false;
  return campaign.endsAt === null || campaign.endsAt.getTime() >= now.getTime();
}
