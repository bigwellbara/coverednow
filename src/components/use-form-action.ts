"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  type FormEvent,
} from "react";

export type FormActionState = { error?: string; success?: string };

/**
 * React clears a form after every `action`, including a failed one, which would
 * wipe everything typed because of one mistake. This keeps the values on an
 * error, and clears the form after a save only when asked to.
 */
export function useFormAction(
  action: (
    previous: FormActionState,
    formData: FormData,
  ) => Promise<FormActionState>,
  clearOnSuccess = false,
) {
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
