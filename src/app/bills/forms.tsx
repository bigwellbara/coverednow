"use client";

import { FormFeedback } from "@/components/form-feedback";
import { useFormAction } from "@/components/use-form-action";
import { submitBillAction, withdrawBillAction } from "./actions";

export function NewBillForm(props: {
  schools: Array<{ id: string; label: string }>;
  terms: Array<{ value: string; label: string }>;
  minDueDate: string;
  regNumberLabel: string;
}) {
  const { state, isPending, formRef, onSubmit } = useFormAction(submitBillAction);

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="billerId" className="field-label">
          School
        </label>
        <select id="billerId" name="billerId" required className="field-input">
          {props.schools.map((school) => (
            <option key={school.id} value={school.id}>
              {school.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="regNumber" className="field-label">
          {props.regNumberLabel}
        </label>
        <input
          id="regNumber"
          name="regNumber"
          required
          maxLength={40}
          autoComplete="off"
          className="field-input"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="term" className="field-label">
            Term
          </label>
          <select
            id="term"
            name="term"
            required
            defaultValue=""
            className="field-input"
          >
            <option value="" disabled>
              Choose a term
            </option>
            {props.terms.map((term) => (
              <option key={term.value} value={term.value}>
                {term.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="amount" className="field-label">
            Amount owed (USD)
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
      </div>
      <div>
        <label htmlFor="dueDate" className="field-label">
          Due date
        </label>
        <input
          id="dueDate"
          name="dueDate"
          type="date"
          required
          min={props.minDueDate}
          className="field-input"
        />
      </div>
      <div>
        <label htmlFor="statement" className="field-label">
          Fee statement (PDF, JPEG or PNG, up to 5 MB)
        </label>
        <input
          id="statement"
          name="statement"
          type="file"
          required
          accept="application/pdf,image/jpeg,image/png"
          className="field-input"
        />
      </div>
      <FormFeedback state={state} />
      <button type="submit" disabled={isPending} className="btn-primary w-full">
        {isPending ? "Submitting..." : "Submit bill"}
      </button>
    </form>
  );
}

export function WithdrawBillForm({ billId }: { billId: string }) {
  const { state, isPending, formRef, onSubmit } =
    useFormAction(withdrawBillAction);

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-2">
      <input type="hidden" name="billId" value={billId} />
      <FormFeedback state={state} />
      <button type="submit" disabled={isPending} className="btn-secondary">
        Withdraw this bill
      </button>
    </form>
  );
}
