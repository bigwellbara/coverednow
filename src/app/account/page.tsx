import { CircleCheck } from "lucide-react";
import { requireUser } from "@/modules/identity/adapters/session";
import { AddMethodForm } from "./add-method-form";

function Method({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      <CircleCheck className="size-4 shrink-0 text-brand-700" aria-hidden />
      <span className="text-slate-500">{label}:</span>
      <span className="min-w-0 break-all">{value}</span>
    </li>
  );
}

export default async function AccountPage() {
  const user = await requireUser();

  return (
    <>
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <h1 className="text-2xl font-bold">Your account</h1>

        <section className="card space-y-4" aria-labelledby="methods-heading">
          <h2 id="methods-heading" className="font-semibold">
            How you sign in
          </h2>
          <ul className="space-y-2">
            {user.phone && <Method label="WhatsApp" value={user.phone} />}
            {user.email && <Method label="Email" value={user.email} />}
          </ul>

          {user.phone && user.email ? (
            <p className="text-sm text-slate-600">
              To change either of these, please contact support.
            </p>
          ) : (
            <>
              <p className="text-sm text-slate-600">
                Add a second way to sign in, so you can still get in if you lose
                access to the first.
              </p>
              <AddMethodForm kind={user.email ? "PHONE" : "EMAIL"} />
            </>
          )}
        </section>
      </main>
    </>
  );
}
