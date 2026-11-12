import { KeyRound } from "lucide-react";
import { redirect } from "next/navigation";
import { delay } from "@/lib/motion";
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
    <>
      <span className="pop-in mb-5 grid size-12 place-items-center rounded-2xl metal-graphite text-gold-300 shadow-lg">
        <KeyRound className="size-6" aria-hidden />
      </span>
      <h1 className="fade-up text-3xl font-semibold tracking-tight text-brand-900">
        Welcome back
      </h1>
      <p className="fade-up mt-2 mb-6 text-slate-600" style={delay(80)}>
        {next?.startsWith("/browse/")
          ? "Sign in to give. We'll bring you straight back to the bill."
          : "Sign in with a code we send by WhatsApp or email. No password needed."}
      </p>
      <div className="fade-up" style={delay(160)}>
        <PhoneAuthForm mode="sign-in" next={next} />
      </div>
    </>
  );
}
