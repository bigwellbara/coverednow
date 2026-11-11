import { FlaskConical } from "lucide-react";
import { notFound } from "next/navigation";
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
    <main className="mx-auto max-w-md space-y-6 px-4 py-10">
      <div className="flex gap-3 rounded-2xl border-2 border-dashed border-gold-500 bg-gold-50 p-4 text-gold-900">
        <FlaskConical className="size-6 shrink-0" aria-hidden />
        <p className="text-sm">
          <strong>Test payment.</strong> Paynow isn&apos;t set up, so this page stands in
          for it. No money moves.
        </p>
      </div>

      <section className="card space-y-4 text-center">
        <p className="text-sm text-slate-600">Reference {donation.reference}</p>
        <p className="text-4xl font-bold text-brand-900">{formatMoney(donation.totalCents)}</p>
        <form action={simulatePaymentAction} className="grid gap-3">
          <input type="hidden" name="reference" value={donation.reference} />
          <button type="submit" name="outcome" value="PAID" className="btn-primary">
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
