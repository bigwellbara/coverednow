"use client";

import { LoaderCircle, Send } from "lucide-react";
import { useState } from "react";
import { FormFeedback } from "@/components/form-feedback";
import { useFormAction } from "@/components/use-form-action";
import { submitThankYouAction } from "./thank-you-actions";

export function ThankYouForm({ billId }: { billId: string }) {
  const { state, isPending, formRef, onSubmit } = useFormAction(submitThankYouAction, true);
  const [length, setLength] = useState(0);

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-3">
      <input type="hidden" name="billId" value={billId} />
      <label htmlFor="note" className="field-label">
        Your message to donors
      </label>
      <textarea
        id="note"
        name="body"
        required
        minLength={10}
        maxLength={500}
        rows={4}
        onChange={(event) => setLength(event.target.value.length)}
        placeholder="For example: Thank you! I sat all my exams this term and I'm working hard for my results."
        className="field-input"
      />
      <p className="flex justify-between gap-3 text-xs text-slate-500">
        <span>
          We check notes before they are shared. Please don&apos;t include your full name,
          phone number or bank details.
        </span>
        <span className="shrink-0 tabular-nums">{length}/500</span>
      </p>
      <FormFeedback state={state} />
      <button type="submit" disabled={isPending} className="btn-primary">
        {isPending ? (
          <LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden />
        ) : (
          <Send className="size-4" aria-hidden />
        )}
        Send thank-you
      </button>
    </form>
  );
}
