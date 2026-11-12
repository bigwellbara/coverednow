import { FlaskConical, Lock } from "lucide-react";
import { notFound } from "next/navigation";
import { delay } from "@/lib/motion";
import { formatMoney } from "@/modules/billing/domain/money";
import { requireUser } from "@/modules/identity/adapters/session";
import { getPaymentService } from "@/modules/payments";
import { simulatePaymentAction } from "./actions";

/** Stands in for Paynow's page in development. Never available with real payments. */
export default async function SimulatePaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const payments = getPaymentService();
  if (payments.gatewayName !== "simulated") notFound();

  const user = await requireUser();
  const donation = await payments.findByReference((await searchParams).ref ?? "");
  if (donation?.donorId !== user.id) notFound();

  return (
    <main className="mx-auto max-w-md space-y-6 px-4 py-12">
      <div className="fade-up flex gap-3 rounded-2xl border-2 border-dashed border-gold-500 bg-gold-50 p-4 text-gold-900">
        <FlaskConical className="size-6 shrink-0" aria-hidden />
        <p className="text-sm">
          <strong>Test payment.</strong> Paynow isn&apos;t set up, so this page stands in
          for it. No money moves.
        </p>
      </div>

      <section
        className="fade-up card space-y-5 overflow-hidden p-0 text-center shadow-xl shadow-brand-950/10"
        style={delay(120)}
      >
        <div className="bg-gradient-to-br from-brand-700 to-brand-950 px-6 py-8 text-white">
          <p className="text-sm text-brand-100">Reference {donation.reference}</p>
          <p className="pop-in mt-2 text-5xl font-semibold tracking-tight" style={delay(250)}>
            {formatMoney(donation.totalCents)}
          </p>
        </div>
        <form action={simulatePaymentAction} className="grid gap-3 px-6 pb-6">
          <input type="hidden" name="reference" value={donation.reference} />
          <button type="submit" name="outcome" value="PAID" className="btn-primary py-3">
            <Lock className="size-4" aria-hidden />
            Pay (simulated)
          </button>
          <button type="submit" name="outcome" value="FAILED" className="btn-secondary">
            Cancel payment
          </button>
        </form>
      </section>
    </main>
  );
}
