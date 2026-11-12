import { ArrowLeft, Landmark, School, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { PageHero } from "@/components/page-hero";
import { delay, stagger } from "@/lib/motion";
import { getBillService } from "@/modules/billing";
import { termOptions } from "@/modules/billing/domain/bill";
import { requireApplicant } from "@/modules/identity/adapters/session";
import { NewBillForm } from "../forms";

const WHAT_HAPPENS = [
  { icon: School, text: "We ask the school's bursar to confirm the amount." },
  { icon: ShieldCheck, text: "Donors only ever see the amount the school confirms." },
  { icon: Landmark, text: "Any money raised is paid straight to the school." },
];

export default async function NewBillPage() {
  const owner = await requireApplicant();
  const service = getBillService();
  if (!(await service.canSubmit(owner))) redirect("/bills");

  const schools = await service.schoolsFor(owner);
  const now = new Date();

  return (
    <main>
      <PageHero
        width="3xl"
        eyebrow={
          <Link
            href="/bills"
            className="inline-flex min-h-11 items-center gap-1 tracking-normal text-brand-100 normal-case hover:text-white"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Back to bills
          </Link>
        }
        title="Submit a fee bill"
      >
        <ul className="grid gap-3 sm:grid-cols-3">
          {WHAT_HAPPENS.map((item, index) => (
            <li
              key={item.text}
              className="fade-up flex items-start gap-3 rounded-2xl bg-white/10 p-3 text-sm text-brand-50 ring-1 ring-white/15 backdrop-blur"
              style={stagger(index, 100, 350)}
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-lg metal-champagne">
                <item.icon className="size-4" aria-hidden />
              </span>
              {item.text}
            </li>
          ))}
        </ul>
      </PageHero>

      <div className="mx-auto max-w-3xl px-4 py-8">
        {schools.length === 0 ? (
          <EmptyState icon={School} title="No schools available yet">
            No schools are available for your account yet. Please check back soon.
          </EmptyState>
        ) : (
          <section className="fade-up card p-6" style={delay(500)}>
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
          </section>
        )}
      </div>
    </main>
  );
}
