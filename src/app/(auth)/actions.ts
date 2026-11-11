"use server";

import { headers } from "next/headers";
import { OtpRecipientUnreachableError, getOtpService } from "@/modules/identity";
import {
  parseSignInAddress,
  signUpDetailsSchema,
} from "@/modules/identity/domain/account";

export type RequestOtpResult =
  | { ok: true; address: string }
  | { ok: false; error: string };

/**
 * Sends a code whether or not the address has an account, so this form cannot be
 * used to find out who is registered.
 */
export async function requestOtpAction(input: {
  address: string;
  signUp?: { name: string; role: string };
}): Promise<RequestOtpResult> {
  const address = parseSignInAddress(input.address);
  if (!address) {
    return {
      ok: false,
      error: input.address.includes("@")
        ? "Please check your email address."
        : "Please enter a Zimbabwean mobile number, such as 077 123 4567.",
    };
  }
  if (input.signUp && !signUpDetailsSchema.safeParse(input.signUp).success) {
    return { ok: false, error: "Please check your name." };
  }

  // Relies on the hosting proxy setting these headers (Vercel and nginx can).
  const requestHeaders = await headers();
  const ip =
    requestHeaders.get("x-real-ip") ??
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";

  try {
    const result = await getOtpService().request(address.value, ip);
    if (!result.ok) {
      return {
        ok: false,
        error: "Too many codes requested. Please wait a few minutes and try again.",
      };
    }
    return { ok: true, address: address.value };
  } catch (error) {
    if (error instanceof OtpRecipientUnreachableError) {
      return {
        ok: false,
        error:
          "We couldn't find this number on WhatsApp. Please check it, or use your email address instead.",
      };
    }
    console.error("Could not send sign-in code", error);
    return {
      ok: false,
      error: "We couldn't send your code just now. Please try again shortly.",
    };
  }
}
