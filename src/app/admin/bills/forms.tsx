"use client";

import { FormFeedback } from "@/components/form-feedback";
import { useFormAction } from "@/components/use-form-action";
import { rejectBillAction, resendLinksAction } from "./actions";

export function ResendLinksForm({ billId }: { billId: string }) {
  const { state, isPending, onSubmit } = useFormAction(resendLinksAction);

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <input type="hidden" name="billId" value={billId} />
      <FormFeedback state={state} />
      <button type="submit" disabled={isPending} className="btn-secondary">
        {isPending ? "Sending..." : "Send links again"}
      </button>
    </form>
  );
}

export function RejectBillForm({ billId }: { billId: string }) {
  const { state, isPending, onSubmit } = useFormAction(rejectBillAction);

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input type="hidden" name="billId" value={billId} />
      <div>
        <label htmlFor="reason" className="field-label">
          Why reject this bill? The owner will see this.
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
      <FormFeedback state={state} />
      <button type="submit" disabled={isPending} className="btn-danger">
        Reject bill
      </button>
    </form>
  );
}
