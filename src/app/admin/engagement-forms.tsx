"use client";

import { Check, EyeOff, Eye, X } from "lucide-react";
import { FormFeedback } from "@/components/form-feedback";
import { useFormAction } from "@/components/use-form-action";
import { reviewNoteAction, setHiddenAction, setMatchAction } from "./engagement-actions";

export function ReviewNoteForm({ noteId }: { noteId: string }) {
  const { state, isPending, onSubmit } = useFormAction(reviewNoteAction);
  if (state.success) return <FormFeedback state={state} />;
  return (
    <div className="space-y-2">
      <FormFeedback state={state} />
      <div className="flex flex-wrap gap-2">
        {(["APPROVED", "REJECTED"] as const).map((decision) => (
          <form key={decision} onSubmit={onSubmit}>
            <input type="hidden" name="noteId" value={noteId} />
            <input type="hidden" name="decision" value={decision} />
            <button
              type="submit"
              disabled={isPending}
              className={decision === "APPROVED" ? "btn-primary" : "btn-secondary"}
            >
              {decision === "APPROVED" ? <Check className="size-4" aria-hidden /> : <X className="size-4" aria-hidden />}
              {decision === "APPROVED" ? "Approve and send" : "Don't share"}
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}

export function MatchForm(props: { campaignId: string; matcherName: string | null; cap: string }) {
  const { state, isPending, onSubmit } = useFormAction(setMatchAction);
  return (
    <div className="space-y-2">
      <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="campaignId" value={props.campaignId} />
        <div>
          <label htmlFor={`matcher-${props.campaignId}`} className="field-label">Matched by</label>
          <input
            id={`matcher-${props.campaignId}`}
            name="matcherName"
            defaultValue={props.matcherName ?? ""}
            placeholder="Acme Ltd"
            className="field-input"
          />
        </div>
        <div>
          <label htmlFor={`cap-${props.campaignId}`} className="field-label">Up to (USD)</label>
          <input
            id={`cap-${props.campaignId}`}
            name="cap"
            inputMode="decimal"
            defaultValue={props.cap}
            placeholder="5000"
            className="field-input w-32"
          />
        </div>
        <button type="submit" disabled={isPending} className="btn-primary">
          Save checked match
        </button>
      </form>
      {props.matcherName && (
        <form onSubmit={onSubmit}>
          <input type="hidden" name="campaignId" value={props.campaignId} />
          <input type="hidden" name="remove" value="1" />
          <button type="submit" disabled={isPending} className="text-sm font-medium text-red-700 underline">
            Remove match
          </button>
        </form>
      )}
      <FormFeedback state={state} />
    </div>
  );
}

export function HideForm({ campaignId, hidden }: { campaignId: string; hidden: boolean }) {
  const { state, isPending, onSubmit } = useFormAction(setHiddenAction);
  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <input type="hidden" name="campaignId" value={campaignId} />
      <input type="hidden" name="hidden" value={hidden ? "0" : "1"} />
      <button type="submit" disabled={isPending} className={hidden ? "btn-secondary" : "btn-danger"}>
        {hidden ? <Eye className="size-4" aria-hidden /> : <EyeOff className="size-4" aria-hidden />}
        {hidden ? "Put back on the site" : "Take off the site"}
      </button>
      <FormFeedback state={state} />
    </form>
  );
}
