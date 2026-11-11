"use client";

import { useState, useTransition, type FormEvent } from "react";
import { requestOtpAction } from "@/app/(auth)/actions";
import { addSignInMethodAction } from "./actions";

/** Proves a new phone or email with a code before it's added to the account. */
export function AddMethodForm({ kind }: { kind: "PHONE" | "EMAIL" }) {
  const isEmail = kind === "EMAIL";
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<"address" | "code">("address");
  const [address, setAddress] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      setError(null);
      if (step === "address") {
        const result = await requestOtpAction({ address });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setAddress(result.address);
        setStep("code");
        return;
      }
      const result = await addSignInMethodAction({ address, code });
      if (result.error) setError(result.error);
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {step === "address" ? (
        <div>
          <label htmlFor="new-address" className="field-label">
            {isEmail ? "Add an email address" : "Add a WhatsApp number"}
          </label>
          <input
            id="new-address"
            required
            type={isEmail ? "email" : "tel"}
            autoComplete={isEmail ? "email" : "tel"}
            placeholder={isEmail ? "you@example.com" : "077 123 4567"}
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            className="field-input"
          />
        </div>
      ) : (
        <div>
          <label htmlFor="new-code" className="field-label">
            Enter the 6-digit code sent to {address}
          </label>
          <input
            id="new-code"
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
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <button type="submit" disabled={isPending} className="btn-secondary">
        {step === "address" ? "Send code" : "Add to my account"}
      </button>
    </form>
  );
}
