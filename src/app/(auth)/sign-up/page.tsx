import { redirect } from "next/navigation";
import { safeNextPath } from "@/modules/identity/domain/account";
import { currentUser } from "@/modules/identity/adapters/session";
import { PhoneAuthForm } from "../phone-auth-form";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; as?: string }>;
}) {
  const params = await searchParams;
  const next = safeNextPath(params.next);
  if (await currentUser()) redirect(next ?? "/dashboard");

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl font-bold">Create your account</h1>
      <p className="mt-1 mb-6 text-slate-600">
        You&apos;ll sign in with a code, sent by WhatsApp or email.
      </p>
      <PhoneAuthForm
        mode="sign-up"
        next={next}
        defaultRole={params.as === "donor" ? "DONOR" : "STUDENT"}
      />
    </main>
  );
}
