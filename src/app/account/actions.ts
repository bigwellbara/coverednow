"use server";

import { revalidatePath } from "next/cache";
import { getAccountService } from "@/modules/identity";
import { requireUser } from "@/modules/identity/adapters/session";

export type AddAddressState = { error?: string; added?: boolean };

const MESSAGES = {
  INVALID_DETAILS: "Please check the address.",
  INVALID_CODE: "That code is wrong or has expired. Check it, or send a new one.",
  ALREADY_SET: "Your account already has this kind of sign-in method.",
  TAKEN: "That address is already used by another account.",
};

export async function addSignInMethodAction(input: {
  address: string;
  code: string;
}): Promise<AddAddressState> {
  const user = await requireUser();
  const result = await getAccountService().addAddress(user.id, input);
  if (!result.ok) return { error: MESSAGES[result.error] };

  revalidatePath("/account");
  return { added: true };
}
