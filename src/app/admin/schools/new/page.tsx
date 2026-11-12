import { School } from "lucide-react";
import { requireAdmin } from "@/modules/identity/adapters/session";
import { AdminHeader } from "../../admin-header";
import { SchoolDetailsForm } from "../forms";

export default async function NewSchoolPage() {
  await requireAdmin();

  return (
    <main className="stagger-children mx-auto max-w-3xl space-y-6 px-4 py-8">
      <AdminHeader
        back={{ href: "/admin/schools", label: "Back to schools" }}
        icon={<School className="size-5" aria-hidden />}
        title="Add a school"
      />
      <section className="card p-6">
        <SchoolDetailsForm />
      </section>
    </main>
  );
}
