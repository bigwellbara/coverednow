"use server";

import { redirect } from "next/navigation";
import { currentUser } from "@/modules/identity/adapters/session";
import { getPaymentService } from "@/modules/payments";

/** Development only. The service refuses unless the simulated gateway is in use. */
export async function simulatePaymentAction(formData: FormData) {
  const user = await currentUser();
  const reference = String(formData.get("reference") ?? "");
  const outcome = formData.get("outcome") === "PAID" ? "PAID" : "FAILED";

  const payments = getPaymentService();
  const donation = await payments.findByReference(reference);
  if (!user || donation?.donorId !== user.id) redirect("/giving");

  await payments.simulate(reference, outcome);
  redirect(`/donations/${donation.id}`);
}
