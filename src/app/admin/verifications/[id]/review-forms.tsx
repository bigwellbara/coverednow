"use client";

import { Check, X } from "lucide-react";
import { useActionState } from "react";
import { reviewVerificationAction } from "../actions";

export function ReviewForms({ id }: { id: string }) {
  const [state, action, isPending] = useActionState(reviewVerificationAction, {});

  return (
    <div className="space-y-6">
      {state.error && (
        <p role="alert" className="form-error">
          {state.error}
        </p>
      )}
      <form action={action}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="decision" value="APPROVED" />
        <button type="submit" disabled={isPending} className="btn-primary w-full">
          <Check className="size-4" aria-hidden />
          Approve
        </button>
      </form>
      <form action={action} className="space-y-3">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="decision" value="REJECTED" />
        <div>
          <label htmlFor="reason" className="field-label">
            What needs fixing? The applicant will see this.
          </label>
          <textarea
            id="reason"
            name="reason"
            required
            minLength={3}
            maxLength={500}
            rows={3}
            className="field-input"
          />
        </div>
        <button type="submit" disabled={isPending} className="btn-danger w-full">
          <X className="size-4" aria-hidden />
          Send back
        </button>
      </form>
    </div>
  );
}
