import { redirect } from "next/navigation";
import { safeNextPath } from "@/modules/identity/domain/account";
import { currentUser } from "@/modules/identity/adapters/session";
import { PhoneAuthForm } from "../phone-auth-form";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const next = safeNextPath((await searchParams).next);
  if (await currentUser()) redirect(next ?? "/dashboard");

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl font-bold">Sign in</h1>
      <p className="mt-1 mb-6 text-slate-600">
        {next?.startsWith("/browse/")
          ? "Sign in to give. We'll bring you straight back to the bill."
          : "We'll send you a code by WhatsApp or email."}
      </p>
      <PhoneAuthForm mode="sign-in" next={next} />
    </main>
  );
}
