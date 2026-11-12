import { Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import { delay } from "@/lib/motion";
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
    <>
      <span className="pop-in mb-5 grid size-12 place-items-center rounded-2xl metal-champagne text-brand-950 shadow-lg">
        <Sparkles className="size-6" aria-hidden />
      </span>
      <h1 className="fade-up text-3xl font-semibold tracking-tight text-brand-900">
        Create your account
      </h1>
      <p className="fade-up mt-2 mb-6 text-slate-600" style={delay(80)}>
        You&apos;ll sign in with a code, sent by WhatsApp or email. No password to
        remember.
      </p>
      <div className="fade-up" style={delay(160)}>
        <PhoneAuthForm
          mode="sign-up"
          next={next}
          defaultRole={params.as === "donor" ? "DONOR" : "STUDENT"}
        />
      </div>
    </>
  );
}
