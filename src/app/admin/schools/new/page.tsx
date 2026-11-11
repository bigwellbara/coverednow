import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { requireAdmin } from "@/modules/identity/adapters/session";
import { SchoolDetailsForm } from "../forms";

export default async function NewSchoolPage() {
  await requireAdmin();

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <Link
        href="/admin/schools"
        className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-brand-800"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to schools
      </Link>
      <h1 className="text-2xl font-bold">Add a school</h1>
      <section className="card">
        <SchoolDetailsForm />
      </section>
    </main>
  );
}
