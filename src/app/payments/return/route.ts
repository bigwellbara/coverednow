import { redirect } from "next/navigation";
import { getPaymentService } from "@/modules/payments";
import { isReference } from "@/modules/payments/domain/reference";

/**
 * Where Paynow sends the donor's browser back. It asks Paynow for the latest
 * status, in case the server-to-server result hasn't arrived yet, then shows
 * the donation. That page checks who is looking.
 */
export async function GET(request: Request) {
  const reference = new URL(request.url).searchParams.get("ref") ?? "";
  if (!isReference(reference)) redirect("/giving");

  const donation = await getPaymentService().refresh(reference);
  redirect(donation ? `/donations/${donation.id}` : "/giving");
}
