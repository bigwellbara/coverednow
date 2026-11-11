import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getBillService } from "@/modules/billing";
import { termOptions } from "@/modules/billing/domain/bill";
import { requireApplicant } from "@/modules/identity/adapters/session";
import { NewBillForm } from "../forms";

export default async function NewBillPage() {
  const owner = await requireApplicant();
  const service = getBillService();
  if (!(await service.canSubmit(owner))) redirect("/bills");

  const schools = await service.schoolsFor(owner);
  const now = new Date();

  return (
    <>
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <Link
          href="/bills"
          className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-brand-800"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to bills
        </Link>
        <h1 className="text-2xl font-bold">Submit a fee bill</h1>
        <p className="text-slate-600">
          We&apos;ll ask the school to confirm the amount. Donors only ever see the
          amount the school confirms, and any money goes straight to the school.
        </p>

        <section className="card">
          {schools.length === 0 ? (
            <p className="text-slate-600">
              No schools are available for your account yet. Please check back soon.
            </p>
          ) : (
            <NewBillForm
              schools={schools.map((school) => ({
                id: school.id,
                label: `${school.name}, ${school.city}`,
              }))}
              terms={termOptions(now)}
              minDueDate={now.toISOString().slice(0, 10)}
              regNumberLabel={
                owner.role === "GUARDIAN"
                  ? "The student's reg or admission number"
                  : "Your reg number"
              }
            />
          )}
        </section>
      </main>
    </>
  );
}
