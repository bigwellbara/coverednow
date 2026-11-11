import { redirect } from "next/navigation";
import { currentUser } from "@/modules/identity/adapters/session";
import { PhoneAuthForm } from "../phone-auth-form";

export default async function SignUpPage() {
  if (await currentUser()) redirect("/onboarding");

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl font-bold">Create your account</h1>
      <p className="mt-1 mb-6 text-slate-600">
        You&apos;ll sign in with a code, sent by WhatsApp or email.
      </p>
      <PhoneAuthForm mode="sign-up" />
    </main>
  );
}
