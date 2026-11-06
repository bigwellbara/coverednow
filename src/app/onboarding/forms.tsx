"use client";

import { useActionState } from "react";
import {
  DOCUMENT_KIND_LABELS,
  type DocumentRequirement,
} from "@/modules/identity/domain/verification";
import {
  saveStudentAction,
  submitVerificationAction,
  uploadDocumentAction,
  type FormState,
} from "./actions";

function Feedback({ state }: { state: FormState }) {
  if (state.error) {
    return (
      <p role="alert" className="form-error">
        {state.error}
      </p>
    );
  }
  return state.success ? <p className="form-success">{state.success}</p> : null;
}

export function StudentDetailsForm(props: {
  defaults: { firstName: string; lastName: string; level: string } | null;
  levelLabel: string;
  levelPlaceholder: string;
}) {
  const [state, action, isPending] = useActionState(saveStudentAction, {});

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="firstName" className="field-label">
            First name
          </label>
          <input
            id="firstName"
            name="firstName"
            required
            maxLength={60}
            defaultValue={props.defaults?.firstName}
            className="field-input"
          />
        </div>
        <div>
          <label htmlFor="lastName" className="field-label">
            Surname
          </label>
          <input
            id="lastName"
            name="lastName"
            required
            maxLength={60}
            defaultValue={props.defaults?.lastName}
            className="field-input"
          />
        </div>
      </div>
      <div>
        <label htmlFor="level" className="field-label">
          {props.levelLabel}
        </label>
        <input
          id="level"
          name="level"
          required
          maxLength={40}
          placeholder={props.levelPlaceholder}
          defaultValue={props.defaults?.level}
          className="field-input"
        />
      </div>
      <Feedback state={state} />
      <button type="submit" disabled={isPending} className="btn-secondary">
        {isPending ? "Saving..." : "Save details"}
      </button>
    </form>
  );
}

export function DocumentUploadForm({
  requirement,
}: {
  requirement: DocumentRequirement;
}) {
  const [state, action, isPending] = useActionState(uploadDocumentAction, {});
  const selectId = `kind-${requirement.id}`;
  const fileId = `file-${requirement.id}`;

  return (
    <form action={action} className="space-y-3">
      {requirement.anyOf.length > 1 ? (
        <div>
          <label htmlFor={selectId} className="field-label">
            Document type
          </label>
          <select id={selectId} name="kind" className="field-input">
            {requirement.anyOf.map((kind) => (
              <option key={kind} value={kind}>
                {DOCUMENT_KIND_LABELS[kind]}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <input type="hidden" name="kind" value={requirement.anyOf[0]} />
      )}
      <div>
        <label htmlFor={fileId} className="field-label">
          File (PDF, JPEG or PNG, up to 5 MB)
        </label>
        <input
          id={fileId}
          name="file"
          type="file"
          required
          accept="application/pdf,image/jpeg,image/png"
          className="field-input"
        />
      </div>
      <Feedback state={state} />
      <button type="submit" disabled={isPending} className="btn-secondary">
        {isPending ? "Uploading..." : "Upload"}
      </button>
    </form>
  );
}

export function SubmitForm({ canSubmit }: { canSubmit: boolean }) {
  const [state, action, isPending] = useActionState(
    submitVerificationAction,
    {},
  );

  return (
    <form action={action} className="space-y-3">
      <Feedback state={state} />
      <button
        type="submit"
        disabled={isPending || !canSubmit}
        className="btn-primary w-full"
      >
        {isPending ? "Submitting..." : "Submit for review"}
      </button>
    </form>
  );
}
