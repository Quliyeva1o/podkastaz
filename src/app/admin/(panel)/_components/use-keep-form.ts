"use client";

import { startTransition, type FormEvent } from "react";

/**
 * `<form action={fn}>` resets every uncontrolled input after the action (React 19), so a
 * validation error would wipe what the admin typed (opening hours, slug, switches). The save
 * button (`data-save`) submits through this handler instead, which keeps the inputs; other
 * buttons with their own `formAction` (delete) still go the normal way.
 */
export function keepFormSubmit(action: (form: FormData) => void) {
  return (e: FormEvent<HTMLFormElement>) => {
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    if (!submitter || submitter.dataset.save === undefined) return;
    e.preventDefault();
    const form = new FormData(e.currentTarget, submitter);
    startTransition(() => action(form));
  };
}
