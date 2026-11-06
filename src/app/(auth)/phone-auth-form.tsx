"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { requestOtpAction } from "./actions";

const SIGN_IN_ERRORS: Record<string, string> = {
  INVALID_CODE: "That code is wrong or has expired. Check it, or send a new one.",
  INVALID_DETAILS: "Please check your details and try again.",
  NO_ACCOUNT: "There's no account for this number yet. Please sign up first.",
};

export function PhoneAuthForm({ mode }: { mode: "sign-up" | "sign-in" }) {
  const isSignUp = mode === "sign-up";
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [step, setStep] = useState<"details" | "code">("details");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("STUDENT");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const signUp = isSignUp ? { name, email, role } : undefined;

  const sendCode = () =>
    startTransition(async () => {
      setError(null);
      setNotice(null);
      const result = await requestOtpAction({ phone, signUp });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPhone(result.phone);
      setCode("");
      setStep("code");
      setNotice(`We sent a 6-digit code to ${result.phone} on WhatsApp.`);
    });

  const verifyCode = () =>
    startTransition(async () => {
      setError(null);
      const result = await signIn("phone-otp", {
        redirect: false,
        phone,
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
      router.replace("/onboarding");
      router.refresh();
    });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (step === "details") sendCode();
    else verifyCode();
  };

  return (
    <form onSubmit={onSubmit} className="card space-y-4">
      {step === "details" ? (
        <>
          {isSignUp && (
            <>
              <fieldset>
                <legend className="field-label">Who is signing up?</legend>
                <div className="space-y-2">
                  <label className="flex min-h-11 items-start gap-2 text-sm">
                    <input
                      type="radio"
                      name="role"
                      value="STUDENT"
                      checked={role === "STUDENT"}
                      onChange={() => setRole("STUDENT")}
                      className="mt-1"
                    />
                    <span>A university or college student</span>
                  </label>
                  <label className="flex min-h-11 items-start gap-2 text-sm">
                    <input
                      type="radio"
                      name="role"
                      value="GUARDIAN"
                      checked={role === "GUARDIAN"}
                      onChange={() => setRole("GUARDIAN")}
                      className="mt-1"
                    />
                    <span>A parent or guardian of a high school student</span>
                  </label>
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
              <div>
                <label htmlFor="email" className="field-label">
                  Email address (optional)
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="field-input"
                />
              </div>
            </>
          )}
          <div>
            <label htmlFor="phone" className="field-label">
              WhatsApp number
            </label>
            <input
              id="phone"
              type="tel"
              required
              autoComplete="tel"
              placeholder="077 123 4567"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="field-input"
            />
          </div>
        </>
      ) : (
        <div>
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
            className="field-input tracking-widest"
          />
        </div>
      )}

      {notice && !error && <p className="form-success">{notice}</p>}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}

      <button type="submit" disabled={isPending} className="btn-primary w-full">
        {step === "details" ? "Send code" : "Continue"}
      </button>

      {step === "code" && (
        <div className="flex justify-between text-sm">
          <button
            type="button"
            className="min-h-11 font-medium text-emerald-800 underline"
            onClick={() => {
              setError(null);
              setNotice(null);
              setStep("details");
            }}
          >
            Change number
          </button>
          <button
            type="button"
            disabled={isPending}
            className="min-h-11 font-medium text-emerald-800 underline"
            onClick={sendCode}
          >
            Send a new code
          </button>
        </div>
      )}

      <p className="text-center text-sm text-slate-600">
        {isSignUp ? "Already have an account? " : "New to CoveredNow? "}
        <Link
          href={isSignUp ? "/sign-in" : "/sign-up"}
          className="font-medium text-emerald-800 underline"
        >
          {isSignUp ? "Sign in" : "Sign up"}
        </Link>
      </p>
    </form>
  );
}
