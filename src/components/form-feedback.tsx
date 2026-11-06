import type { FormActionState } from "./use-form-action";

export function FormFeedback({ state }: { state: FormActionState }) {
  if (state.error) {
    return (
      <p role="alert" className="form-error">
        {state.error}
      </p>
    );
  }
  return state.success ? <p className="form-success">{state.success}</p> : null;
}
