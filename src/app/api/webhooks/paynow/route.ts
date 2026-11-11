import { getPaymentService } from "@/modules/payments";

/**
 * Paynow posts each payment's status here, signed with our integration key. The
 * signature is checked before anything changes, and repeats are harmless.
 */
export async function POST(request: Request) {
  const body = await request.text();
  if (body.length > 10_000) return new Response("Too large", { status: 413 });

  try {
    const accepted = await getPaymentService().handleCallback(body);
    return new Response(accepted ? "OK" : "Invalid signature", {
      status: accepted ? 200 : 400,
    });
  } catch (error) {
    // A 500 makes Paynow send the result again later.
    console.error("Paynow result could not be processed", error);
    return new Response("Error", { status: 500 });
  }
}
