"use server";

import { z } from "zod";
import type { FormActionState } from "@/components/use-form-action";
import { createEmailSender } from "@/lib/messaging/email";
import {
  PARTNER_BUDGETS,
  PARTNER_INTERESTS,
  type PartnerBudget,
  type PartnerInterest,
} from "./options";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null);

const enquirySchema = z.object({
  name: z.string().trim().min(2).max(100),
  organisation: optionalText(120),
  email: z.string().trim().email().max(200),
  phone: optionalText(30),
  interest: z.enum(Object.keys(PARTNER_INTERESTS) as [PartnerInterest, ...PartnerInterest[]]),
  budget: z
    .enum(Object.keys(PARTNER_BUDGETS) as [PartnerBudget, ...PartnerBudget[]])
    .or(z.literal("").transform(() => null)),
  message: optionalText(2000),
  // A field people never see. Bots that fill in every box fill this one too.
  website: z.string().max(0),
});

/** Keeps a header line on one line, whatever was typed. */
const oneLine = (text: string) => text.replace(/[\r\n]+/g, " ");

/**
 * Sends a partnership enquiry to the team. It goes to PARTNERS_EMAIL, or to
 * EMAIL_FROM if that isn't set. Nothing is stored.
 */
export async function sendPartnerEnquiryAction(
  _previous: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const parsed = enquirySchema.safeParse({
    name: formData.get("name") ?? "",
    organisation: formData.get("organisation") ?? "",
    email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? "",
    interest: formData.get("interest") ?? "",
    budget: formData.get("budget") ?? "",
    message: formData.get("message") ?? "",
    website: formData.get("website") ?? "",
  });
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    if (field === "website") return { success: "Thank you. We'll be in touch." };
    if (field === "email") return { error: "Please enter a valid email address." };
    if (field === "name") return { error: "Please enter your name." };
    return { error: "Please check your details and try again." };
  }

  const enquiry = parsed.data;
  const to = process.env.PARTNERS_EMAIL || process.env.EMAIL_FROM || "";
  const text = [
    "A new partnership enquiry from the CoveredNow website.",
    "",
    `Name: ${enquiry.name}`,
    `Organisation: ${enquiry.organisation ?? "-"}`,
    `Email: ${enquiry.email}`,
    `Phone: ${enquiry.phone ?? "-"}`,
    `Interested in: ${PARTNER_INTERESTS[enquiry.interest]}`,
    `Budget: ${enquiry.budget ? PARTNER_BUDGETS[enquiry.budget] : "-"}`,
    "",
    enquiry.message ?? "(No message)",
  ].join("\n");

  try {
    await createEmailSender().send({
      to,
      subject: oneLine(`Partnership enquiry: ${enquiry.organisation ?? enquiry.name}`),
      text,
    });
  } catch (error) {
    console.error("Couldn't send a partnership enquiry", error);
    return {
      error: "Sorry, we couldn't send your message just now. Please try again in a few minutes.",
    };
  }

  return {
    success: `Thank you, ${oneLine(enquiry.name)}. We'll get back to you at ${enquiry.email}.`,
  };
}
