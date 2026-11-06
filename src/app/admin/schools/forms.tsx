"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  BILLER_TYPES,
  BILLER_TYPE_LABELS,
  PAYOUT_METHODS,
  PAYOUT_METHOD_LABELS,
  type BillerDetails,
  type PayoutMethod,
} from "@/modules/billing/domain/biller";
import {
  addContactAction,
  createSchoolAction,
  removeContactAction,
  savePayoutAction,
  setSchoolVerifiedAction,
  updateSchoolAction,
  verifyContactAction,
  type SchoolFormState,
} from "./actions";

type SchoolAction = (
  previous: SchoolFormState,
  formData: FormData,
) => Promise<SchoolFormState>;

/**
 * React clears a form after every `action`, including a failed one, which would
 * wipe everything typed because of one mistake. This keeps the values on an
 * error, and clears the form after a save only when asked to.
 */
function useSchoolForm(action: SchoolAction, clearOnSuccess = false) {
  const [state, dispatch, isPending] = useActionState(action, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (clearOnSuccess && state.success) formRef.current?.reset();
  }, [state, clearOnSuccess]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  };

  return { state, isPending, formRef, onSubmit };
}

function Feedback({ state }: { state: SchoolFormState }) {
  if (state.error) {
    return (
      <p role="alert" className="form-error">
        {state.error}
      </p>
    );
  }
  return state.success ? <p className="form-success">{state.success}</p> : null;
}

function Field(props: {
  id: string;
  label: string;
  name?: string;
  type?: string;
  required?: boolean;
  maxLength?: number;
  placeholder?: string;
  defaultValue?: string;
}) {
  const { id, label, name = id, required = true, ...rest } = props;
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <input
        id={id}
        name={name}
        required={required}
        autoComplete="off"
        className="field-input"
        {...rest}
      />
    </div>
  );
}

export function SchoolDetailsForm({
  schoolId,
  defaults,
}: {
  schoolId?: string;
  defaults?: BillerDetails;
}) {
  const { state, isPending, formRef, onSubmit } = useSchoolForm(
    schoolId ? updateSchoolAction : createSchoolAction,
  );

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
      {schoolId && <input type="hidden" name="schoolId" value={schoolId} />}
      <Field
        id="name"
        label="Name"
        maxLength={150}
        defaultValue={defaults?.name}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="type" className="field-label">
            Type
          </label>
          <select
            id="type"
            name="type"
            defaultValue={defaults?.type}
            className="field-input"
          >
            {BILLER_TYPES.map((type) => (
              <option key={type} value={type}>
                {BILLER_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>
        <Field
          id="city"
          label="City or town"
          maxLength={80}
          defaultValue={defaults?.city}
        />
      </div>
      <Feedback state={state} />
      <button type="submit" disabled={isPending} className="btn-primary">
        {schoolId ? "Save details" : "Create school"}
      </button>
    </form>
  );
}

export function AddContactForm({ schoolId }: { schoolId: string }) {
  const { state, isPending, formRef, onSubmit } = useSchoolForm(
    addContactAction,
    true,
  );

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="schoolId" value={schoolId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="contact-name" name="name" label="Full name" maxLength={100} />
        <Field
          id="contact-role"
          name="roleTitle"
          label="Job title"
          maxLength={80}
          placeholder="Bursar"
        />
        <Field
          id="contact-phone"
          name="phone"
          type="tel"
          label="Mobile number"
          placeholder="077 123 4567"
        />
        <Field
          id="contact-email"
          name="email"
          type="email"
          label="Email (optional)"
          required={false}
        />
      </div>
      <Feedback state={state} />
      <button type="submit" disabled={isPending} className="btn-secondary">
        Add contact
      </button>
    </form>
  );
}

export function VerifyContactForm(props: {
  schoolId: string;
  contactId: string;
}) {
  const { state, isPending, formRef, onSubmit } =
    useSchoolForm(verifyContactAction);
  const noteId = `note-${props.contactId}`;

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-2">
      <input type="hidden" name="schoolId" value={props.schoolId} />
      <input type="hidden" name="contactId" value={props.contactId} />
      <div>
        <label htmlFor={noteId} className="field-label">
          How did you check this person?
        </label>
        <input
          id={noteId}
          name="note"
          required
          minLength={3}
          maxLength={300}
          placeholder="Called the number on the school's website"
          className="field-input"
        />
      </div>
      <Feedback state={state} />
      <button type="submit" disabled={isPending} className="btn-secondary">
        Mark as verified
      </button>
    </form>
  );
}

export function RemoveContactForm(props: {
  schoolId: string;
  contactId: string;
}) {
  const { state, isPending, formRef, onSubmit } =
    useSchoolForm(removeContactAction);

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-2">
      <input type="hidden" name="schoolId" value={props.schoolId} />
      <input type="hidden" name="contactId" value={props.contactId} />
      <Feedback state={state} />
      <button
        type="submit"
        disabled={isPending}
        className="min-h-11 text-sm font-medium text-red-800 underline"
      >
        Remove contact
      </button>
    </form>
  );
}

export function PayoutForm({
  schoolId,
  replacing,
}: {
  schoolId: string;
  replacing: boolean;
}) {
  const { state, isPending, formRef, onSubmit } = useSchoolForm(
    savePayoutAction,
    true,
  );
  const [method, setMethod] = useState<PayoutMethod>("BANK");

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="schoolId" value={schoolId} />
      <div>
        <label htmlFor="method" className="field-label">
          Method
        </label>
        <select
          id="method"
          name="method"
          value={method}
          onChange={(event) => setMethod(event.target.value as PayoutMethod)}
          className="field-input"
        >
          {PAYOUT_METHODS.map((option) => (
            <option key={option} value={option}>
              {PAYOUT_METHOD_LABELS[option]}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {method === "BANK" && (
          <>
            <Field id="bankName" label="Bank" maxLength={80} />
            <Field id="branch" label="Branch" maxLength={80} />
            <Field
              id="accountNumber"
              label="Account number"
              maxLength={30}
            />
          </>
        )}
        {method === "MOBILE_MONEY" && (
          <>
            <Field
              id="provider"
              label="Provider"
              maxLength={40}
              placeholder="EcoCash"
            />
            <Field id="number" type="tel" label="Mobile money number" />
          </>
        )}
        {method === "MERCHANT" && (
          <>
            <Field
              id="provider"
              label="Provider"
              maxLength={40}
              placeholder="EcoCash"
            />
            <Field id="merchantCode" label="Merchant code" maxLength={40} />
          </>
        )}
        <Field
          id="accountName"
          label="Account name (must be the school's)"
          maxLength={150}
        />
      </div>

      {replacing && (
        <p className="text-sm text-amber-800">
          Saving replaces the current details and removes this school&apos;s
          verified status until you check it again.
        </p>
      )}
      <Feedback state={state} />
      <button type="submit" disabled={isPending} className="btn-secondary">
        Save payout details
      </button>
    </form>
  );
}

export function SchoolVerificationForm({
  schoolId,
  verified,
}: {
  schoolId: string;
  verified: boolean;
}) {
  const { state, isPending, formRef, onSubmit } = useSchoolForm(
    setSchoolVerifiedAction,
  );

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-2">
      <input type="hidden" name="schoolId" value={schoolId} />
      <input type="hidden" name="verified" value={String(!verified)} />
      <Feedback state={state} />
      <button
        type="submit"
        disabled={isPending}
        className={verified ? "btn-secondary" : "btn-primary"}
      >
        {verified ? "Remove verified status" : "Verify school"}
      </button>
    </form>
  );
}
