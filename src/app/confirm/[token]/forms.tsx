"use client";

import { Check, X } from "lucide-react";
import { FormFeedback } from "@/components/form-feedback";
import { useFormAction } from "@/components/use-form-action";
import { respondToBillAction } from "./actions";

export function ConfirmationForms(props: {
  token: string;
  claimedLabel: string;
}) {
  const { state, isPending, onSubmit } = useFormAction(respondToBillAction);

  const hidden = (decision: string) => (
    <>
      <input type="hidden" name="token" value={props.token} />
      <input type="hidden" name="decision" value={decision} />
    </>
  );

  return (
    <div className="space-y-6">
      <FormFeedback state={state} />

      <form onSubmit={onSubmit}>
        {hidden("CONFIRM")}
        <button type="submit" disabled={isPending} className="btn-primary w-full">
          <Check className="size-4" aria-hidden />
          Confirm {props.claimedLabel}
        </button>
      </form>

      <form onSubmit={onSubmit} className="space-y-3">
        {hidden("CORRECT")}
        <div>
          <label htmlFor="amount" className="field-label">
            Wrong amount? Enter the correct figure (USD)
          </label>
          <input
            id="amount"
            name="amount"
            required
            inputMode="decimal"
            placeholder="200.00"
            autoComplete="off"
            className="field-input"
          />
        </div>
        <button type="submit" disabled={isPending} className="btn-secondary w-full">
          Save the correct amount
        </button>
      </form>

      <form
        onSubmit={(event) => {
          if (window.confirm("Reject this bill as not your student?")) {
            onSubmit(event);
          } else {
            event.preventDefault();
          }
        }}
      >
        {hidden("REJECT")}
        <button type="submit" disabled={isPending} className="btn-danger w-full">
          <X className="size-4" aria-hidden />
          Not our student
        </button>
      </form>
    </div>
  );
}
