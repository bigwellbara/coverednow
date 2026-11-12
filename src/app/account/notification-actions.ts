"use server";

import { revalidatePath } from "next/cache";
import { getEngagementService } from "@/modules/engagement";
import { requireUser } from "@/modules/identity/adapters/session";

export async function setNotificationsAction(on: boolean): Promise<void> {
  const user = await requireUser();
  await getEngagementService().setNotifications(user.id, on === true);
  revalidatePath("/account");
}
