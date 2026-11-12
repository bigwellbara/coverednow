"use client";

import { LoaderCircle, Send } from "lucide-react";
import { FormFeedback } from "@/components/form-feedback";
import { useFormAction } from "@/components/use-form-action";
import { sendPartnerEnquiryAction } from "./actions";
import { PARTNER_BUDGETS, PARTNER_INTERESTS } from "./options";

export function EnquiryForm() {
  const { state, isPending, formRef, onSubmit } = useFormAction(
    sendPartnerEnquiryAction,
    true,
  );

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="field-label">
            Your name
          </label>
          <input id="name" name="name" required minLength={2} maxLength={100} autoComplete="name" className="field-input" />
        </div>
        <div>
          <label htmlFor="organisation" className="field-label">
            Company or foundation <span className="font-normal text-slate-500">(optional)</span>
          </label>
          <input id="organisation" name="organisation" maxLength={120} autoComplete="organization" className="field-input" />
        </div>
        <div>
          <label htmlFor="email" className="field-label">
            Email
          </label>
          <input id="email" name="email" type="email" required maxLength={200} autoComplete="email" className="field-input" />
        </div>
        <div>
          <label htmlFor="phone" className="field-label">
            Phone or WhatsApp <span className="font-normal text-slate-500">(optional)</span>
          </label>
          <input id="phone" name="phone" type="tel" maxLength={30} autoComplete="tel" className="field-input" />
        </div>
        <div>
          <label htmlFor="interest" className="field-label">
            I&apos;m interested in
          </label>
          <select id="interest" name="interest" required defaultValue="CSR" className="field-input">
            {Object.entries(PARTNER_INTERESTS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="budget" className="field-label">
            Rough budget <span className="font-normal text-slate-500">(optional)</span>
          </label>
          <select id="budget" name="budget" defaultValue="" className="field-input">
            <option value="">Prefer not to say</option>
            {Object.entries(PARTNER_BUDGETS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="message" className="field-label">
          Anything we should know? <span className="font-normal text-slate-500">(optional)</span>
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          maxLength={2000}
          placeholder="For example: the regions, school levels or causes your programme focuses on."
          className="field-input"
        />
      </div>
      {/* Hidden from people; only bots fill it in. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 overflow-hidden">
        <label htmlFor="website">Leave this empty</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <FormFeedback state={state} />

      <button type="submit" disabled={isPending} className="btn-primary w-full py-3 sm:w-auto sm:px-8">
        {isPending ? (
          <LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden />
        ) : (
          <Send className="size-4" aria-hidden />
        )}
        Send enquiry
      </button>
    </form>
  );
}
