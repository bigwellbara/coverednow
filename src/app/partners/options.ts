/** What a company or philanthropist can ask us about. */
export const PARTNER_INTERESTS = {
  BILLS: "Funding students' bills directly",
  SCHOOL: "Adopting a school",
  CSR: "A CSR or foundation programme",
  STAFF: "A staff giving drive",
  OTHER: "Something else",
} as const;

export type PartnerInterest = keyof typeof PARTNER_INTERESTS;

/** Rough budgets, in US dollars, so we can come back with a fitting plan. */
export const PARTNER_BUDGETS = {
  UNDER_5K: "Under $5,000",
  "5K_25K": "$5,000 to $25,000",
  "25K_100K": "$25,000 to $100,000",
  OVER_100K: "Over $100,000",
  UNSURE: "Not sure yet",
} as const;

export type PartnerBudget = keyof typeof PARTNER_BUDGETS;
