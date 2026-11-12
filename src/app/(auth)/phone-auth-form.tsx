"use client";

import { GraduationCap, HeartHandshake, LoaderCircle, UsersRound } from "lucide-react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { AddressField, type AddressMethod } from "@/components/address-field";
import { requestOtpAction } from "./actions";

const SIGN_IN_ERRORS: Record<string, string> = {
  INVALID_CODE: "That code is wrong or has expired. Check it, or send a new one.",
  INVALID_DETAILS: "Please check your details and try again.",
  NO_ACCOUNT:
    "There's no account for this address yet. Please sign up first, or use the other way you signed up.",
};

const ROLE_CHOICES = [
  { value: "DONOR", label: "I want to help pay school fees", icon: HeartHandshake },
  { value: "STUDENT", label: "A university or college student", icon: GraduationCap },
  {
    value: "GUARDIAN",
    label: "A parent or guardian of a high school student",
    icon: UsersRound,
  },
] as const;

function Steps({ step }: { step: "details" | "code" }) {
  const items = ["Your details", "Enter code"];
  const current = step === "details" ? 0 : 1;
  return (
    <ol className="flex items-center gap-2 text-xs font-semibold" aria-label="Progress">
      {items.map((label, index) => (
        <li key={label} className="flex flex-1 items-center gap-2">
          <span
            className={`grid size-6 shrink-0 place-items-center rounded-full transition-colors duration-300 ${
              index <= current ? "bg-brand-700 text-white" : "bg-slate-200 text-slate-500"
            }`}
          >
            {index + 1}
          </span>
          <span className={index <= current ? "text-brand-900" : "text-slate-500"}>
            {label}
            {index === current && <span className="sr-only"> (current step)</span>}
          </span>
          {index < items.length - 1 && (
            <span aria-hidden className="h-0.5 flex-1 overflow-hidden rounded-full bg-slate-200">
              <span
                className={`block h-full bg-brand-600 transition-all duration-500 ${
                  current > index ? "w-full" : "w-0"
                }`}
              />
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}

export function PhoneAuthForm({
  mode,
  next,
  defaultRole = "STUDENT",
}: {
  mode: "sign-up" | "sign-in";
  /** A path already checked to be on this site. */
  next: string | null;
  defaultRole?: "STUDENT" | "GUARDIAN" | "DONOR";
}) {
  const isSignUp = mode === "sign-up";
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [step, setStep] = useState<"details" | "code">("details");
  const [name, setName] = useState("");
  const [role, setRole] = useState<string>(defaultRole);
  const [method, setMethod] = useState<AddressMethod>("WHATSAPP");
  const [address, setAddress] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const signUp = isSignUp ? { name, role } : undefined;

  const sendCode = () =>
    startTransition(async () => {
      setError(null);
      setNotice(null);
      const result = await requestOtpAction({ address, signUp });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setAddress(result.address);
      setCode("");
      setStep("code");
      setNotice(
        result.address.includes("@")
          ? `We emailed a 6-digit code to ${result.address}. If you can't see it, check your spam folder.`
          : `We sent a 6-digit code to ${result.address} on WhatsApp.`,
      );
    });

  const verifyCode = () =>
    startTransition(async () => {
      setError(null);
      const result = await signIn("phone-otp", {
        redirect: false,
        address,
        code,
        ...signUp,
      });
      if (!result?.ok) {
        setError(
          SIGN_IN_ERRORS[result?.error ?? ""] ??
            "We couldn't sign you in. Please try again.",
        );
        return;
      }
      router.replace(next ?? "/dashboard");
      router.refresh();
    });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (step === "details") sendCode();
    else verifyCode();
  };

  return (
    <form onSubmit={onSubmit} className="card space-y-5 p-6 shadow-xl shadow-brand-950/5">
      <Steps step={step} />
      {step === "details" ? (
        <>
          {isSignUp && (
            <>
              <fieldset>
                <legend className="field-label">Who is signing up?</legend>
                <div className="space-y-2">
                  {ROLE_CHOICES.map((choice) => (
                    <label
                      key={choice.value}
                      className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-slate-300 bg-white p-3 text-sm font-medium text-slate-700 transition hover:border-brand-300 has-checked:border-brand-700 has-checked:bg-brand-50 has-checked:text-brand-900 has-focus-visible:ring-2 has-focus-visible:ring-brand-700/40"
                    >
                      <input
                        type="radio"
                        name="role"
                        value={choice.value}
                        checked={role === choice.value}
                        onChange={() => setRole(choice.value)}
                        className="sr-only"
                      />
                      <span
                        className={`grid size-9 shrink-0 place-items-center rounded-lg transition-colors ${
                          role === choice.value
                            ? "bg-brand-700 text-gold-300"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        <choice.icon className="size-5" aria-hidden />
                      </span>
                      <span>{choice.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div>
                <label htmlFor="name" className="field-label">
                  Your full name
                </label>
                <input
                  id="name"
                  required
                  minLength={2}
                  maxLength={100}
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="field-input"
                />
              </div>
            </>
          )}
          <AddressField
            method={method}
            onMethodChange={(next) => {
              setMethod(next);
              setAddress("");
              setError(null);
            }}
            address={address}
            onAddressChange={setAddress}
          />
        </>
      ) : (
        <div className="fade-up">
          <label htmlFor="code" className="field-label">
            6-digit code
          </label>
          <input
            id="code"
            required
            autoFocus
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value)}
            className="field-input py-3 text-center font-mono text-2xl tracking-[0.5em]"
          />
        </div>
      )}

      {notice && !error && <p className="form-success">{notice}</p>}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}

      <button type="submit" disabled={isPending} className="btn-primary w-full py-3">
        {isPending && <LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden />}
        {step === "details" ? "Send code" : "Continue"}
      </button>

      {step === "code" && (
        <div className="flex justify-between gap-3 text-sm">
          <button
            type="button"
            className="min-h-11 font-medium text-brand-800 underline"
            onClick={() => {
              setError(null);
              setNotice(null);
              setStep("details");
            }}
          >
            Change address
          </button>
          <button
            type="button"
            disabled={isPending}
            className="min-h-11 font-medium text-brand-800 underline"
            onClick={sendCode}
          >
            Send a new code
          </button>
        </div>
      )}

      <p className="text-center text-sm text-slate-600">
        {isSignUp ? "Already have an account? " : "New to CoveredNow? "}
        <Link
          href={`${isSignUp ? "/sign-in" : "/sign-up"}${
            next ? `?next=${encodeURIComponent(next)}${isSignUp ? "" : "&as=donor"}` : ""
          }`}
          className="font-medium text-brand-800 underline"
        >
          {isSignUp ? "Sign in" : "Sign up"}
        </Link>
      </p>
    </form>
  );
}
